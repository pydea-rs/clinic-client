import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { Message, ChatState, ConnectionStatus } from "../types/chat";
import { EventSourcePolyfill } from "event-source-polyfill";

const API_BASE = "http://localhost:8080"; // Adjust to your NestJS server URL

export const useChat = (token: string | null) => {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    conversationId: null,
    connectionStatus: { connected: false },
    isTyping: false,
    isSending: false,
  });

  const eventSourceRef = useRef<EventSourcePolyfill | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  const updateConnectionStatus = useCallback(
    (status: Partial<ConnectionStatus>) => {
      setChatState((prev) => ({
        ...prev,
        connectionStatus: { ...prev.connectionStatus, ...status },
      }));
    },
    []
  );

  const addMessage = useCallback((message: Omit<Message, "id">) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };

    setChatState((prev) => ({
      ...prev,
      messages: [...prev.messages, newMessage],
      isTyping: false,
    }));
  }, []);

  const startConversation = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/ai-agents/start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) throw new Error("Failed to start conversation");

      const res = await response.json();
      if (res.status !== 200) {
        throw new Error("Failed starting a conversation!");
      }
      let { id: conversationId } = res?.data ?? {};
      conversationId = 'conv_01K3WCMABTRFZN7Z3PD712A2QY'
      console.warn(conversationId);
      setChatState((prev) => ({ ...prev, conversationId }));
      return conversationId;
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast.error(
        "Failed to start conversation. Please check your connection."
      );
      updateConnectionStatus({ error: "Failed to start conversation" });
    }
  }, [token, updateConnectionStatus]);

  const connectSSE = useCallback(
    (conversationId: string) => {
      if (!token || eventSourceRef.current) return;

      const eventSource = new EventSourcePolyfill(
        `${API_BASE}/ai-agents/stream/${conversationId}`,
        // {
        //   withCredentials: true,
        // }
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "text/event-stream",
          },
        }
      );

      // Add authorization header (note: EventSourcePolyfill doesn't support custom headers directly)
      // You might need to pass the token as a query parameter or handle auth differently

      eventSource.onopen = () => {
        updateConnectionStatus({
          connected: true,
          error: undefined,
          reconnecting: false,
        });
        reconnectAttempts.current = 0;
      };

      eventSource.addEventListener("message_created", (event) => {
        try {
          const data = JSON.parse(event.data);
          toast.success("New message received", { duration: 2000 });
          addMessage({
            text: data.payload?.text || "AI message received",
            isUser: false,
            timestamp: new Date(),
          });
        } catch (error) {
          console.error("Error parsing message:", error);
        }
      });

      eventSource.addEventListener("typing", () => {
        setChatState((prev) => ({ ...prev, isTyping: true }));
      });

      eventSource.addEventListener("error", (event) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = JSON.parse((event as any).data);
          toast.error(`Connection error: ${data.message}`);
          updateConnectionStatus({ error: data.message });
        } catch {
          toast.error("Connection error occurred");
          updateConnectionStatus({ error: "Connection error occurred" });
        }
      });

      eventSource.onerror = () => {
        updateConnectionStatus({ connected: false, reconnecting: true });
        eventSource.close();
        eventSourceRef.current = null;

        // Exponential backoff for reconnection
        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttempts.current),
          30000
        );
        reconnectAttempts.current += 1;

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
    [token, addMessage, updateConnectionStatus]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!token || !chatState.conversationId || chatState.isSending) return;

      setChatState((prev) => ({ ...prev, isSending: true }));

      // Add user message immediately
      addMessage({
        text,
        isUser: true,
        timestamp: new Date(),
      });

      try {
        const response = await fetch(`${API_BASE}/ai-agents/message`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId: chatState.conversationId,
            text,
          }),
        });

        if (!response.ok) throw new Error("Failed to send message");

        // Show typing indicator
        setChatState((prev) => ({ ...prev, isTyping: true }));
        toast.success("Message sent successfully", { duration: 2000 });
      } catch (error) {
        console.error("Error sending message:", error);
        toast.error("Failed to send message. Please try again.");
        addMessage({
          text: "Failed to send message. Please try again.",
          isUser: false,
          timestamp: new Date(),
        });
      } finally {
        setChatState((prev) => ({ ...prev, isSending: false }));
      }
    },
    [token, chatState.conversationId, chatState.isSending, addMessage]
  );

  const initializeChat = useCallback(async () => {
    if (!token) return;

    const conversationId = await startConversation();
    if (conversationId) {
      connectSSE(conversationId);
    }
  }, [token, startConversation, connectSSE]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
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
