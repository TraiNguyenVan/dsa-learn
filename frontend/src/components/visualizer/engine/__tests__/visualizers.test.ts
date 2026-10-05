import { generateBinarySearchTrace, generateTwoSumTrace } from '../arrayVisualizer';
import { generateInsertHeadTrace, generateReverseListTrace } from '../linkedListVisualizer';
import { generateBSTInsertTrace, generateBSTSearchTrace } from '../treeVisualizer';
import { generateHeapInsertTrace } from '../heapVisualizer';

interface Assertion<T> {
  toBe: (expected: T) => void;
  toBeGreaterThan: (expected: number) => void;
  toContain: (expected: string) => void;
}

function expect<T>(actual: T): Assertion<T> {
  return {
    toBe(expected: T) {
      if (actual !== expected) {
        throw new Error(`Expected ${actual} to be ${expected}`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (typeof actual !== 'number' || actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toContain(expected: string) {
      if (typeof actual !== 'string' || !actual.includes(expected)) {
        throw new Error(`Expected "${actual}" to contain "${expected}"`);
      }
    },
  };
}

function describe(_name: string, fn: () => void) {
  fn();
}

function it(_name: string, fn: () => void) {
  fn();
}

describe('Visualizer Trace Engines', () => {
  describe('Array Visualizers', () => {
    it('generates binary search trace with target present', () => {
      const frames = generateBinarySearchTrace([1, 3, 5, 7, 9], 5);
      expect(frames.length).toBeGreaterThan(1);
      expect(frames[0].action_type).toBe('INIT');
      const last = frames[frames.length - 1];
      expect(last.action_type).toBe('HIGHLIGHT');
      expect(last.description).toContain('Target 5 successfully found');
    });

    it('generates binary search trace with target missing', () => {
      const frames = generateBinarySearchTrace([1, 3, 7, 9], 5);
      const last = frames[frames.length - 1];
      expect(last.description).toContain('not present');
    });

    it('generates two sum trace', () => {
      const frames = generateTwoSumTrace([2, 7, 11, 15], 9);
      expect(frames.length).toBeGreaterThan(1);
      const last = frames[frames.length - 1];
      expect(last.action_type).toBe('HIGHLIGHT');
      expect(last.description).toContain('found at indices');
    });
  });

  describe('Linked List Visualizer', () => {
    it('generates insert head trace', () => {
      const frames = generateInsertHeadTrace([10, 20], 5);
      expect(frames.length).toBe(4);
      expect(frames[0].action_type).toBe('INIT');
      expect(frames[3].action_type).toBe('HIGHLIGHT');
    });

    it('generates reverse list trace', () => {
      const frames = generateReverseListTrace([1, 2, 3]);
      expect(frames.length).toBeGreaterThan(3);
      const last = frames[frames.length - 1];
      expect(last.description).toContain('Reversal complete');
    });
  });

  describe('BST Visualizer', () => {
    it('generates BST search trace', () => {
      const frames = generateBSTSearchTrace([50, 30, 70, 20, 40], 40);
      expect(frames.length).toBeGreaterThan(2);
      const hasFound = frames.some((f) => f.tree_state?.nodes.some((n) => n.status === 'found'));
      expect(hasFound).toBe(true);
    });

    it('generates BST insert trace', () => {
      const frames = generateBSTInsertTrace([20, 10, 30], 25);
      expect(frames.length).toBeGreaterThan(2);
      const last = frames[frames.length - 1];
      expect(last.action_type).toBe('INSERT');
    });
  });

  describe('Heap Visualizer', () => {
    it('generates heap insert trace with bubble up', () => {
      const frames = generateHeapInsertTrace([10, 20, 30], 5);
      expect(frames.length).toBeGreaterThan(2);
      const hasSwap = frames.some((f) => f.action_type === 'SWAP');
      expect(hasSwap).toBe(true);
    });
  });
});
