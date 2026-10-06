import React from 'react';
import { TrieState } from '@/lib/types';

interface TrieCanvasProps {
  trie: TrieState;
}

/**
 * Depth-indented tree, one row per node.
 *
 * Indentation by depth is the readable choice for a trie because the thing the
 * reader needs to see is the *string* each path spells, not the geometry of the
 * nodes. An SVG edge diagram of a 20-node trie wastes most of its area on edges
 * while hiding the one fact that matters: which prefix each node represents.
 */
export const TrieCanvas: React.FC<TrieCanvasProps> = ({ trie }) => {
  const nodes = trie.nodes ?? [];

  if (nodes.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-500 font-mono text-xs gap-1">
        <span className="text-slate-400">Trie is empty</span>
        <span>Only a root node exists, so no key is present and no prefix matches.</span>
      </div>
    );
  }

  // Build child -> parent links so each row can draw its branch characters.
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const parentOf = new Map<string, string>();
  for (const n of nodes) {
    for (const childId of n.child_ids ?? []) {
      if (byId.has(childId)) parentOf.set(childId, n.id);
    }
  }

  const branchOf = (id: string): string => {
    const seen: string[] = [];
    let cur: string | undefined = id;
    while (cur && parentOf.has(cur)) {
      seen.unshift(byId.get(cur)!.char);
      cur = parentOf.get(cur);
    }
    return seen.join('');
  };

  // Depth-first order so a subtree appears contiguously under its parent.
  const ordered: string[] = [];
  const emit = (id: string) => {
    ordered.push(id);
    const n = byId.get(id);
    if (!n) return;
    for (const childId of n.child_ids ?? []) emit(childId);
  };
  emit('root');
  for (const n of nodes) {
    if (!parentOf.has(n.id) && !ordered.includes(n.id)) ordered.push(n.id);
  }

  const maxDepth = Math.max(...nodes.map((n) => n.depth ?? 0));

  return (
    <div className="w-full flex flex-col items-center justify-start p-4 gap-2 overflow-x-auto">
      <div className="w-full max-w-2xl">
        {ordered.map((id) => {
          const n = byId.get(id);
          if (!n) return null;
          const isActive = id === trie.active_node_id;
          const prefix = branchOf(id);
          return (
            <div
              key={id}
              className={`flex items-center gap-2 py-1 px-2 rounded font-mono text-xs transition-all duration-200 ${
                isActive ? 'bg-amber-500/15 border border-amber-500/40' : 'border border-transparent'
              }`}
              style={{ paddingLeft: `${(n.depth ?? 0) * 22 + 8}px` }}
            >
              {n.char ? (
                <>
                  <span className="text-slate-600 select-none">{'└'.repeat(1)}</span>
                  <span className="text-cyan-300 font-bold">{n.char}</span>
                  <span className="text-slate-600 truncate">
                    {prefix ? `prefix "${prefix}"` : ''}
                  </span>
                </>
              ) : (
                <span className="text-slate-500">root (empty prefix)</span>
              )}

              <span className="flex-1" />

              {n.is_terminal && (
                <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  key
                </span>
              )}
              {isActive && (
                <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide bg-amber-500/20 text-amber-200 border border-amber-500/40">
                  at
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-4 text-[10px] font-mono text-slate-500">
        <span>{nodes.length} nodes, {nodes.filter((n) => n.is_terminal).length} complete keys</span>
        <span>max depth {maxDepth}</span>
        <span>indentation is prefix depth</span>
      </div>
    </div>
  );
};