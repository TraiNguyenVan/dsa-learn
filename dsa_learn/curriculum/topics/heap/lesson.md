# Binary Heaps

## Overview
A binary heap is a complete binary tree, stored in a flat array, that satisfies a
single ordering relation between each node and its parent. Two variants exist and
differ only in the direction: a min-heap keeps every parent at or below its
children so the minimum is always at the root, a max-heap does the opposite. Every
result below applies to both with the comparison flipped.

What a heap is *not* is a sorted container. It gives you $O(1)$ access to one
extreme value and nothing else. The elements are in no particular order relative
to each other, and asking for the second-smallest element requires either a walk
down one subtree or a full $O(n)$ traversal. That narrowness is the design: every
operation the heap supports is optimal for what it supports, because it maintains
the minimum amount of information that makes those operations possible.

The complete-tree requirement is doing more work than it first appears. It is not
merely a space optimisation. A heap that were allowed to be sparse would lose the
array representation, and with it the ability to jump from an index to a parent or
child by arithmetic. Completeness is what makes "where does a value go when
inserted?" and "which node do I compare against?" $O(1)$ questions rather than
searches, and those constant-time index computations are precisely what make
sift-up and sift-down logarithmic instead of linear.

## Mechanics and Memory Layout
The representation is an array `a` of $n$ elements with the array index doubling
the tree node numbering. For a zero-based index $i$:

- parent is at index $\lfloor (i-1)/2 \rfloor$
- left child is at index $2i+1$
- right child is at index $2i+1$

**Why the flat array matters.** The heap occupies a single contiguous allocation,
so iteration is sequential in memory rather than pointer-chasing. There are no
node objects, no per-node pointers, and no allocation per element. For an array of
$10^6$ small integers a heap is about $4$ MB with perfect locality, which is
better than almost any node-based structure.

**Where a node can go.** Because the tree is complete, the children of index $i$
are only at $2i+1$ and $2i+2$. This bounds the height: the deepest possible
position has index at least $2^H$, and a complete tree of height $H$ holds at
least $2^H$ elements, so $H = \lfloor \log_2 n \rfloor$. The parent relation is
symmetric: an element inserted at the last free slot $n$ has its parent at
$(n-1)/2$, computable in one division.

**Top of the heap.** The extreme value is at index 0, with no search, because the
ordering invariant constrains only parent against children and index 0 is the only
node with no parent. This is why `peek` is $O(1)$ and `pop` needs no search to
locate its target — it must only restore the invariant, not find anything.

## Core Operations and Invariants
The ordering invariant is:

> **Heap invariant.** For every index $i$ with a parent at index $p$, either
> $a[p] \le a[2p+1]$ and $a[p] \le a[2p+2]$ (min-heap) or the reverse
> (max-heap).

Notice what this does *not* say. It imposes no relation between siblings, and none
between a node and its grandchildren beyond what the chain of parent-child
constraints implies. The invariant is local, and that is what makes local repair
sufficient.

- **Peek** returns `a[0]`. Trivially correct: index 0 is the root and the root is
  the minimum.
- **Push(x)** appends at index $n$ and increments $n$, then sifts up: while $x$
  is smaller than its parent, swap with the parent and continue. Only the path
  from the new node to the root can violate the invariant — no other position
  changed.
- **Pop()** saves `a[0]`, moves the last element to the root, decrements $n$, then
  sifts down: while the root has a smaller child, swap with that child and
  continue. Only the path from the root to the new root's leaf position can now
  violate the invariant.
- **Peek at the $k$-th smallest** is not supported. This is the invariant's cost,
  and it is real.

The asymmetry between push and pop is worth internalising. Push has exactly one
possible violation (with its parent) at exactly one known position. Pop creates
violations with up to two children, so the repair compares the children and moves
toward the smaller one — and that choice is what determines whether the result is
correct.

## Correctness Argument
**Push preserves the invariant.** Suppose the heap was valid and we append $x$ at
the last free slot. The only relation this can break is between $x$ and its new
parent, since every other parent-child pair is untouched and was already valid.
Sift-up moves $x$ upward while $x$ is smaller than its parent; each such move
restores the parent-child relation at the position vacated and breaks it only at
the new position, which is again between $x$ and its parent. The walk terminates
when $x$ reaches the root, where no parent exists, or when $x$ is at or above its
parent, which means that relation is satisfied. At termination the only possibly
violated relation is satisfied, and all others are untouched and were valid. So
the heap is valid. The element count is correct by construction, and the new
element is present, so the operation is correct.

**Pop returns the minimum and preserves the invariant.** By the invariant,
`a[0]` is at most as large as every element — reaching index 0 from any index
follows a chain of parent-child relations each of which does not increase the
value. So `a[0]` is the minimum and returning it is correct.

For the repair: after moving the last element $y$ to index 0, the only relations
possibly broken are between $y$ and its two children. Sift-down compares them and
swaps $y$ with the smaller child $c$ when $y > c$. That swap restores the
$y$-versus-$c$ relation at index 0 and creates exactly one possibly-broken
relation, between $y$ and $c$'s children. The invariant continues to hold. The walk
terminates when $y$ has no child, or when $y$ is at or below both children. At
termination all relations involving $y$ hold, and all others are untouched and were
valid. So the heap is valid.

Note that choosing the smaller child is *necessary*, not incidental: swapping with
the larger child would leave a smaller sibling above $y$ and re-break the relation
just repaired. That is why sift-down compares two children and why the heap
invariant constrains only parent against children.

**Termination.** Both sifts move strictly toward the root (up) or strictly toward
a leaf (down). The height is $\lfloor \log_2 n \rfloor$, so each walk is
$\lfloor \log_2 n \rfloor$ steps at most.

## Cost Derivations

### Percolation is logarithmic because height is logarithmic
Let $n$ denote the element count and $H$ the height. A complete binary tree
satisfies $2^H \le n < 2^{H+1}$ — level $i$ holds at most $2^i$ nodes — so
$H = \lfloor \log_2 n \rfloor$, where $\log_2$ denotes the base-2 logarithm: the
unique real $e$ with $2^e = n$. Only the base matters up to a constant factor.

Sift-up and sift-down each walk one path from a leaf to the root or vice versa.
Each step is $O(1)$: compute the parent or child index by arithmetic, compare, and
swap. A path is at most $H$ steps, so both operations are $O(H) = O(\log n)$ time
with $O(1)$ auxiliary space. **This is the whole derivation**, and it is the same
argument as the balanced-tree bound: cost equals height, and height is
logarithmic because a binary tree of height $H$ holds exponentially many nodes.

Note that the base of the logarithm is genuinely irrelevant to the asymptotic
class, since $\log_b n = \log_2 n / \log_2 b$ for any fixed base $b > 1$.

### The operation costs, stated precisely
- **Peek** — $O(1)$ time. One array read. Optimal, since any structure able to
  report an extreme must at least look.
- **Push** — $O(\log n)$ time, $O(1)$ auxiliary. Amortised still $O(\log n)$; no
  resizing is involved because the caller-sized array is the norm.
- **Pop** — $O(\log n)$ time, $O(1)$ auxiliary. Identical structure to push with
  the direction reversed.
- **Build from an unsorted array** — $O(n)$, not $O(n \log n)$. Repeated push would
  cost $O(n \log n)$, but a single bottom-up heapify sifts each internal node down.
  There are $\lfloor n/2 \rfloor$ internal nodes, and sifting node at height $h$
  costs $O(h)$. Summing $O(h)$ over the internal nodes: nodes at height $h$ number
  at most $n/2^{h+1}$, so the total is
  $\sum_{h=1}^{\log n} O(h) \cdot O(n / 2^{h+1}) = O(n)$.
  The geometric factor $2^{-h}$ dominates the linear factor $h$, and the sum
  converges. **This is why you heapify rather than push repeatedly**, and the
  derivation is the most useful piece of amortisation in this topic.

### Repeated pop
$O(n)$ pops at $O(\log n)$ each is $O(n \log n)$, which is the same as sorting.
This is the precise sense in which heapsort is "a sort": the heap machinery
produces keys in order at exactly the comparison-sort cost, with no auxiliary array.

### The $k$-th smallest query
Returning the $k$-th smallest element requires a breadth-first descent to depth
$k$ and taking the $k$-th node visited, which is $O(k)$ — far worse than $O(1)$ and
unbounded in $n$ for $k = n$. That is why heaps are paired with a heap-sort to
answer selection queries: build once in $O(n)$, then answer each in $O(k)$.

### Bounds outside the comparison model
Every logarithmic bound above is a statement about *comparison* algorithms, where
the only permitted way to learn the relative order of two priorities is to compare
them. Change the permitted operations and the bound changes, which is why
"extraction is Omega(log n)" is not a law of nature.

For priorities drawn from a bounded universe of size $U$, two options remove the
logarithm:

- **Bucket or radix sort.** Distribute elements into $U$ buckets in $O(n)$ time,
  then sort each bucket. Cost is $O(n + U)$ — linear in the input when the universe
  is manageable — at the price of $O(U)$ space.
- **Monotone priority structures.** Van Emde Boas and y-fast tries answer
  predecessor, successor and membership in $O(\log \log U)$ time using $O(U)$
  space, beating $\log n$ outright.

The cost is always space, and sometimes it is a lot of it: $U$ must fit in memory.
So the honest comparison is $\log n$ time against $O(1)$ space, versus $O(1)$ or
$O(\log\log U)$ time against $O(U)$ space. Neither dominates, and which to choose
depends on whether the priority range is known, bounded, and affordable. This is
the same pattern as the $\log\log U$ versus $\log N$ trade in trees, and it is why
a claim of "logarithmic extraction" must always name its model.

### Space
The array is $O(n)$ with one element per slot and no per-node overhead. That is
strictly smaller than a binary tree of the same elements, which pays 3 pointers per
node, and much smaller than a node-based heap of 32-bit keys where the pointer
overhead can exceed the payload.

## Limits

**The heap gives constant-time access to exactly one value.** Everything else is
paid for. `$k$-th smallest` is $O(k)$; `contains` on an arbitrary value is $O(n)$,
because the heap invariant supports no range or membership test. So a heap cannot
replace a sorted container when the problem needs to locate arbitrary values or
iterate in sorted order without fully consuming the heap.

**The ordering invariant gives no global order, so no comparison lower bound
applies.** In the comparison model, producing all $n$ keys in sorted order
requires $\Omega(n \log n)$ because $n!$ orderings must be distinguished by a
decision tree with at most $2^k$ leaves at depth $k$. Heapsort is therefore
optimal *as a sorting algorithm*, and the heap's contribution is not to beat that
bound but to achieve it while also supporting $O(1)$ `peek` and $O(\log n)$
insert and delete. **No structure does both** — this is the real trade.

**The constant factor is poor for sorting, which is why introsort switches away.**
Heapsort does $O(n \log n)$ comparisons but its memory access pattern is the
worst of any comparison sort: the array is traversed out of order, so each
comparison typically touches a distant cache line, and the sift-down path jumps by
roughly $2^{-h}$ of the array each step. Introsort therefore runs quicksort while
recursion stays shallow and switches to heapsort at the depth limit, getting
quicksort's locality with heapsort's guaranteed bound. The lesson: having the
optimal worst-case bound is not the same as being the fastest implementation.

**Merge cost is unbounded.** Merging two arbitrary iterators is $O(1)$ for a list
but $O(n)$ for a heap, because there is no cheap way to find the minimum of the
second heap without restructuring. So heaps are not composable — the classic
"sort $k$ sorted streams by merging" problem prefers $k$-way balanced trees or a
loser tree precisely to avoid this.

**Concurrency is unsolved in practice.** Lock-free heaps are known but are
notoriously subtle, since a single logical operation moves an element through
several positions. Practical concurrent priority queues are usually a
lock-protected array with batched updates, which reintroduces contention.

**Where the bound does not apply.** Lower bounds depend on the model. For
fixed-width integer priorities, radix, bucket and van Emde Boas style
per-priority structures beat $\log n$ — bucket sort is linear — at the cost of
space proportional to the priority range or to $n$ plus the range. Comparison
lower bounds are about comparison models, not about priority queues in general.

## Trade-offs and When to Use
- **Use a heap when** the problem is "which is the next one out" over a changing
  set: Dijkstra's frontier, Prim's frontier, top-$k$ selection, merging $k$ sorted
  streams, scheduling by priority, keeping a running median.
- **Use it over a sorted array when** insertions and deletions are frequent. A
  sorted array gives $O(1)$ `peek` too, but $O(n)$ insert, so the two are
  distinguished by write frequency rather than by read cost.
- **Heapify in bulk rather than pushing.** The derivation above is a $O(n)$
  speedup on building from unsorted input and it is the single most useful thing
  to remember here.
- **Reach for an ordered tree when** you need iteration in sorted order without
  consuming the structure. A heap cannot produce a partial sorted prefix cheaply;
  a $k$-way merge of sorted sublists usually beats it.
- **Reach for a sorted array when** the key set is fixed after construction. If
  nothing changes, sorting once and scanning beats any dynamic priority queue on
  both time and constants.
- **Mind the capacity convention in C++.** `std::push_heap` and
  `std::make_heap` operate on a random-access range in place, with the container
  itself holding the data — so growth must be arranged by the caller, and
  `pop_heap` leaves the minimum at the back rather than removing it, which is the
  single most common source of confusion with this API.