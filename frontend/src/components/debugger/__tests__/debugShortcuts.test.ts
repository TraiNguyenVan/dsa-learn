/**
 * Keyboard shortcut rules (US5, FR-022).
 *
 * These are a regression guard: swapping the debug engine must not take away the
 * shortcuts learners already rely on.
 */

import { describe, expect, it } from 'vitest';
import { debugShortcutAction } from '../useDebugger';
import type { DebugSessionState } from '@/lib/types';

const ALL_STATES: DebugSessionState[] = [
  'IDLE',
  'COMPILING',
  'LAUNCHING',
  'RUNNING',
  'STOPPED',
  'TERMINATED',
  'FAILED',
];

describe('debugShortcutAction', () => {
  describe('F5', () => {
    it('starts a session when idle', () => {
      expect(debugShortcutAction('F5', false, 'IDLE')).toBe('start');
    });

    it('starts again after a session terminated', () => {
      expect(debugShortcutAction('F5', false, 'TERMINATED')).toBe('start');
    });

    it('continues when stopped at a breakpoint', () => {
      expect(debugShortcutAction('F5', false, 'STOPPED')).toBe('continue');
    });

    it('is inert while a session is still starting', () => {
      expect(debugShortcutAction('F5', false, 'COMPILING')).toBeNull();
      expect(debugShortcutAction('F5', false, 'LAUNCHING')).toBeNull();
    });

    it('is inert while the program is running freely', () => {
      expect(debugShortcutAction('F5', false, 'RUNNING')).toBeNull();
    });
  });

  describe('Shift+F5', () => {
    it('stops from every non-idle state', () => {
      for (const state of ['COMPILING', 'LAUNCHING', 'RUNNING', 'STOPPED', 'TERMINATED', 'FAILED'] as const) {
        expect(debugShortcutAction('F5', true, state)).toBe('stop');
      }
    });

    it('is inert when already idle', () => {
      expect(debugShortcutAction('F5', true, 'IDLE')).toBeNull();
    });
  });

  describe('stepping', () => {
    it('F10 steps over only when stopped', () => {
      expect(debugShortcutAction('F10', false, 'STOPPED')).toBe('step_over');
    });

    it('F11 steps into only when stopped', () => {
      expect(debugShortcutAction('F11', false, 'STOPPED')).toBe('step_into');
    });

    it('Shift+F11 steps out only when stopped', () => {
      expect(debugShortcutAction('F11', true, 'STOPPED')).toBe('step_out');
    });

    it('every stepping key is ignored in every other state', () => {
      for (const state of ALL_STATES.filter((s) => s !== 'STOPPED')) {
        expect(debugShortcutAction('F10', false, state)).toBeNull();
        expect(debugShortcutAction('F11', false, state)).toBeNull();
        expect(debugShortcutAction('F11', true, state)).toBeNull();
      }
    });
  });

  it('ignores keys that are not debug shortcuts', () => {
    for (const key of ['Enter', 'F1', 'F12', 'a', 'Escape', 'Tab']) {
      for (const state of ALL_STATES) {
        expect(debugShortcutAction(key, false, state)).toBeNull();
      }
    }
  });

  it('every non-idle state offers a way to stop', () => {
    for (const state of ALL_STATES) {
      const action = debugShortcutAction('F5', true, state);
      if (state === 'IDLE') {
        expect(action).toBeNull();
      } else {
        expect(action).toBe('stop');
      }
    }
  });
});