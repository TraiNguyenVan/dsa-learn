import { useEffect, useRef, useState, useCallback } from 'react';

export type DebugOutputStream = 'console' | 'stderr' | 'target';

interface UseTerminalOptions {
  active: boolean;
  onData?: (data: string) => void;
  onExit?: (code: number) => void;
  /** Renders debugger/debuggee output into the terminal buffer (FR-016). */
  onDebug?: (stream: DebugOutputStream, text: string) => void;
}

export function useTerminal({ active, onData, onExit, onDebug }: UseTerminalOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  // Queued debug output, held until the terminal exists to receive it. Debug
  // output arrives on the debug socket and can precede the terminal mount.
  const pendingDebugRef = useRef<{ stream: string; text: string }[]>([]);
  const onDebugRef = useRef(onDebug);
  useEffect(() => {
    onDebugRef.current = onDebug;
  }, [onDebug]);

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

  /**
   * Write debugger or debuggee output into the terminal.
   *
   * This writes straight to the render callback. It deliberately does NOT go
   * through `sendInput`: the terminal's socket is bound to a live interactive
   * shell, so injected text would be interpreted as shell commands. Debug output
   * containing `quit`, or any C++ line with a semicolon, could terminate the
   * learner's shell (research.md Decision 8).
   *
   * Output that arrives before the terminal is mounted is queued rather than
   * dropped.
   */
  const writeDebugOutput = useCallback((stream: DebugOutputStream, text: string) => {
    if (!onDebugRef.current) {
      pendingDebugRef.current.push({ stream, text });
      return;
    }
    onDebugRef.current(stream, text);
  }, []);

  // Flush anything queued before the terminal became available.
  useEffect(() => {
    if (!onDebug) return;
    const queued = pendingDebugRef.current;
    pendingDebugRef.current = [];
    queued.forEach(({ stream, text }) => onDebug(stream as DebugOutputStream, text));
  }, [onDebug]);

  return {
    isConnected,
    connect,
    sendInput,
    sendResize,
    killSession,
    writeDebugOutput,
  };
}
