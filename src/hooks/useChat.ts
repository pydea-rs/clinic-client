import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";

// const API_BASE = import.meta.env.VITE_API_BASE ?? "/api"; // configurable base; use Vite proxy by default
import { Message, ChatState, ConnectionStatus, ApiError } from "../types/chat";
import { ApiService } from "../services/api";

const apiService = ApiService.get();

export const useChat = () => {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    conversationId: null,
    connectionStatus: { connected: false },
    isTyping: false,
    isSending: false,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const lastMessageTimeRef = useRef<Date>(new Date());

  const updateConnectionStatus = useCallback(
    (status: Partial<ConnectionStatus>) => {
      setChatState((prev) => ({
        ...prev,
        connectionStatus: { ...prev.connectionStatus, ...status },
      }));
    },
    []
  );

  const addMessage = useCallback((message: Omit<Message, "id"> | Message) => {
    const newMessage: Message = {
      ...message,
      id:
        ("id" in message ? message.id : undefined) ||
        Date.now().toString() + Math.random().toString(36).substring(2, 11),
    };

    // Clear typing timeout when message is added
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Update last message time
    lastMessageTimeRef.current = new Date();

    setChatState((prev) => ({
      ...prev,
      messages: [...prev.messages, newMessage],
      isTyping: false, // Always stop typing when adding a message
    }));
  }, []);

  const startConversation = useCallback(async () => {
    try {
      const conversationId = await apiService.startConversation();
      setChatState((prev) => ({ ...prev, conversationId }));

      if (!conversationId) {
        throw new Error("No conversationId returned by server");
      }
      setChatState((prev) => ({ ...prev, conversationId }));
      return conversationId;
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast.error(
        "Failed to start conversation. Please check your connection."
      );
      updateConnectionStatus({ error: "Failed to start conversation" });
    }
  }, [updateConnectionStatus]);

  const stopPolling = useCallback(() => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
      console.log("[Polling] Stopped polling");
    }
  }, []);

  const pollForMessages = useCallback(async () => {
    if (!chatState.conversationId) return;

    try {
      console.log("[Polling] Checking for new messages...");
      const response = await apiService
        .getAxiosInstance()
        .get(`/ai-agents/poll/${chatState.conversationId}`);

      const newMessages = response.data?.contents || [];
      console.log("[Polling] Found messages:", newMessages);

      // Filter out messages that are already in our chat state by ID
      const existingMessageIds = new Set(chatState.messages.map((m) => m.id));

      newMessages.forEach((msg: any) => {
        if (msg.payload?.text && !existingMessageIds.has(msg.id)) {
          console.log(
            "[Polling] Adding new polled message:",
            msg.payload.text,
            "ID:",
            msg.id
          );
          addMessage({
            id: msg.id, // Use the actual Botpress message ID
            text: msg.payload.text,
            isUser: false,
            timestamp: new Date(msg.createdAt),
          });
          // Stop polling once we get a response
          stopPolling();
        }
      });
    } catch (error) {
      console.error("[Polling] Error:", error);
    }
  }, [chatState.conversationId, chatState.messages, addMessage, stopPolling]);

  const startPolling = useCallback(() => {
    if (pollingTimeoutRef.current) return; // Already polling

    const poll = () => {
      pollForMessages();
      pollingTimeoutRef.current = setTimeout(poll, 3000); // Poll every 3 seconds
    };

    poll();
    console.log("[Polling] Started polling for messages");
  }, [pollForMessages]);

  const connectSSE = useCallback(
    (conversationId: string) => {
      if (eventSourceRef.current) return;

      // Use cookie-based auth; EventSource should send cookies automatically (set by server on login)
      const eventSource = new EventSource(
        apiService.getStreamUrl(conversationId),
        { withCredentials: true }
      );

      eventSource.onopen = () => {
        console.log("[SSE] Connection opened");
        updateConnectionStatus({
          connected: true,
          error: undefined,
          reconnecting: false,
        });
        reconnectAttempts.current = 0;
      };

      eventSource.onmessage = (e: MessageEvent) => {
        console.log("[SSE] Raw event received:", {
          type: e.type,
          data: e.data,
          lastEventId: e.lastEventId,
          origin: e.origin,
        });

        try {
          // Skip heartbeat messages
          if (e.data.startsWith(": keepalive")) {
            console.log("[SSE] Heartbeat received");
            return;
          }

          const parsed = JSON.parse(e.data);
          console.log("[SSE] Parsed message:", {
            type: parsed.type,
            data: parsed.data,
            fullParsed: parsed,
          });

          // Handle connection confirmation
          if (parsed.type === "connected") {
            console.log(
              "[SSE] Connection confirmed for conversation:",
              parsed.data?.conversationId
            );
            return;
          }

          // Handle message_created events
          if (parsed.type === "message_created") {
            const messageData = parsed.data;
            console.log("[SSE] Processing message_created:", messageData);

            if (messageData?.payload?.text) {
              console.log(
                "[SSE] Adding AI message:",
                messageData.payload.text,
                "ID:",
                messageData.id
              );
              toast.success("New message received", {
                duration: 2000,
              });
              addMessage({
                id: messageData.id, // Use the actual Botpress message ID
                text: messageData.payload.text,
                isUser: false,
                timestamp: new Date(messageData.createdAt || new Date()),
              });
              // Stop polling since we got the message via SSE
              stopPolling();
            } else {
              console.warn(
                "[SSE] Message created but no text found:",
                messageData
              );
              // Still stop typing even if no text
              setChatState((prev) => ({ ...prev, isTyping: false }));
            }
          }

          // Handle error events
          if (parsed.type === "error") {
            console.error("[SSE] Error received:", parsed.data);
            setChatState((prev) => ({ ...prev, isTyping: false }));
            toast.error("AI service error: " + parsed.data?.message);
          }

          // Handle any other events
          if (
            !["connected", "message_created", "error"].includes(parsed.type)
          ) {
            console.log("[SSE] Unknown event type:", parsed.type, parsed);
          }
        } catch (error) {
          console.error(
            "[SSE] Error parsing message:",
            error,
            "Raw data:",
            e.data
          );
          // If we can't parse the message, stop typing to prevent getting stuck
          setChatState((prev) => ({ ...prev, isTyping: false }));
        }
      };

      // Use generic onerror handler for reconnection flow

      eventSource.onerror = (error) => {
        console.error("[SSE] Connection error:", error);
        console.log("[SSE] EventSource readyState:", eventSource.readyState);

        updateConnectionStatus({
          connected: false,
          reconnecting: true,
        });
        eventSource.close();
        eventSourceRef.current = null;

        // Stop typing on connection error
        setChatState((prev) => ({ ...prev, isTyping: false }));

        // Exponential backoff for reconnection
        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttempts.current),
          30000
        );
        reconnectAttempts.current += 1;

        console.log(
          `[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`
        );

        reconnectTimeoutRef.current = setTimeout(() => {
          if (reconnectAttempts.current < 5) {
            connectSSE(conversationId);
          } else {
            toast.error("Connection failed after multiple attempts");
            updateConnectionStatus({
              connected: false,
              reconnecting: false,
              error: "Connection failed after multiple attempts",
            });
          }
        }, delay);
      };

      eventSourceRef.current = eventSource;
    },
    [addMessage, updateConnectionStatus, stopPolling]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!chatState.conversationId || chatState.isSending) return;

      setChatState((prev) => ({ ...prev, isSending: true }));

      // Add user message immediately
      addMessage({
        text,
        isUser: true,
        timestamp: new Date(),
      });

      try {
        console.log("[Chat] Sending message:", {
          conversationId: chatState.conversationId,
          text,
        });

        await apiService.sendMessage({
          conversationId: chatState.conversationId,
          text,
        });

        console.log(
          "[Chat] Message sent successfully, showing typing indicator"
        );

        // Show typing indicator with timeout fallback
        setChatState((prev) => ({ ...prev, isTyping: true }));

        // Clear any existing typing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Set a fallback timeout to stop typing if no response comes
        typingTimeoutRef.current = setTimeout(() => {
          setChatState((prev) => ({ ...prev, isTyping: false }));
          console.warn(
            "[Chat] Typing timeout reached - stopping typing indicator"
          );
          toast.error("No response received from AI");
          stopPolling();
        }, 30000); // 30 seconds timeout

        // Start polling for messages as a workaround for SSE issues
        startPolling();

        toast.success("Message sent successfully", { duration: 2000 });
      } catch (error) {
        const apiError = error as ApiError;
        console.error("Error sending message:", apiError);
        toast.error(
          apiError.message || "Failed to send message. Please try again."
        );
        addMessage({
          text: apiError.message || "Failed to send message. Please try again.",
          isUser: false,
          timestamp: new Date(),
        });
      } finally {
        setChatState((prev) => ({ ...prev, isSending: false }));
      }
    },
    [
      chatState.conversationId,
      chatState.isSending,
      addMessage,
      startPolling,
      stopPolling,
    ]
  );

  const initializeChat = useCallback(async () => {
    const conversationId = await startConversation();
    if (conversationId) {
      connectSSE(conversationId);
    }
  }, [startConversation, connectSSE]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    stopPolling();
    updateConnectionStatus({ connected: false, reconnecting: false });
  }, [updateConnectionStatus, stopPolling]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...chatState,
    initializeChat,
    sendMessage,
    disconnect,
    startPolling,
    stopPolling,
  };
};
