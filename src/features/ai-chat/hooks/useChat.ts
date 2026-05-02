import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { Message, ChatState, ConnectionStatus } from "../../../lib/types/chat";
import { aiChatService, AiAgentMessage } from "../../../lib/ai/ai-chat.service";

// ─── Typewriter speed (ms between characters) ────────────────────────────────
const TYPEWRITER_SPEED_MS = 14;
// ─── Polling: start N ms after send if no SSE reply ──────────────────────────
const POLLING_TRIGGER_DELAY_MS = 8000;
const POLLING_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 6;

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
  const lastUserMessageRef = useRef<string | null>(null);
  const lastUserMessageAtRef = useRef<number>(0);
  const isInitializingRef = useRef(false);

  // ─── Delivery mode: 'sse' (default) or 'poll' ────────────────────────────────
  // 'sse'  – long-lived SSE connection via listenConversation()
  // 'poll' – client polls GET /ai-agents/messages/:id after every send
  // Persisted to localStorage so the choice survives page reloads.
  const [deliveryMode, setDeliveryMode] = useState<'sse' | 'poll'>(
    () => (localStorage.getItem('bp_delivery_mode') as 'sse' | 'poll') ?? 'sse'
  );
  // Ref mirrors state so callbacks always read the current value without stale closure
  const deliveryModeRef = useRef(deliveryMode);

  // Polling fallback
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollTriggerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollAttemptRef = useRef(0);
  const pollSinceRef = useRef<Date | null>(null);
  const isWaitingForBotRef = useRef(false);
  // forcePollModeRef: set when server sends mode=poll via SSE
  // (separate from user-chosen deliveryModeRef so both paths set poll mode)
  const forcePollModeRef = useRef(deliveryMode === 'poll');

  // Typewriter animation
  const typewriterIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const seenBotMessageIds = useRef<Set<string>>(new Set());

  // ─── Stop polling ─────────────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    isWaitingForBotRef.current = false;
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pollTriggerTimeoutRef.current) {
      clearTimeout(pollTriggerTimeoutRef.current);
      pollTriggerTimeoutRef.current = null;
    }
    pollAttemptRef.current = 0;
  }, []);

  // ─── Stop typewriter ──────────────────────────────────────────────────────────
  const stopTypewriter = useCallback(() => {
    if (typewriterIntervalRef.current) {
      clearInterval(typewriterIntervalRef.current);
      typewriterIntervalRef.current = null;
    }
  }, []);

  const updateConnectionStatus = useCallback(
    (status: Partial<ConnectionStatus>) => {
      setChatState((prev) => ({
        ...prev,
        connectionStatus: { ...prev.connectionStatus, ...status },
      }));
    },
    []
  );

  // ─── Toggle delivery mode (UI switch) ────────────────────────────────────────
  const toggleDeliveryMode = useCallback(() => {
    setDeliveryMode((prev) => {
      const next = prev === 'sse' ? 'poll' : 'sse';
      deliveryModeRef.current = next;
      forcePollModeRef.current = next === 'poll';
      localStorage.setItem('bp_delivery_mode', next);
      return next;
    });
  }, []);

  // ─── Typewriter: reveal bot text character-by-character ───────────────────────
  const startTypewriter = useCallback(
    (id: string, fullText: string, timestamp: Date) => {
      stopTypewriter();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      // Insert the message immediately with empty text + isStreaming flag
      setChatState((prev) => ({
        ...prev,
        isTyping: false,
        messages: [
          ...prev.messages,
          { id, text: "", isUser: false, timestamp, isStreaming: true },
        ],
      }));

      let charIndex = 0;

      typewriterIntervalRef.current = setInterval(() => {
        charIndex++;
        const chunk = fullText.slice(0, charIndex);
        const done = charIndex >= fullText.length;

        setChatState((prev) => {
          const msgIdx = prev.messages.findIndex((m) => m.id === id);
          if (msgIdx === -1) return prev;
          const updated = [...prev.messages];
          updated[msgIdx] = {
            ...updated[msgIdx],
            text: chunk,
            isStreaming: !done,
          };
          return { ...prev, messages: updated };
        });

        if (done) stopTypewriter();
      }, TYPEWRITER_SPEED_MS);
    },
    [stopTypewriter]
  );

  // ─── Add a bot message (deduplicates, stops poll, starts typewriter) ──────────
  const addBotMessage = useCallback(
    (msg: { id?: string; text: string; timestamp?: Date }) => {
      const id =
        msg.id ??
        Date.now().toString() + Math.random().toString(36).substring(2, 11);

      if (seenBotMessageIds.current.has(id)) return;
      seenBotMessageIds.current.add(id);

      stopPolling();
      startTypewriter(id, msg.text, msg.timestamp ?? new Date());
    },
    [stopPolling, startTypewriter]
  );

  // ─── Add a user message (no animation) ───────────────────────────────────────
  const addMessage = useCallback((message: Omit<Message, "id"> | Message) => {
    const newMessage: Message = {
      ...message,
      id:
        ("id" in message ? message.id : undefined) ??
        Date.now().toString() + Math.random().toString(36).substring(2, 11),
    };
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    setChatState((prev) => ({
      ...prev,
      messages: [...prev.messages, newMessage],
      isTyping: false,
    }));
  }, []);

  const extractMessageText = useCallback(
    (payload: Record<string, unknown> | null | undefined): string | null => {
      if (!payload) return null;
      if (typeof payload.text === "string") return payload.text;
      if (typeof payload.markdown === "string") return payload.markdown;
      if (typeof payload.title === "string") return payload.title;
      if (typeof payload.audioUrl === "string") return payload.audioUrl;
      if (typeof payload.fileUrl === "string") return payload.fileUrl;
      return null;
    },
    []
  );

  // ─── Extract text from a raw Botpress message object (has .payload.text) ─────
  const extractBotMessageText = useCallback(
    (msgData: AiAgentMessage): string | null => {
      if (msgData.payload) {
        const t = extractMessageText(msgData.payload as Record<string, unknown>);
        if (t) return t;
      }
      return extractMessageText(msgData as unknown as Record<string, unknown>);
    },
    [extractMessageText]
  );

  // ─── Polling fallback ─────────────────────────────────────────────────────────
  const startPolling = useCallback(
    (conversationId: string) => {
      if (pollIntervalRef.current) return;
      pollSinceRef.current = new Date(Date.now() - 10000); // look back 10s to catch any missed reply
      pollAttemptRef.current = 0;

      const poll = async () => {
        pollAttemptRef.current++;
        try {
          const messages = await aiChatService.getMessages(
            conversationId,
            pollSinceRef.current ?? undefined
          );
          if (messages.length > 0) {
            const first = messages[0];
            const text = extractBotMessageText(first);
            if (text) {
              addBotMessage({
                id: first.id,
                text,
                timestamp: first.createdAt ? new Date(first.createdAt) : new Date(),
              });
              return; // addBotMessage calls stopPolling
            }
          }
        } catch {
          // ignore individual poll errors
        }

        if (pollAttemptRef.current >= MAX_POLL_ATTEMPTS) {
          stopPolling();
          setChatState((prev) => ({ ...prev, isTyping: false }));
          toast.error("No response received from AI");
        }
      };

      pollIntervalRef.current = setInterval(() => {
        void poll();
      }, POLLING_INTERVAL_MS);
    },
    [addBotMessage, extractBotMessageText, stopPolling]
  );

  const startConversation = useCallback(async () => {
    try {
      const conversationId = await aiChatService.startConversation();
      if (!conversationId) throw new Error("No conversationId returned by server");
      setChatState((prev) => ({ ...prev, conversationId }));
      return conversationId;
    } catch {
      toast.error("Failed to start conversation. Please check your connection.");
      updateConnectionStatus({ error: "Failed to start conversation" });
    }
  }, [updateConnectionStatus]);

  const connectSSE = useCallback(
    (conversationId: string) => {
      // ── Poll mode: no EventSource needed, mark as connected and return ──────
      if (deliveryModeRef.current === 'poll') {
        updateConnectionStatus({ connected: true, error: undefined, reconnecting: false });
        return;
      }

      if (eventSourceRef.current) return;

      const eventSource = new EventSource(
        aiChatService.getStreamUrl(conversationId),
        { withCredentials: true } as EventSourceInit
      );

      eventSource.onopen = () => {
        updateConnectionStatus({ connected: true, error: undefined, reconnecting: false });
        reconnectAttempts.current = 0;
      };

      // Connection confirmation
      eventSource.addEventListener("connected", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data as string) as Record<string, unknown>;
          if (data?.conversationId && typeof data.conversationId === "string") {
            setChatState((prev) => ({
              ...prev,
              conversationId: data.conversationId as string,
            }));
          }
          updateConnectionStatus({ connected: true, error: undefined, reconnecting: false });
        } catch {
          // ignore
        }
      });

      // Server-side delivery mode switch:
      // If BOTPRESS_DELIVERY_MODE=poll is set, the server sends this event and
      // closes the SSE connection immediately. We switch to pure polling.
      eventSource.addEventListener("mode", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data as string) as Record<string, unknown>;
          if (data?.mode === "poll") {
            forcePollModeRef.current = true;
            deliveryModeRef.current = 'poll';
            setDeliveryMode('poll');
            localStorage.setItem('bp_delivery_mode', 'poll');
            eventSource.close();
            eventSourceRef.current = null;
            updateConnectionStatus({ connected: true, error: undefined, reconnecting: false });
          }
        } catch {
          // ignore
        }
      });

      // Bot reply via SSE
      eventSource.addEventListener("message_created", (e: MessageEvent) => {
        try {
          const messageData = JSON.parse(e.data as string) as Record<string, unknown>;
          const text =
            extractMessageText(messageData?.payload as Record<string, unknown>) ??
            extractMessageText(messageData);
          if (!text) return;

          const now = Date.now();
          const isUserEcho =
            messageData?.isUser === true ||
            messageData?.authorType === "user" ||
            messageData?.direction === "incoming" ||
            (lastUserMessageRef.current &&
              text === lastUserMessageRef.current &&
              now - lastUserMessageAtRef.current < 5000);
          if (isUserEcho || messageData?.isBot === false) return;

          addBotMessage({
            id: messageData.id as string | undefined,
            text,
            timestamp: messageData.createdAt
              ? new Date(messageData.createdAt as string)
              : new Date(),
          });
        } catch {
          // ignore
        }
      });

      // Incremental update to existing bot message
      eventSource.addEventListener("message_updated", (e: MessageEvent) => {
        try {
          const messageData = JSON.parse(e.data as string) as Record<string, unknown>;
          const text =
            extractMessageText(messageData?.payload as Record<string, unknown>) ??
            extractMessageText(messageData);
          if (!text) return;

          setChatState((prev) => {
            const index = prev.messages.findIndex((m) => m.id === messageData.id);
            if (index === -1) return prev;
            const updated = [...prev.messages];
            updated[index] = {
              ...updated[index],
              text,
              isStreaming: false,
              timestamp: new Date(
                (messageData.updatedAt as string) ||
                  (messageData.createdAt as string) ||
                  new Date()
              ),
            };
            return { ...prev, isTyping: false, messages: updated };
          });
        } catch {
          setChatState((prev) => ({ ...prev, isTyping: false }));
        }
      });

      // Application-level error from Botpress
      eventSource.addEventListener("error", (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data as string) as Record<string, unknown>;
          setChatState((prev) => ({ ...prev, isTyping: false }));
          toast.error("AI service error: " + ((parsed?.message as string) ?? "Unknown"));
        } catch {
          setChatState((prev) => ({ ...prev, isTyping: false }));
        }
      });

      // Unnamed fallback events
      eventSource.onmessage = (_e: MessageEvent) => {};

      // Transport-level error → reconnect
      eventSource.onerror = (_error) => {
        updateConnectionStatus({ connected: false, reconnecting: true });
        eventSource.close();
        eventSourceRef.current = null;
        setChatState((prev) => ({ ...prev, isTyping: false }));

        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
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
    [addBotMessage, updateConnectionStatus, extractMessageText]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!chatState.conversationId || chatState.isSending) return;

      setChatState((prev) => ({ ...prev, isSending: true }));
      addMessage({ text, isUser: true, timestamp: new Date() });

      lastUserMessageRef.current = text;
      lastUserMessageAtRef.current = Date.now();

      try {
        await aiChatService.sendMessage(chatState.conversationId, text);

        setChatState((prev) => ({ ...prev, isTyping: true }));
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        // Polling fallback: if SSE doesn't deliver a reply, start polling after N ms.
        // In poll mode (forcePollModeRef) skip the delay and poll immediately.
        const convId = chatState.conversationId;
        isWaitingForBotRef.current = true;
        if (pollTriggerTimeoutRef.current) clearTimeout(pollTriggerTimeoutRef.current);
        if (forcePollModeRef.current) {
          startPolling(convId);
        } else {
          pollTriggerTimeoutRef.current = setTimeout(() => {
            // Check ref directly — no side effects inside a state updater
            if (isWaitingForBotRef.current) {
              startPolling(convId);
            }
          }, POLLING_TRIGGER_DELAY_MS);
        }

        // Hard timeout: give up after 60s regardless
        typingTimeoutRef.current = setTimeout(() => {
          stopPolling();
          setChatState((prev) => ({ ...prev, isTyping: false }));
          toast.error("No response received from AI");
        }, 60000);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : typeof error === "object" &&
              error !== null &&
              "message" in error &&
              typeof (error as Record<string, unknown>).message === "string"
            ? (error as { message: string }).message
            : "Failed to send message. Please try again.";
        toast.error(message);
        addMessage({ text: message, isUser: false, timestamp: new Date() });
      } finally {
        setChatState((prev) => ({ ...prev, isSending: false }));
      }
    },
    [chatState.conversationId, chatState.isSending, addMessage, startPolling, stopPolling]
  );

  const initializeChat = useCallback(async () => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;
    try {
      const conversationId = await startConversation();
      if (conversationId) connectSSE(conversationId);
    } finally {
      isInitializingRef.current = false;
    }
  }, [startConversation, connectSSE]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    stopPolling();
    stopTypewriter();
    updateConnectionStatus({ connected: false, reconnecting: false });
  }, [updateConnectionStatus, stopPolling, stopTypewriter]);

  useEffect(() => {
    return () => { disconnect(); };
  }, [disconnect]);

  return { ...chatState, deliveryMode, toggleDeliveryMode, initializeChat, sendMessage, disconnect };
};
