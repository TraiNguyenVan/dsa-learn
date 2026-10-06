import { VisualizerStateFrame } from '@/lib/types';
import { collapseTrailingDuplicate, renumber } from './frameUtils';

/**
 * Hash-table insert trace generator (spec 006 — arrays-hashing animation).
 *
 * Distinct from binary search: it shows the subject the topic is actually named
 * for. Keys are placed into a bucket array by `hash(key) = key mod bucketCount`,
 * and every frame names the bucket a key landed in. Collisions are the point —
 * they are why the cost is 1 + alpha rather than 1 — so they are surfaced rather
 * than smoothed over.
 *
 * Separate chaining is modelled: a bucket holds a list of keys, rendered in the
 * element's `label` so the picture and the cost claim stay connected.
 */
export function generateHashInsertTrace(
  keys: number[],
  bucketCount = 5,
): VisualizerStateFrame[] {
  const nums = [...keys];
  const buckets = Math.max(1, Math.min(24, Math.floor(bucketCount)));
  const frames: VisualizerStateFrame[] = [];

  const chains: number[][] = Array.from({ length: buckets }, () => []);
  let collisions = 0;

  const loadFactor = (): number => {
    const total = chains.reduce((a, c) => a + c.length, 0);
    return total / buckets;
  };

  const snap = (
    action: VisualizerStateFrame['action_type'],
    description: string,
    rationale: string,
    activeBucket: number | null = null,
  ): void => {
    frames.push({
      step_index: frames.length,
      total_steps: 0,
      action_type: action,
      description,
      rationale,
      data_structure_type: 'ARRAY',
      array_state: {
        elements: chains.map((chain, i) => ({
          value: chain.length,
          index: i,
          is_highlighted: i === activeBucket,
          status: i === activeBucket ? 'active' : chain.length > 1 ? 'candidate' : 'default',
          label: chain.length ? chain.join(' -> ') : undefined,
        })),
        pointers: activeBucket !== null ? [{ name: 'bucket', target_index: activeBucket, color: '#FBBF24' }] : [],
      },
    });
  };

  if (nums.length === 0) {
    snap(
      'INIT',
      `Bucket array of ${buckets} buckets allocated, every bucket empty.`,
      'An empty table is a valid state and the base case for any lookup: scanning every bucket finds nothing, which proves absence rather than merely failing to find a key. With no entries the load factor is zero.',
    );
    return renumber(collapseTrailingDuplicate(frames));
  }

  snap(
    'INIT',
    `Bucket array of ${buckets} buckets allocated. Inserting ${nums.length} key${nums.length === 1 ? '' : 's'} using hash(k) = k mod ${buckets}.`,
    'Hashing computes a key\'s position arithmetically rather than by comparing it to other keys, which is why the table avoids the logarithmic comparison-sort barrier entirely. Correctness still requires that equal keys hash equal.',
  );

  for (const key of nums) {
    const b = ((key % buckets) + buckets) % buckets;
    const previouslyHere = chains[b];
    const collided = previouslyHere.length > 0;
    if (collided) collisions++;

    // One frame per insert rather than a separate "compare" frame followed by an
    // "insert" frame. A pre-mutation frame renders the buckets exactly as the
    // previous frame already did, so two consecutive frames would look identical
    // (contract F-05) and the learner would see the canvas freeze on every key.
    chains[b].push(key);

    snap(
      'INSERT',
      collided
        ? `Key ${key} hashes to bucket ${b}, which already held ${previouslyHere.join(', ')}: a collision, so ${key} is chained onto it. Bucket ${b} now holds ${chains[b].join(', ')}.`
        : `Key ${key} hashes to bucket ${b}, which was empty, so it is placed there directly. Bucket ${b} now holds ${key}.`,
      collided
        ? 'Two different keys sharing a bucket is a collision, and it is expected rather than an error -- it is the consequence of mapping infinitely many keys onto finitely many buckets. Chaining preserves correctness because the bucket is still scanned by key equality, and it is exactly why lookup costs 1 + alpha rather than a constant.'
        : 'The invariant is that an entry is always reachable from the bucket its key hashes to, and placing it there establishes that for this key. Lookup will therefore find it, which is why "absent after scanning the bucket" is a proof rather than a guess.',
      b,
    );
  }

  const longest = Math.max(...chains.map((c) => c.length));
  const alpha = loadFactor();
  snap(
    'EXHAUST',
    `Inserted ${nums.length} keys into ${buckets} buckets. ${collisions} insertion${collisions === 1 ? '' : 's'} collided. Longest chain ${longest}, final load factor ${alpha.toFixed(2)}.`,
    'Expected lookup cost is 1 + alpha, so keeping alpha bounded by resizing when it crosses a threshold is what makes the cost constant rather than growing with n. The worst case is O(n), reached exactly when every key lands in one bucket, so average and worst case differ by a factor of n.',
  );

  return renumber(collapseTrailingDuplicate(frames));
}

