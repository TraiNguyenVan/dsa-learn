import { useEffect, useRef, useState, useCallback } from 'react';

interface UseTerminalOptions {
  active: boolean;
  onData?: (data: string) => void;
  onExit?: (code: number) => void;
}

export function useTerminal({ active, onData, onExit }: UseTerminalOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/terminal?cols=80&rows=24`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'stdout' && msg.data && onData) {
          onData(msg.data);
        } else if (msg.type === 'exit') {
          if (onExit) onExit(msg.exit_code);
        }
      } catch (err) {
        console.error('Failed to parse terminal message:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
    };
  }, [onData, onExit]);

  // Connect when terminal becomes active
  useEffect(() => {
    if (active) {
      connect();
    }
  }, [active, connect]);

  const sendInput = useCallback((data: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stdin', data }));
    }
  }, []);

  const sendResize = useCallback((cols: number, rows: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
    }
  }, []);

  const killSession = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'kill' }));
    }
  }, []);

  return {
    isConnected,
    connect,
    sendInput,
    sendResize,
    killSession,
  };
}
