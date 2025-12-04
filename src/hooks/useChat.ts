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

  const extractMessageText = useCallback((payload: any): string | null => {
    if (!payload) return null;
    if (typeof payload.text === "string") return payload.text;
    if (typeof payload.markdown === "string") return payload.markdown;
    if (typeof payload.title === "string") return payload.title;
    if (typeof payload.audioUrl === "string") return payload.audioUrl;
    if (typeof payload.fileUrl === "string") return payload.fileUrl;
    return null;
  }, []);

  const connectSSE = useCallback(
    (conversationId: string) => {
      if (eventSourceRef.current) return;

      // Use cookie-based auth; EventSource should send cookies automatically (set by server on login)
      const eventSource = new EventSource(apiService.getStreamUrl(conversationId), {
        withCredentials: true,
      } as EventSourceInit);

      eventSource.onopen = () => {
        console.log("[SSE] Connection opened");
        updateConnectionStatus({
          connected: true,
          error: undefined,
          reconnecting: false,
        });
        reconnectAttempts.current = 0;
      };

      /**
       * NOTE:
       * The server sends **named** SSE events using the `event:` field:
       *   - `event: connected`
       *   - `event: message_created`
       *   - `event: error`
       * with the JSON payload on the `data:` line.
       *
       * Named events are NOT delivered to `onmessage`; we must use
       * `addEventListener('<event-name>', handler)` for each one.
       */

      // Connection confirmation event
      eventSource.addEventListener("connected", (e: MessageEvent) => {
        console.log("[SSE] 'connected' event received:", e.data);
        try {
          const parsed = JSON.parse(e.data as string);
          console.log(
            "[SSE] Connection confirmed for conversation:",
            parsed?.conversationId
          );
        } catch (error) {
          console.error("[SSE] Failed to parse 'connected' event:", error);
        }
      });

      // New message from Botpress
      eventSource.addEventListener("message_created", (e: MessageEvent) => {
        console.log("[SSE] 'message_created' event received:", e.data);
        try {
          const messageData = JSON.parse(e.data as string);
          console.log("[SSE] Processing message_created:", messageData);

          if (messageData?.isBot === false) {
            console.log("[SSE] Skipping user-originated message", messageData.id);
            return;
          }

          const text = extractMessageText(messageData?.payload);

          if (text) {
            console.log(
              "[SSE] Adding AI message:",
              text,
              "ID:",
              messageData.id
            );
            toast.success("New message received", {
              duration: 2000,
            });
            addMessage({
              id: messageData.id, // Use the actual Botpress message ID
              text,
              isUser: false,
              timestamp: new Date(messageData.createdAt || new Date()),
            });
          } else {
            console.warn(
              "[SSE] message_created event but no text found:",
              messageData
            );
            setChatState((prev) => ({ ...prev, isTyping: false }));
          }
        } catch (error) {
          console.error(
            "[SSE] Error parsing 'message_created' event:",
            error,
            "Raw data:",
            e.data
          );
          setChatState((prev) => ({ ...prev, isTyping: false }));
        }
      });

      // AI / Botpress level error event
      eventSource.addEventListener("error", (e: MessageEvent) => {
        console.error("[SSE] 'error' event received:", e.data);
        try {
          const parsed = JSON.parse(e.data as string);
          setChatState((prev) => ({ ...prev, isTyping: false }));
          toast.error("AI service error: " + (parsed?.message ?? "Unknown"));
        } catch (error) {
          console.error(
            "[SSE] Failed to parse 'error' event:",
            error,
            "Raw data:",
            e.data
          );
          setChatState((prev) => ({ ...prev, isTyping: false }));
        }
      });

      // Fallback handler for any unnamed/default events (not expected with current server)
      eventSource.onmessage = (e: MessageEvent) => {
        console.log("[SSE] Default message event received:", e.data);
      };

      // Network / transport-level error handler for reconnection flow
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
    [addMessage, updateConnectionStatus, extractMessageText]
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
        }, 30000); // 30 seconds timeout

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
    [chatState.conversationId, chatState.isSending, addMessage]
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
    updateConnectionStatus({ connected: false, reconnecting: false });
  }, [updateConnectionStatus]);

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
  };
};
