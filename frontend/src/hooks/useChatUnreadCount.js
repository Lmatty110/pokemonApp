import { useCallback, useEffect, useState } from "react";
import api from "../api";
import { API_BASE_URL } from "../config";

export default function useChatUnreadCount(token) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!token) {
      setUnreadCount(0);
      return;
    }
    try {
      const { data } = await api.get("/chat/unread-count");
      setUnreadCount(Math.max(0, Number(data.unread_count) || 0));
    } catch {
      // Keep the latest known value during a temporary connection problem.
    }
  }, [token]);

  useEffect(() => {
    refreshUnreadCount();
    const interval = window.setInterval(refreshUnreadCount, 30000);
    return () => window.clearInterval(interval);
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!token) return undefined;
    let socket;
    let reconnectTimer;
    let heartbeat;
    let cancelled = false;

    const connect = async () => {
      try {
        const { data } = await api.post("/chat/socket-ticket");
        if (cancelled) return;
        const socketBase = API_BASE_URL.replace(/^http/, "ws");
        socket = new WebSocket(`${socketBase}/chat/ws?ticket=${encodeURIComponent(data.ticket)}`);
        socket.onopen = () => {
          heartbeat = window.setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) socket.send("ping");
          }, 25000);
        };
        socket.onmessage = (event) => {
          if (event.data === "pong") return;
          try {
            const payload = JSON.parse(event.data);
            if (
              payload.type === "message.created" ||
              payload.type === "conversation.created" ||
              payload.type === "conversation.updated"
            ) {
              refreshUnreadCount();
            }
          } catch {
            // Ignore messages that are not application events.
          }
        };
        socket.onclose = () => {
          window.clearInterval(heartbeat);
          if (!cancelled) reconnectTimer = window.setTimeout(connect, 2500);
        };
      } catch {
        if (!cancelled) reconnectTimer = window.setTimeout(connect, 5000);
      }
    };

    connect();
    return () => {
      cancelled = true;
      window.clearTimeout(reconnectTimer);
      window.clearInterval(heartbeat);
      socket?.close();
    };
  }, [token, refreshUnreadCount]);

  return unreadCount;
}
