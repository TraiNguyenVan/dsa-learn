import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor, cleanup } from '@testing-library/react';
import { useDebugger } from '../useDebugger';
import type { DebugServerMessage } from '@/lib/types';

/** Minimal WebSocket stub that records frames and lets a test push server events. */
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static OPEN = 1;

  url: string;
  readyState = 1;
  sent: string[] = [];
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3;
    this.onclose?.();
  }

  /* Test helpers */
  receive(message: DebugServerMessage | Record<string, unknown>) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }

  sentCommands(): { type: string; id: number }[] {
    return this.sent.map((raw) => JSON.parse(raw));
  }
}

function Harness(props: Parameters<typeof useDebugger>[0]) {
  const api = useDebugger(props);
  return (
    <div>
      <span data-testid="state">{api.debugState}</span>
      <span data-testid="status">{api.statusMessage}</span>
      <span data-testid="remediation">{api.remediation ?? ''}</span>
      <span data-testid="activeLine">{String(api.activeLine)}</span>
      <span data-testid="frames">{api.callStack.length}</span>
      <span data-testid="vars">{api.variables.length}</span>
      <span data-testid="applied">{api.appliedBreakpoints}</span>
      <button onClick={() => api.startDebug([{ file: 'a.cpp', line: 4 }])}>start</button>
      <button onClick={api.stepOver}>step</button>
      <button onClick={() => api.selectFrame('f1')}>frame</button>
      <button onClick={() => api.expandVariable('v2')}>expand</button>
      <button onClick={api.stopDebug}>stop</button>
    </div>
  );
}

const lastSocket = () => FakeWebSocket.instances[FakeWebSocket.instances.length - 1];

describe('useDebugger', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('connects to the debug endpoint for the selected exercise', () => {
    render(<Harness exerciseId="two-sum" active />);
    expect(lastSocket().url).toContain('/ws/debug?exercise_id=two-sum');
  });

  it('does not connect when inactive', () => {
    render(<Harness exerciseId="two-sum" active={false} />);
    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  it('starts idle', () => {
    render(<Harness exerciseId="two-sum" active />);
    expect(screen.getByTestId('state').textContent).toBe('IDLE');
  });

  it('sends a start command carrying breakpoints', () => {
    render(<Harness exerciseId="two-sum" active />);
    fireEvent.click(screen.getByText('start'));
    const [command] = lastSocket().sentCommands();
    expect(command.type).toBe('start');
    expect(JSON.parse(lastSocket().sent[0]).breakpoints).toEqual([{ file: 'a.cpp', line: 4 }]);
  });

  it('assigns a strictly increasing id to each command', () => {
    render(<Harness exerciseId="two-sum" active />);
    fireEvent.click(screen.getByText('start'));
    fireEvent.click(screen.getByText('step'));
    fireEvent.click(screen.getByText('stop'));
    const ids = lastSocket().sentCommands().map((c) => c.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('applies a state event to hook state', () => {
    render(<Harness exerciseId="two-sum" active />);
    act(() => lastSocket().receive({ type: 'state', state: 'COMPILING' }));
    expect(screen.getByTestId('state').textContent).toBe('COMPILING');
  });

  it('reports the active line when stopped', () => {
    render(<Harness exerciseId="two-sum" active />);
    act(() =>
      lastSocket().receive({ type: 'state', state: 'STOPPED', reason: 'breakpoint-hit', line: 14 })
    );
    expect(screen.getByTestId('state').textContent).toBe('STOPPED');
    expect(screen.getByTestId('activeLine').textContent).toBe('14');
  });

  it('ignores a non-positive line', () => {
    render(<Harness exerciseId="two-sum" active />);
    act(() => lastSocket().receive({ type: 'state', state: 'STOPPED', line: -1 }));
    expect(screen.getByTestId('activeLine').textContent).toBe('null');
  });

  it('clears the active line on terminate', () => {
    render(<Harness exerciseId="two-sum" active />);
    act(() => lastSocket().receive({ type: 'state', state: 'STOPPED', line: 14 }));
    act(() => lastSocket().receive({ type: 'state', state: 'TERMINATED' }));
    expect(screen.getByTestId('activeLine').textContent).toBe('null');
    expect(screen.getByTestId('frames').textContent).toBe('0');
  });

  it('notifies the parent of active-line changes', () => {
    const onActiveLineChange = vi.fn();
    render(<Harness exerciseId="two-sum" active onActiveLineChange={onActiveLineChange} />);
    act(() => lastSocket().receive({ type: 'state', state: 'STOPPED', line: 14 }));
    expect(onActiveLineChange).toHaveBeenCalledWith(14);
    act(() => lastSocket().receive({ type: 'state', state: 'TERMINATED' }));
    expect(onActiveLineChange).toHaveBeenCalledWith(null);
  });

  it('populates the call stack', () => {
    render(<Harness exerciseId="two-sum" active />);
    act(() =>
      lastSocket().receive({
        type: 'stack',
        frames: [{ id: 'f0', level: 0, function: 'twoSum', file: null, line: 9, column: -1 }],
      })
    );
    expect(screen.getByTestId('frames').textContent).toBe('1');
  });

  it('populates variables', () => {
    render(<Harness exerciseId="two-sum" active />);
    act(() =>
      lastSocket().receive({
        type: 'variables',
        frame_id: 'f0',
        variables: [{ name: 'x', type: 'int', value: '1', has_children: false, handle: null, truncated: false }],
      })
    );
    expect(screen.getByTestId('vars').textContent).toBe('1');
  });

  it('records applied versus requested breakpoints from a start result', () => {
    render(<Harness exerciseId="two-sum" active />);
    act(() =>
      lastSocket().receive({
        type: 'result',
        id: 1,
        command: 'start',
        data: { applied_breakpoints: 1, requested_breakpoints: 3 },
      })
    );
    expect(screen.getByTestId('applied').textContent).toBe('1');
  });

  it('routes output to the terminal writer with its stream', () => {
    const onOutput = vi.fn();
    render(<Harness exerciseId="two-sum" active onOutput={onOutput} />);
    act(() => lastSocket().receive({ type: 'output', stream: 'target', text: 't=3', seq: 1 }));
    expect(onOutput).toHaveBeenCalledWith('target', 't=3');
  });

  it('surfaces an error envelope as a plain-language message', () => {
    render(<Harness exerciseId="two-sum" active />);
    act(() =>
      lastSocket().receive({
        type: 'error',
        id: 1,
        code: 'debug_build_failed',
        message: 'Your solution must compile before it can be debugged.',
        remediation: 'Fix the compiler errors below.',
      })
    );
    expect(screen.getByTestId('status').textContent).toContain('must compile');
    expect(screen.getByTestId('remediation').textContent).toContain('Fix the compiler errors');
    expect(screen.getByTestId('state').textContent).toBe('IDLE');
  });

  it('surfaces a mid-session diagnostic', () => {
    render(<Harness exerciseId="two-sum" active />);
    act(() =>
      lastSocket().receive({
        type: 'diagnostic',
        blocked_reason: 'not_code_signed',
        remediation: 'Run codesign',
      })
    );
    expect(screen.getByTestId('remediation').textContent).toBe('Run codesign');
  });

  it('does not wedge on an unparseable frame', () => {
    render(<Harness exerciseId="two-sum" active />);
    act(() => lastSocket().onmessage?.({ data: 'not json at all' }));
    expect(screen.getByTestId('status').textContent).toContain('unreadable');
  });

  it('sends frame selection and variable expansion with their identifiers', () => {
    render(<Harness exerciseId="two-sum" active />);
    fireEvent.click(screen.getByText('frame'));
    fireEvent.click(screen.getByText('expand'));
    const commands = lastSocket().sentCommands();
    expect(commands[0]).toMatchObject({ type: 'select_frame', frame_id: 'f1' });
    expect(commands[1]).toMatchObject({ type: 'expand_variable', handle: 'v2' });
  });

  it('reconnects when the exercise changes', async () => {
    const { rerender } = render(<Harness exerciseId="two-sum" active />);
    rerender(<Harness exerciseId="binary-search" active />);
    await waitFor(() => expect(FakeWebSocket.instances.length).toBeGreaterThan(1));
    expect(lastSocket().url).toContain('binary-search');
  });

  it('closes the socket when the exercise changes', () => {
    const { rerender } = render(<Harness exerciseId="two-sum" active />);
    const first = lastSocket();
    const spy = vi.spyOn(first, 'close');
    rerender(<Harness exerciseId="binary-search" active />);
    expect(spy).toHaveBeenCalled();
  });

  it('reports when the debugger is not connected yet', async () => {
    const { rerender } = render(<Harness exerciseId="two-sum" active={false} />);
    rerender(<Harness exerciseId="two-sum" active />);
    // Simulate a socket that never opened.
    act(() => {
      lastSocket().readyState = 0;
    });
    fireEvent.click(screen.getByText('start'));
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toMatch(/not connected/i)
    );
  });
});