import { useState, useRef, useCallback, useEffect } from 'react';
import { DebugSessionState, Scope, StackFrame, Variable } from '@/lib/types';

interface UseDAPOptions {
  exerciseId: string | null;
  onActiveLineChange?: (line: number | null) => void;
}

export function useDAP({ exerciseId, onActiveLineChange }: UseDAPOptions) {
  const [debugState, setDebugState] = useState<DebugSessionState>('IDLE');
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [callStack, setCallStack] = useState<StackFrame[]>([]);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const wsRef = useRef<WebSocket | null>(null);
  const seqRef = useRef<number>(1);
  const pendingRequestsRef = useRef<Map<number, (res: any) => void>>(new Map());

  const sendRequest = useCallback((command: string, args: any = {}): Promise<any> => {
    return new Promise((resolve) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        resolve(null);
        return;
      }
      const seq = seqRef.current++;
      pendingRequestsRef.current.set(seq, resolve);
      ws.send(JSON.stringify({ seq, type: 'request', command, arguments: args }));
    });
  }, []);

  const updateActiveLine = useCallback(
    (line: number | null) => {
      setActiveLine(line);
      if (onActiveLineChange) onActiveLineChange(line);
    },
    [onActiveLineChange]
  );

  const fetchStackAndVariables = useCallback(async () => {
    // 1. Fetch stack trace
    const stackRes = await sendRequest('stackTrace', { threadId: 1 });
    if (stackRes && stackRes.stackFrames && stackRes.stackFrames.length > 0) {
      const frames: StackFrame[] = stackRes.stackFrames.map((f: any) => ({
        id: f.id,
        name: f.name,
        line: f.line,
        column: f.column,
        source: f.source?.path || f.source?.name,
      }));
      setCallStack(frames);
      const topFrame = frames[0];
      updateActiveLine(topFrame.line);

      // 2. Fetch scopes for top frame
      const scopesRes = await sendRequest('scopes', { frameId: topFrame.id });
      if (scopesRes && scopesRes.scopes) {
        setScopes(scopesRes.scopes);

        // 3. Fetch variables for primary local scope
        const localScope = scopesRes.scopes.find((s: any) => s.name.toLowerCase().includes('local')) || scopesRes.scopes[0];
        if (localScope) {
          const varsRes = await sendRequest('variables', { variablesReference: localScope.variablesReference });
          if (varsRes && varsRes.variables) {
            setVariables(
              varsRes.variables.map((v: any) => ({
                name: v.name,
                value: v.value,
                type: v.type,
                variablesReference: v.variablesReference,
              }))
            );
          }
        }
      }
    }
  }, [sendRequest, updateActiveLine]);

  const startDebug = useCallback(
    async (breakpoints: number[]) => {
      if (!exerciseId) return;

      setDebugState('COMPILING');
      setStatusMessage('Compiling solution with debug symbols (-g -O0)...');
      updateActiveLine(null);
      setCallStack([]);
      setVariables([]);

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/dap?exercise_id=${exerciseId}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        setDebugState('LAUNCHING');
        setStatusMessage('Connecting to debugger...');

        // 1. Initialize
        await sendRequest('initialize', {
          clientID: 'dsa-learn',
          adapterID: 'gdb-dap',
          linesStartAt1: true,
          columnsStartAt1: true,
        });

        // 2. Launch debug target
        await sendRequest('launch', {
          program: `.dsa/build/debug_${exerciseId}`,
          cwd: '.',
          stopAtEntry: false,
        });

        // 3. Set breakpoints
        if (breakpoints.length > 0) {
          await sendRequest('setBreakpoints', {
            source: { path: `exercises/${exerciseId}/solution.cpp` },
            lines: breakpoints,
          });
        }

        // 4. Configuration done
        await sendRequest('configurationDone', {});
        setDebugState('RUNNING');
        setStatusMessage('Debugging active. Program running...');
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);

          // Handle response
          if (msg.type === 'response' && msg.request_seq) {
            const resolve = pendingRequestsRef.current.get(msg.request_seq);
            if (resolve) {
              pendingRequestsRef.current.delete(msg.request_seq);
              resolve(msg.body);
            }
          }

          // Handle events
          if (msg.type === 'event') {
            if (msg.event === 'stopped') {
              setDebugState('STOPPED');
              setStatusMessage(`Execution paused (${msg.body?.reason || 'breakpoint'}).`);
              await fetchStackAndVariables();
            } else if (msg.event === 'continued') {
              setDebugState('RUNNING');
              setStatusMessage('Running...');
              updateActiveLine(null);
            } else if (msg.event === 'terminated' || msg.event === 'exited') {
              setDebugState('TERMINATED');
              setStatusMessage(`Process exited with code ${msg.body?.exitCode ?? 0}.`);
              updateActiveLine(null);
            } else if (msg.event === 'output') {
              if (msg.body?.category === 'stderr') {
                setStatusMessage(`Debugger: ${msg.body.output}`);
              }
            }
          }
        } catch (err) {
          console.error('Failed to parse DAP message:', err);
        }
      };

      ws.onclose = () => {
        setDebugState('IDLE');
        updateActiveLine(null);
        wsRef.current = null;
      };
    },
    [exerciseId, fetchStackAndVariables, sendRequest, updateActiveLine]
  );

  const continueExec = useCallback(async () => {
    await sendRequest('continue', { threadId: 1 });
  }, [sendRequest]);

  const stepOver = useCallback(async () => {
    await sendRequest('next', { threadId: 1 });
  }, [sendRequest]);

  const stepInto = useCallback(async () => {
    await sendRequest('stepIn', { threadId: 1 });
  }, [sendRequest]);

  const stepOut = useCallback(async () => {
    await sendRequest('stepOut', { threadId: 1 });
  }, [sendRequest]);

  const pauseExec = useCallback(async () => {
    await sendRequest('pause', { threadId: 1 });
  }, [sendRequest]);

  const stopDebug = useCallback(async () => {
    await sendRequest('disconnect', { terminateDebuggee: true });
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setDebugState('IDLE');
    updateActiveLine(null);
  }, [sendRequest, updateActiveLine]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    debugState,
    activeLine,
    callStack,
    scopes,
    variables,
    statusMessage,
    startDebug,
    continueExec,
    stepOver,
    stepInto,
    stepOut,
    pauseExec,
    stopDebug,
  };
}
