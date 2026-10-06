# Tries

## Overview
A trie, or prefix tree, is a tree whose edges carry labels, where the path from
the root to a node spells one key. A node may carry a `terminal` flag marking that
the path spelling it is a complete key in the collection. Because the structure
stores keys as *shared prefixes* rather than as whole units, keys that share a
prefix pay for it once instead of once each.

That sharing is what the structure is for. A hash table of $n$ keys of length $L$
stores $nL$ characters. A trie stores at most that, but typically far less when
prefixes overlap, and more importantly it *reuses* the shared part structurally
rather than merely not storing it. The payoff is that lookup, prefix search and
ordered iteration all become proportional to the key's own length rather than to
the size of the collection.

The properties that follow from prefix-sharing are what make tries worth the
memory cost:

- **Membership and prefix existence have the same shape.** "Is this a key?" and
  "is any key starting with this a key?" are both a single walk to a node, the
  first checking `terminal`, the second not.
- **There is no collision and no hash function.** Correctness is structural, so
  there is no worst-case degradation to reason about. That is a genuine advantage
  over hashing for adversarial inputs.
- **Ordered traversal is free.** Walking the children in sorted order visits keys
  in lexicographic order with no sorting step and no comparison-based lower bound
  to pay.

## Mechanics and Memory Layout
Every node carries an `is_terminal` flag and an array or map of outgoing edges
keyed by symbol. The memory cost follows directly from that choice.

- **Fixed fan-out** (26 for lowercase letters, 10 for digits). Children live in a
  contiguous array inside the parent node. One array lookup gives $O(1)$ child
  access with no pointer chasing. The cost is memory: a sparse trie wastes most
  of every node's array.
- **Sparse / linked children.** A node stores a linked list or small map of
  outgoing edges. Space is proportional to the actual number of children, but
  child lookup becomes $O(\text{fanout})$ — $O(26)$ for letters, which is bounded
  and small in practice.
- **Hash or binary-search children.** Node stores a map from symbol to child.
  $O(1)$ expected lookup with $O(k)$ space for $k$ children.

The number of nodes is the other number worth memorising. A trie over $n$ keys of
length at most $L$ has at most $nL + 1$ nodes, and each node holds a flag plus one
edge map. So total space is $O(nL)$ in the worst case but **$O(D)$ where $D$ is
the number of distinct prefixes actually present** — usually dramatically smaller
than $nL$ when keys share prefixes, and the saving grows as $n$ grows.

Compressed tries (radix trees, or Patricia tries) solve the space problem properly.
They collapse chains of nodes with a single child, storing a whole string
substring in one edge, giving $O(n)$ nodes total. The trade is that each step must
compare substrings, so symbol access is no longer $O(1)$ per character and the
implementation is considerably more involved.

## Core Operations and Invariants
The invariant is short and fully determines correctness:

> **Path invariant.** Following exactly the symbols of a key $k$ from the root
> reaches a node $N(k)$ if and only if $k$ is present in the collection. $k$ is a
> key if and only if $N(k)$.is_terminal is set.

The operations follow mechanically:

- **Insert($k$).** Walk the symbols of $k$ from the root, creating a child for each
  missing symbol. On the last symbol, set `is_terminal`. If the flag was already
  set, $k$ was already present and insertion is idempotent.
- **Contains($k$).** Walk; if a required child is missing, return false; otherwise
  return the `is_terminal` flag of the final node. The distinction matters — a
  trie walk can succeed for a string that is a prefix of a key without being a key.
- **StartsWith($p$).** Walk the symbols of $p$; success means some key extends $p$.
  Identical to `Contains` except the flag is never consulted, which is why it is
  the more fundamental primitive.
- **Delete($k$).** Walk to $N(k)$, clear the flag, then walk back pruning any node
  that is no longer terminal and has no children. **Pruning is what makes deletion
  reclaim space** instead of leaving orphaned nodes behind.
- **Lexicographic enumeration.** Recursive pre-order with children visited in
  sorted symbol order, emitting a key at each terminal node.

That last operation is where tries are structurally superior: the sorted order is
produced by traversal order, so there is nothing to sort and no comparison-based
$\Omega(k \log k)$ cost to account for.

## Correctness Argument
**Insert.** Prove the path invariant holds afterwards. *Setup:* before insertion
only previously inserted keys satisfy the invariant. *Step:* walking the symbols of
$k$ creates nodes only where an edge was missing, so no existing path is
disturbed — every previously inserted key still reaches the same node and keeps
its terminal flag. The final symbol's flag is set, so $N(k)$ exists and is
terminal, establishing $k$'s membership. *Termination:* $k$ has finitely many
symbols, and each step either follows an existing edge or creates one, so the walk
terminates.

**Contains.** If the walk fails at some symbol, then $N(k)$ does not exist, so by
the invariant $k$ is absent — the answer `false` is correct. If the walk succeeds,
$k$'s membership is exactly the flag value by the invariant, so the returned flag
is correct in both directions.

**Deletion.** Clearing the flag at $N(k)$ removes $k$ from the collection: the
invariant's second clause now fails for $k$. Pruning a node that is non-terminal
and childless is sound because such a node satisfies neither clause of the
invariant for any key — no key's path can pass through it, since a path passing
through a node must continue to a child and then to a terminal. So no key is
displaced by removing it, and the invariant holds for every remaining key.

**Lexicographic order.** Prove by induction on subtree depth. Fix a node and
assume each child subtree enumerates its keys in sorted order. The node's own key,
if terminal, is shorter than and a prefix of every key below it, so it comes first
in lexicographic order — this is the reason pre-order with the node emitted before
its children is correct rather than accidentally so. Then the children are visited
in increasing symbol order, and by hypothesis each contributes a sorted run, and
the runs are mutually ordered because their prefixes differ. Concatenating gives
a sorted run for the whole subtree. The root case is immediate.

## Cost Derivations

### Lookup is proportional to key length, not collection size
A lookup walks exactly $L$ symbols for a key of length $L$, doing one child
resolution per symbol. Fixed fan-out makes that $O(1)$ each, so lookup is $O(L)$
time and $O(1)$ extra space. The critical point: $L$ does not grow with $n$. A
hash table lookup is $O(1)$ in $L$ but $O(1)$ *expected* with an $O(n)$ worst
case; a trie is $O(L)$ with **no** worst case, because no hashing is involved.
There is nothing adversarial to defend against.

### The space derivation, and why the sharing is real
Count nodes by depth. Level $i$ contains at most $n$ nodes (one per key), but it
also contains at most $|\Sigma|^i$ nodes, where $\Sigma$ denotes the alphabet and
$|\Sigma|$ its size. The total node count is therefore bounded by the sum over all
depths of the smaller of those two quantities, written
$\sum_{i=0}^{L} \min(n, |\Sigma|^i)$, which is itself at most $nL+1$. In practice the sharing is
what makes this small: a trie over $n$ English words shares every common prefix,
so the distinct-prefix count $D$ is a fraction of $nL$ and grows sublinearly in
$n$ for a fixed vocabulary.

Comparing directly against a hash table storing the same keys: the hash table
needs $n$ entries each of $O(L + k)$ bytes for key length $L$ and payload size
$k$, so $O(nL + nk)$. The trie needs $D$ nodes each of $O(|\Sigma|)$ bytes for
fixed fan-out, so $O(D \cdot |\Sigma|)$. The trie is smaller precisely when
$D \cdot |\Sigma| \ll n(L + k)$, which is the common case for shared-prefix data
and emphatically not the case for random binary keys.

### Insert, delete, and the pruning cost
Insert walks $L$ symbols creating at most $L$ nodes: $O(L)$ time. Delete is
$O(L)$ to clear the flag, plus $O(L)$ for the pruning walk back up — still $O(L)$,
and it *reduces* space, which no other operation here does.

### Enumeration
Each node is visited once, so pre-order enumeration is $O(D + n)$ time: $D$ for
the nodes walked, $n$ for the keys emitted. There is no sort, so the absence of a
$k \log k$ term is structural rather than an omission.

### Comparison with a balanced search tree on identical queries
A balanced tree over the same keys gives $O(\log n)$ per membership test but
$O(k)$ per prefix query, because there is no structural correspondence between
tree edges and string prefixes. A trie gives $O(L)$ membership and $O(L)$ prefix.
For short keys and a small $n$ the tree wins on membership; for long keys or
many prefix queries the trie wins decisively, because it makes prefix queries the
same shape as membership queries.

## Limits

**Memory is the binding constraint, and fixed fan-out is its cause.** With 26-way
children over $n$ words, the nodes near the root are nearly full while nodes near
the leaves are nearly empty, so a large fraction of allocated child slots are
unused. Sparse child maps reclaim that space at the price of $O(|\Sigma|)$ lookup
— bounded, and in practice fine. Compressed tries reclaim it fully, reaching
$O(n)$ nodes, at the price of substring comparisons per step and a considerably
harder implementation. **There is no representation that is simultaneously
compact, $O(1)$ per symbol, and simple.** Choosing two of the three is the real
design decision.

**No space lower bound below the total key content is known in general.** Any
structure answering exact membership must distinguish the $2^L$ strings of length
$L$, so it needs $\Omega(L)$ bits in the worst case. But whether trie-like
prefix-sharing can be combined with hashing to beat $O(nL)$ space while keeping
$O(L)$ worst-case lookup is not settled, and the practical answers — minimal
perfect hashing for the static case, succinct dictionaries, monotone integer
search structures for numeric keys — each change some part of the problem rather
than resolving it generally. This is a genuine open area rather than a solved
optimum.

**Membership is asymptotically worse than hashing.** For a fixed-length key, a
hash table answers in $O(1)$ expected while a trie takes $O(L)$. The trie's
compensating advantages are different ones: deterministic worst-case behaviour,
prefix queries at the same cost, and free lexicographic order. If all you need is
exact membership and $L$ is large, hashing is genuinely faster and the trie's
other properties are not worth $L$ factor.

**Memory locality is poor for sparse representations.** Child nodes are allocated
as they are created and are not adjacent, so each symbol resolution is a
potential cache miss. A traversal over a large trie is latency-bound rather than
bandwidth-bound. Node layouts that pack children together, or the arena layouts
used in production tries, exist precisely to recover locality.

**Update cost is not free either.** Insert is $O(L)$ and cannot be short-circuited,
so a workload of many short-key inserts pays $L$ per insert where hashing pays
$O(1)$ expected. Combined with the space cost, the honest summary is that tries
win on prefix-heavy read workloads and lose on insert-heavy or membership-only
ones.

## Trade-offs and When to Use
- **Use a trie when** you need prefix search, autocomplete, or lexicographic order
  over a shared-prefix key set. Those capabilities are not available from a hash
  table at any price.
- **Use it for spell checking and dictionaries of any size.** The
  starts-with-query is the capability, not the membership cost.
- **Use fixed fan-out when** the alphabet is small and fixed, since the $O(1)$
  child lookup is worth more than the wasted slots.
- **Use sparse or compressed children when** the key set is large and mostly
  non-overlapping, or when memory is the binding budget. Accept the $O(|\Sigma|)$
  or substring-comparison cost and say so in the complexity notes.
- **Use a hash map instead when** only exact membership is needed and keys are
  long. $O(1)$ expected beats $O(L)$.
- **Use a balanced search tree instead when** you need ordered iteration with
  $O(\log n)$ per operation and only occasional prefix queries — provided you can
  live without prefix queries being cheap.
- **Consider the double-array trie or FST for read-mostly production workloads.**
  They keep $O(1)$-ish symbol lookup while cutting node memory substantially, at
  the cost of construction complexity and a less obvious implementation.