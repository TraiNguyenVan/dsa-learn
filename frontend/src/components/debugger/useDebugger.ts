/**
 * Debug client speaking the project's own JSON command/event envelope
 * (contracts/debug-protocol.md).
 *
 * Replaces the hand-written DAP client. The transport is unchanged - it is the
 * same raw WebSocket the LSP and terminal bridges use - but there is no
 * four-round `initialize`/`launch`/`setBreakpoints` handshake and no
 * sequence-number bookkeeping. One `start` creates a session; each command gets
 * exactly one correlated response; everything else arrives as an event.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  DebugBreakpointSpec,
  DebugServerMessage,
  DebugSessionState,
  DebugStackFrame,
  DebugVariable,
} from '@/lib/types';

export interface UseDebuggerOptions {
  exerciseId: string | null;
  active: boolean;
  onActiveLineChange?: (line: number | null) => void;
  onOutput?: (stream: 'console' | 'stderr' | 'target', text: string) => void;
}

export interface DebuggerApi {
  debugState: DebugSessionState;
  statusMessage: string;
  remediation: string | null;
  callStack: DebugStackFrame[];
  variables: DebugVariable[];
  activeLine: number | null;
  appliedBreakpoints: number;
  requestedBreakpoints: number;
  startDebug: (breakpoints: DebugBreakpointSpec[]) => Promise<void>;
  continueDebug: () => void;
  stepOver: () => void;
  stepInto: () => void;
  stepOut: () => void;
  pauseDebug: () => void;
  stopDebug: () => Promise<void>;
  selectFrame: (frameId: string) => void;
  expandVariable: (handle: string) => void;
  refresh: () => void;
}

const IDLE_MESSAGE = 'Ready to debug.';

/**
 * Which shortcut applies for a given key and session state (FR-022).
 *
 * Extracted as a pure predicate so the keyboard rules can be tested without
 * mounting the whole dashboard. Returns the command to send, or null when the
 * key is not ours or the shortcut is inert in the current state.
 *
 * Stepping is inert unless the session is stopped (US5 scenario 2), and stop is
 * available in every non-idle state (US5 scenario 3).
 */
export function debugShortcutAction(
  key: string,
  shiftKey: boolean,
  state: DebugSessionState,
): 'start' | 'continue' | 'step_over' | 'step_into' | 'step_out' | 'stop' | null {
  if (key === 'F5') {
    if (shiftKey) return state === 'IDLE' ? null : 'stop';
    if (state === 'STOPPED') return 'continue';
    if (state === 'IDLE' || state === 'TERMINATED') return 'start';
    return null;
  }
  if (shiftKey && key === 'F11') return state === 'STOPPED' ? 'step_out' : null;
  if (key === 'F10') return state === 'STOPPED' ? 'step_over' : null;
  if (key === 'F11') return state === 'STOPPED' ? 'step_into' : null;
  return null;
}

export function useDebugger(options: UseDebuggerOptions): DebuggerApi {
  const { exerciseId, active, onActiveLineChange, onOutput } = options;

  const [debugState, setDebugState] = useState<DebugSessionState>('IDLE');
  const [statusMessage, setStatusMessage] = useState(IDLE_MESSAGE);
  const [remediation, setRemediation] = useState<string | null>(null);
  const [callStack, setCallStack] = useState<DebugStackFrame[]>([]);
  const [variables, setVariables] = useState<DebugVariable[]>([]);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [appliedBreakpoints, setAppliedBreakpoints] = useState(0);
  const [requestedBreakpoints, setRequestedBreakpoints] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const nextIdRef = useRef(1);
  const lineCallbackRef = useRef(onActiveLineChange);
  const outputCallbackRef = useRef(onOutput);

  useEffect(() => {
    lineCallbackRef.current = onActiveLineChange;
  }, [onActiveLineChange]);
  useEffect(() => {
    outputCallbackRef.current = onOutput;
  }, [onOutput]);

  const clearActiveLine = useCallback(() => {
    setActiveLine(null);
    lineCallbackRef.current?.(null);
  }, []);

  const reset = useCallback(() => {
    setCallStack([]);
    setVariables([]);
    clearActiveLine();
  }, [clearActiveLine]);

  const closeSocket = useCallback(() => {
    const socket = wsRef.current;
    wsRef.current = null;
    if (socket && socket.readyState <= WebSocket.OPEN) {
      socket.close();
    }
  }, []);

  const send = useCallback(
    (type: string, payload: Record<string, unknown> = {}) => {
      const socket = wsRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return false;
      }
      const id = nextIdRef.current++;
      socket.send(JSON.stringify({ type, id, ...payload }));
      return true;
    },
    [],
  );

  const handleMessage = useCallback(
    (message: DebugServerMessage) => {
      switch (message.type) {
        case 'state': {
          setDebugState(message.state);
          if (message.state === 'STOPPED') {
            const line = message.line != null && message.line >= 0 ? message.line : null;
            setActiveLine(line);
            lineCallbackRef.current?.(line);
            setStatusMessage(
              message.reason === 'breakpoint-hit'
                ? `Stopped at line ${message.line}.`
                : 'Stopped.',
            );
            setRemediation(null);
          } else if (message.state === 'RUNNING') {
            setStatusMessage('Running...');
          } else if (message.state === 'COMPILING') {
            setStatusMessage('Building with debug symbols...');
          } else if (message.state === 'LAUNCHING') {
            setStatusMessage('Starting the debugger...');
          } else if (message.state === 'TERMINATED') {
            reset();
            setStatusMessage('Session ended.');
            setRemediation(null);
          } else if (message.state === 'FAILED') {
            reset();
          } else {
            reset();
            setStatusMessage(IDLE_MESSAGE);
          }
          break;
        }
        case 'stack':
          setCallStack(message.frames);
          break;
        case 'variables':
          setVariables(message.variables);
          break;
        case 'output':
          outputCallbackRef.current?.(message.stream, message.text);
          break;
        case 'diagnostic':
          setRemediation(message.remediation);
          setStatusMessage(`The debugger stopped working: ${message.blocked_reason}.`);
          break;
        case 'result':
          if (message.command === 'start') {
            const data = message.data as {
              applied_breakpoints?: number;
              requested_breakpoints?: number;
            };
            setAppliedBreakpoints(data.applied_breakpoints ?? 0);
            setRequestedBreakpoints(data.requested_breakpoints ?? 0);
          }
          break;
        case 'error':
          // FR-017: every failure reaches the learner in plain language.
          setDebugState((current) => (current === 'FAILED' ? current : 'IDLE'));
          setStatusMessage(message.message);
          setRemediation(message.remediation);
          reset();
          break;
        case 'engine_error':
          setStatusMessage(message.message);
          break;
      }
    },
    [reset],
  );

  // One socket per exercise. Reconnecting on exercise change prevents a stale
  // session from a previous selection driving the current one.
  useEffect(() => {
    if (!active || !exerciseId) {
      closeSocket();
      reset();
      setDebugState('IDLE');
      setStatusMessage(IDLE_MESSAGE);
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(
      `${protocol}//${window.location.host}/ws/debug?exercise_id=${encodeURIComponent(exerciseId)}`,
    );
    wsRef.current = socket;

    socket.onmessage = (event) => {
      try {
        handleMessage(JSON.parse(event.data) as DebugServerMessage);
      } catch {
        // A frame we cannot parse must not wedge the UI.
        setStatusMessage('The debugger sent something unreadable.');
      }
    };
    socket.onclose = () => {
      if (wsRef.current === socket) {
        wsRef.current = null;
        reset();
        setDebugState((current) => (current === 'FAILED' ? current : 'IDLE'));
      }
    };
    socket.onerror = () => {
      setStatusMessage('Lost the connection to the debugger.');
    };

    return () => {
      socket.onclose = null;
      socket.onmessage = null;
      socket.onerror = null;
      if (wsRef.current === socket) {
        wsRef.current = null;
        socket.close();
      }
    };
  }, [active, exerciseId, handleMessage, closeSocket, reset]);

  const startDebug = useCallback(
    async (breakpoints: DebugBreakpointSpec[]) => {
      reset();
      setStatusMessage('Building with debug symbols...');
      if (!send('start', { breakpoints })) {
        setStatusMessage('The debugger is not connected yet. Try again in a moment.');
      }
    },
    [send, reset],
  );

  const stopDebug = useCallback(async () => {
    send('stop');
  }, [send]);

  return {
    debugState,
    statusMessage,
    remediation,
    callStack,
    variables,
    activeLine,
    appliedBreakpoints,
    requestedBreakpoints,
    startDebug,
    continueDebug: useCallback(() => send('continue'), [send]),
    stepOver: useCallback(() => send('step_over'), [send]),
    stepInto: useCallback(() => send('step_into'), [send]),
    stepOut: useCallback(() => send('step_out'), [send]),
    pauseDebug: useCallback(() => send('pause'), [send]),
    stopDebug,
    selectFrame: useCallback((frameId: string) => send('select_frame', { frame_id: frameId }), [send]),
    expandVariable: useCallback((handle: string) => send('expand_variable', { handle }), [send]),
    refresh: useCallback(() => send('refresh'), [send]),
  };
}