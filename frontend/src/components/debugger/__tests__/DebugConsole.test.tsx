import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DebugConsole } from '../DebugConsole';
import type { DebugStackFrame, DebugVariable } from '@/lib/types';

const FRAMES: DebugStackFrame[] = [
  { id: 'f0', level: 0, function: 'twoSum', file: '/w/solution.cpp', line: 9, column: -1 },
  { id: 'f1', level: 1, function: 'test_func_8', file: '/w/main.cpp', line: 11, column: -1 },
];

const VARIABLES: DebugVariable[] = [
  { name: 'target', type: 'int', value: '9', has_children: false, handle: null, truncated: false },
  {
    name: 'nums',
    type: 'std::vector<int>',
    value: '{...}',
    has_children: true,
    handle: 'v2',
    truncated: false,
  },
  { name: 'orphan', type: 'Foo', value: '1', has_children: false, handle: null, truncated: false },
];

function renderConsole(overrides: Partial<React.ComponentProps<typeof DebugConsole>> = {}) {
  const props = {
    callStack: FRAMES,
    variables: VARIABLES,
    selectedFrameId: 'f0',
    isStopped: true,
    onSelectFrame: vi.fn(),
    onExpandVariable: vi.fn(),
    expandedHandles: new Set<string>(),
    childrenByHandle: {},
    ...overrides,
  };
  return { ...render(<DebugConsole {...props} />), props };
}

describe('DebugConsole', () => {
  // Auto-cleanup is not enabled for this project, so unmount explicitly;
  // otherwise queries match elements from earlier tests.
  afterEach(() => cleanup());

  it('renders the call stack with function names and line numbers', () => {
    renderConsole();
    expect(screen.getByText('twoSum')).toBeTruthy();
    expect(screen.getByText('test_func_8')).toBeTruthy();
    expect(screen.getByText('Line 9')).toBeTruthy();
  });

  it('renders an empty-state message when there are no frames', () => {
    renderConsole({ callStack: [] });
    expect(screen.getByText('No active frames')).toBeTruthy();
  });

  it('shows an unknown line rather than a negative one', () => {
    renderConsole({
      callStack: [{ id: 'f0', level: 0, function: 'f', file: null, line: -1, column: -1 }],
    });
    expect(screen.getByText('line ?')).toBeTruthy();
  });

  it('reports the selected frame to the caller', () => {
    const onSelectFrame = vi.fn();
    renderConsole({ onSelectFrame });
    fireEvent.click(screen.getByText('test_func_8'));
    expect(onSelectFrame).toHaveBeenCalledWith('f1');
  });

  it('disables frame selection when the session is not stopped', () => {
    const onSelectFrame = vi.fn();
    renderConsole({ isStopped: false, onSelectFrame });
    fireEvent.click(screen.getByText('twoSum'));
    expect(onSelectFrame).not.toHaveBeenCalled();
  });

  it('renders variable name, type and value', () => {
    renderConsole();
    expect(screen.getByText('target')).toBeTruthy();
    expect(screen.getByText('int')).toBeTruthy();
    expect(screen.getByText('9')).toBeTruthy();
  });

  it('gives an expandable variable an expand control', () => {
    renderConsole();
    const button = screen.getByLabelText('Expand nums');
    expect(button).toBeTruthy();
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('reports the handle when a variable is expanded', () => {
    const onExpandVariable = vi.fn();
    renderConsole({ onExpandVariable });
    fireEvent.click(screen.getByLabelText('Expand nums'));
    expect(onExpandVariable).toHaveBeenCalledWith('v2');
  });

  it('gives a non-expandable variable no expand affordance', () => {
    renderConsole();
    expect(screen.queryByLabelText('Expand target')).toBeNull();
    expect(screen.queryByLabelText('Expand orphan')).toBeNull();
  });

  it('marks an already-expanded variable as expanded', () => {
    renderConsole({ expandedHandles: new Set(['v2']) });
    const button = screen.getByLabelText('Collapse nums');
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('renders children of an expanded variable', () => {
    renderConsole({
      expandedHandles: new Set(['v2']),
      childrenByHandle: {
        v2: [
          {
            name: 'size',
            type: 'unsigned long',
            value: '4',
            has_children: false,
            handle: null,
            truncated: false,
          },
        ],
      },
    });
    expect(screen.getByText('size')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('renders children nested one level deeper than their parent', () => {
    renderConsole({
      expandedHandles: new Set(['v2']),
      childrenByHandle: {
        v2: [
          {
            name: 'inner',
            type: 'std::map',
            value: '{...}',
            has_children: true,
            handle: 'v9',
            truncated: false,
          },
        ],
      },
    });
    expect(screen.getByLabelText('Expand inner')).toBeTruthy();
  });

  it('shows a placeholder for a compound value with no rendered value', () => {
    renderConsole({
      variables: [
        { name: 'empty', type: 'std::string', value: '', has_children: true, handle: 'v3', truncated: false },
      ],
    });
    expect(screen.getByText('{...}')).toBeTruthy();
  });

  it('marks a truncated value', () => {
    renderConsole({
      variables: [
        { name: 'long', type: 'std::string', value: 'abc', has_children: false, handle: null, truncated: true },
      ],
    });
    expect(screen.getByText('abc').textContent).toContain('…');
  });

  it('explains that variables need a stopped session', () => {
    renderConsole({ isStopped: false, variables: [] });
    expect(screen.getByText('Variables appear when execution stops')).toBeTruthy();
  });

  it('exposes both panes to assistive technology', () => {
    renderConsole();
    expect(screen.getByLabelText('Call stack')).toBeTruthy();
    expect(screen.getByLabelText('Variables')).toBeTruthy();
  });
});