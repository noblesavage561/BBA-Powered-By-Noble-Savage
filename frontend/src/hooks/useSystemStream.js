import { useCallback, useEffect, useRef, useState } from "react";

function getSystemWsUrl() {
  if (typeof window === "undefined") {
    return "ws://127.0.0.1/ws/system";
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/system`;
}

export function useSystemStream({ onHealthUpdate, onLog } = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  const connect = useCallback(() => {
    const ws = new WebSocket(getSystemWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "health_update" && onHealthUpdate) {
          onHealthUpdate(data.payload);
        }
        if (data.type === "log" && onLog) {
          onLog(data.payload);
        }
      } catch {
        // Ignore malformed messages.
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      reconnectRef.current = setTimeout(connect, 5000);
    };

    ws.onerror = () => {
      setIsConnected(false);
      ws.close();
    };
  }, [onHealthUpdate, onLog]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { isConnected };
}
