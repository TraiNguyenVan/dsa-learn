import { VisualizerStateFrame, TrieNodeState } from '@/lib/types';
import { collapseTrailingDuplicate, renumber } from './frameUtils';

/**
 * Trie insert and prefix-search trace generator (spec 006, T063).
 *
 * One function covers both operations because they are the same walk: `insert`
 * creates missing children and sets a terminal flag, `search` stops at the first
 * missing child. Showing them side by side is the clearest way to demonstrate that
 * prefix search costs the same as membership.
 *
 * Node ids encode the prefix they spell (`n_A_BC`), which makes the frames stable
 * and the ids self-describing without a side table.
 */
export function generateTrieTrace(
  keys: string[],
  query: string,
  mode: 'insert' | 'search' = 'insert',
): VisualizerStateFrame[] {
  const frames: VisualizerStateFrame[] = [];
  const nodes = new Map<string, TrieNodeState>([
    ['root', { id: 'root', char: '', depth: 0, is_terminal: false, child_ids: [] }],
  ]);

  const idFor = (prefix: string): string => (prefix ? `n_${prefix}` : 'root');

  const walk = (word: string, mutate: boolean): { found: boolean; activeId: string } => {
    let prefix = '';
    let current = 'root';

    const snap = (
      action: VisualizerStateFrame['action_type'],
      description: string,
      rationale: string,
    ): void => {
      frames.push({
        step_index: frames.length,
        total_steps: 0,
        action_type: action,
        description,
        rationale,
        data_structure_type: 'TRIE',
        trie_state: {
          nodes: Array.from(nodes.values()).map((n) => ({ ...n, child_ids: [...n.child_ids] })),
          active_node_id: current,
        },
      });
    };

    if (word.length === 0) {
      snap(
        'INIT',
        'Query is the empty string, which every trie matches as a prefix.',
        'The root spells the empty prefix, and the empty string is a prefix of every key. So an empty query succeeds at depth zero without inspecting any character.',
      );
      return { found: true, activeId: 'root' };
    }

    snap(
      'INIT',
      `${mutate ? 'Inserting' : 'Searching for'} "${word}" (${word.length} character${word.length === 1 ? '' : 's'}).`,
      mutate
        ? 'Insert walks one edge per character, creating only the edges that are missing. Cost is O(L) for key length L, independent of how many keys are already stored.'
        : 'A prefix search is a membership walk that ignores the terminal flag, so it costs the same O(L) as a membership test. That is the capability a hash table cannot provide at any price.',
    );

    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      const parent = nodes.get(current);
      if (!parent) return { found: false, activeId: 'root' };

      const existing = parent.child_ids.find((cid) => nodes.get(cid)?.char === ch);

      if (existing) {
        current = existing;
        prefix += ch;
        snap(
          'TRAVERSE',
          `Character "${ch}": edge already exists, followed to depth ${prefix.length}.`,
          'A shared prefix is exactly what a trie is for. This character cost nothing to store beyond the edge, because the existing node is reused rather than a copy being made.',
        );
        continue;
      }

      if (!mutate) {
        snap(
          'EXHAUST',
          `Character "${ch}": no outgoing edge, so "${word}" is not a prefix of any stored key.`,
          'The walk followed real edges up to this point, so the failure is not a heuristic. No stored key can continue from this node, so no stored key can start with this prefix — absence is proved.',
        );
        return { found: false, activeId: current };
      }

      const id = idFor(prefix + ch);
      nodes.set(id, {
        id,
        char: ch,
        depth: prefix.length + 1,
        is_terminal: false,
        child_ids: [],
      });
      parent.child_ids.push(id);
      current = id;
      prefix += ch;
      snap(
        'INSERT',
        `Character "${ch}": edge created, new node at depth ${prefix.length} spelling "${prefix}".`,
        'Only the missing edge is created. Every prefix already present is reused, so total node count is proportional to the number of distinct prefixes rather than to the sum of key lengths — that sharing is where the space saving comes from.',
      );
    }

    if (mutate) {
      const leaf = nodes.get(current)!;
      if (leaf.is_terminal) {
        snap(
          'HIGHLIGHT',
          `"${word}" was already a key, so the terminal flag was already set and insertion is a no-op.`,
          'The terminal flag is what distinguishes a complete key from a mere prefix. Finding it already set means this key is present, and re-inserting it changes nothing — which is why trie insert is idempotent.',
        );
      } else {
        leaf.is_terminal = true;
        snap(
          'HIGHLIGHT',
          `Terminal flag set on "${prefix}", so "${word}" is now a complete key.`,
          'The flag is what makes membership decidable in one walk. Without it a successful walk would only prove the word is a prefix of some key, which is a different question.',
        );
      }
      return { found: true, activeId: current };
    }

    const leaf = nodes.get(current)!;
    snap(
      leaf.is_terminal ? 'HIGHLIGHT' : 'EXHAUST',
      leaf.is_terminal
        ? `"${word}" is a complete key: the walk succeeded and the terminal flag is set.`
        : `"${word}" is a valid prefix but not a complete key: the terminal flag is not set.`,
      leaf.is_terminal
        ? 'Both halves of the path invariant hold — the node exists and is terminal — so membership is established in a single O(L) walk with no collisions and no worst-case degradation.'
        : 'This is the distinction that matters most in a trie. The walk succeeded, so some key extends this word, but the flag is unset, so the word itself is not a key. Conflating the two is the classic trie bug.',
    );
    return { found: leaf.is_terminal, activeId: current };
  };

  if (keys.length > 0 && mode === 'insert') {
    for (const key of keys) {
      if (key.length > 0) walk(key, true);
    }
  }

  walk(query, mode === 'insert');

  return renumber(collapseTrailingDuplicate(frames));
}