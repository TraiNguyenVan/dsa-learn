import { VisualizerStateFrame } from '@/lib/types';

/**
 * Bitwise-operation trace generator (spec 006, T089).
 *
 * Renders a number as its full binary expansion so the identities in the lesson
 * are visible rather than asserted: after each operation the set-bit positions are
 * listed, and the operation's own justification is the frame's rationale.
 *
 * Word width is fixed at 16 bits. That is wide enough for the identities to be
 * visible without the display becoming unreadable, and it is stated in the output
 * so nobody mistakes it for a 64-bit result.
 */
export const DISPLAY_BITS = 16;

type OpKind = 'xor' | 'and' | 'or' | 'andnot' | 'clear_lowest' | 'isolate_lowest' | 'toggle_bit';

const OPERATIONS: Array<{ kind: OpKind; label: string; apply: (a: number, b: number) => number }> = [
  { kind: 'xor', label: 'a XOR b', apply: (a, b) => a ^ b },
  { kind: 'and', label: 'a AND b', apply: (a, b) => a & b },
  { kind: 'or', label: 'a OR b', apply: (a, b) => a | b },
  { kind: 'andnot', label: 'a AND NOT b', apply: (a, b) => a & ~b },
  { kind: 'clear_lowest', label: 'a AND (a - 1)', apply: (a) => a & (a - 1) },
  { kind: 'isolate_lowest', label: 'a AND -a', apply: (a) => a & -a },
];

const popcount = (v: number): number => {
  let c = 0;
  let x = v >>> 0;
  while (x) {
    x &= x - 1;
    c++;
  }
  return c;
};

const bitsOf = (v: number): number[] => {
  const out: number[] = [];
  for (let i = 0; i < DISPLAY_BITS; i++) if ((v >>> i) & 1) out.push(i);
  return out;
};

const toBinary = (v: number): string =>
  (v >>> 0).toString(2).padStart(DISPLAY_BITS, '0').slice(-DISPLAY_BITS);

export function generateBitwiseTrace(
  a: number,
  b: number,
  opIndex = 0,
): VisualizerStateFrame[] {
  const frames: VisualizerStateFrame[] = [];
  const ua = a >>> 0;
  const ub = b >>> 0;
  const op = OPERATIONS[((opIndex % OPERATIONS.length) + OPERATIONS.length) % OPERATIONS.length];

  const snap = (
    action: VisualizerStateFrame['action_type'],
    description: string,
    rationale: string,
    active: number[] = [],
  ): void => {
    frames.push({
      step_index: frames.length,
      total_steps: 0,
      action_type: action,
      description,
      rationale,
      data_structure_type: 'ARRAY',
      array_state: {
        elements: Array.from({ length: DISPLAY_BITS }, (_, i) => ({
          value: i,
          index: i,
          is_highlighted: active.includes(i),
          status: active.includes(i) ? 'active' : 'default',
        })),
        pointers: [
          { name: 'bit', target_index: Math.min(DISPLAY_BITS - 1, Math.max(0, active[0] ?? 0)), color: '#FBBF24' },
        ],
      },
    });
  };

  const describe = (v: number): string =>
    `${v} = 0b${toBinary(v)} (${v === 0 ? 'no set bits' : `set bits at ${bitsOf(v).join(', ')}`})`;

  snap(
    'INIT',
    `Operands over ${DISPLAY_BITS} bits. a = ${describe(ua)}. b = ${describe(ub)}.`,
    'Bitwise operations treat the word as independent bit positions and act on every position in one instruction. That is why the cost is O(1) regardless of how many bits are set — and why the only thing that changes versus a boolean array is the constant.',
    [0],
  );

  const result = op.apply(ua, ub) >>> 0;

  snap(
    'COMPARE',
    `${op.label}: operand expansions are\n  a = ${toBinary(ua)}\n  b = ${toBinary(ub)}`,
    op.kind === 'clear_lowest'
      ? 'Subtracting 1 from a flips its lowest set bit to 0 and sets every lower bit to 1. Masking with the original then keeps only the bits above it, clearing exactly one set bit.'
      : op.kind === 'isolate_lowest'
      ? 'In two\'s complement, -a is the bitwise complement plus one. That flips the lowest set bit and every bit below it, so masking with the original keeps only that one bit.'
      : 'Each operation combines the two operands independently at every bit position, so the result is determined position by position with no carry between positions.',
    bitsOf(ua).slice(0, 1),
  );

  const changed = bitsOf(result).filter((bit) => {
    const inA = ((ua >>> bit) & 1) === 1;
    const inB = ((ub >>> bit) & 1) === 1;
    const out = ((result >>> bit) & 1) === 1;
    return inA !== out || inB !== out;
  });

  snap(
    'HIGHLIGHT',
    `Result: ${describe(result)}. Popcount = ${popcount(result)}.`,
    `Bits ${changed.length ? changed.join(', ') : 'none'} changed position, and no other position did. Each operation acts at exactly one position independently, which is what makes a mask safe to apply: it cannot disturb a bit it does not select.`,
    changed,
  );

  snap(
    'EXHAUST',
    `${op.label} evaluated in three constant-time operations.`,
    'Each step is a single machine instruction with latency of about one cycle, so the whole computation is O(1). The gain over a boolean-array implementation is a factor of the word size — a constant-factor win, not an asymptotic one: both forms are linear in the number of bits.',
    [],
  );

  // Normalise: every generator must report total_steps equal to the frame count,
  // or the player renders "Frame 1 of 0".
  frames.forEach((f, i) => {
    f.step_index = i;
    f.total_steps = frames.length;
  });
  return frames;
}