# Binary Search

## Overview
Binary search answers *where a value sits in a sorted sequence* without reading
the sequence end to end. The idea is not clever on its own: if you have a
sorted row and you compare the target against the middle element, one of two
things is true. Either the middle element is the target, or the target is
strictly to its left, or it is strictly to its right. In the latter two cases
you have just eliminated half the remaining positions without inspecting any of
them. Repeating that argument is what turns a problem that needs $N$
comparisons into one that needs $\lceil \log_2(N+1) \rceil$.

The technique is often presented as a loop, but the loop is not the point. What
matters is the *invariant*: at every iteration the answer, if it exists, lies
strictly inside the current window. Everything else — choosing the midpoint,
shrinking the window, deciding when to stop — follows from defending that
invariant. A learner who can state the invariant and explain why each branch
preserves it can write binary search correctly from memory; a learner who has
memorised the code will get it wrong the first time the boundary case is a
single-element array.

## Memory Anatomy
Binary search performs no structural mutation, so it has no dedicated memory
layout. What matters instead is the *probe sequence* and the cost of one probe.

In a contiguous array, reading `a[mid]` is a single address computation
`base + mid * sizeof(element)`. Two hardware facts follow, and they are why the
technique is cache-friendly in practice:

- **Contiguity.** The midpoint of the current window is a real memory address,
  computed with one multiply and one add. There is no pointer chase.
- **Locality of the next probe.** After computing `mid` and comparing, the next
  probe is confined to either `[left, mid-1]` or `[mid+1, right]`. On a cache-
  friendly stride this tends to reuse lines already resident, so the constant
  factor is small even though the asymptotic count is logarithmic.

The memory cost is $O(1)$ auxiliary space: the window is fully described by the
three scalars `left`, `mid`, `right`. This is worth contrasting with a
"binary search" written over a linked list, where moving to `mid` costs $O(N)$
probes, so the total becomes $O(N \log N)$ — worse than a single linear scan.
**Same algorithm, different storage, different complexity.** That contrast is
the most transferable lesson in this topic.

## Core Operations and Invariants
The canonical form maintains a half-open window `[lo, hi)` with the loop
condition `lo < hi`:

1. **Probe.** `mid = lo + (hi - lo) / 2`.
2. **Hit.** If `a[mid] == target`, return `mid`.
3. **Target above.** If `a[mid] < target`, set `lo = mid + 1`.
4. **Target below.** If `a[mid] > target`, set `hi = mid`.

The window invariant, stated precisely:

> **Invariant.** At the top of every iteration, if the target occurs in `a`, then
> it occurs at some index in `[lo, hi)`.

The loop condition `lo < hi` is the termination test. The exit condition
`lo == hi` means the window is empty, so by the invariant the target does not
occur in `a` at all. **Absence is proved, not merely unobserved** — that
distinction is the whole reason binary search can be trusted to answer "not
found" correctly.

Two boundary conventions must be held consistently. Mixing a half-open window
with a closed one produces off-by-one errors that only appear at array edges.
This lesson uses half-open throughout; a closed-window variant
(`lo <= hi`, `hi = mid - 1`) is equally correct but must be used wholesale.

There are also two standard loop shapes you will meet in interviews and in
library code. The *inclusive* variant tests `lo <= hi` and computes
`mid = lo + (hi - lo) / 2`, which is written to avoid overflow in languages with
signed fixed-width integers. The *exclusive* variant above needs no such care
because `lo + (hi - lo) / 2` and `lo + (hi + lo) / 2` cannot overflow when
`lo < hi` and both are non-negative. Both are $O(\log N)$; choose one and stay
with it.

## Correctness Argument
We prove the loop returns the correct index when the target is present, and
correctly reports absence when it is not.

**Setup.** Before the first iteration the window is `[0, N)`, which is the whole
array. The invariant "if the target occurs in `a`, it occurs in `[lo, hi)`"
holds trivially.

**Preservation.** Assume the invariant holds at the top of an iteration. We
show it holds at the top of the next.

- *Case `a[mid] == target`.* We return `mid`, which is correct.
- *Case `a[mid] < target`.* Because `a` is sorted non-decreasingly, for every
  index `i <= mid` we have `a[i] <= a[mid] < target`. So no index at or left of
  `mid` holds the target. Any occurrence must lie at an index greater than
  `mid`. Setting `lo = mid + 1` yields window `[mid+1, hi)`, which still
  contains every possible occurrence. Invariant preserved.
- *Case `a[mid] > target`.* Symmetrically, for every index `i >= mid` we have
  `a[i] >= a[mid] > target`. So no index at or right of `mid` holds the target.
  Any occurrence lies strictly below `mid`. Setting `hi = mid` yields window
  `[lo, mid)`, which still contains every possible occurrence. Invariant
  preserved.

Each branch discards only indices that are *provably* unable to hold the
target. This is what makes the algorithm correct rather than merely fast: the
discarding is justified, not heuristic.

**Progress.** Every iteration sets `lo = mid + 1 > lo` or `hi = mid < hi`, and
the interval length `hi - lo` strictly decreases. Since it is a non-negative
integer, the loop terminates.

**Termination and conclusion.** The loop exits with `lo == hi`, so `[lo, hi)` is
empty. By the invariant, no occurrence of the target was ever in the window;
since the window only ever shrank from the full array, the target does not occur
in `a`. The algorithm therefore reports absence correctly.

**Note on duplicates.** This proof returns *an* index holding the target, not
the leftmost one. Returning the leftmost occurrence requires a second descent:
after a hit, remember `mid`, then re-search `[lo, mid)` for the same value.

## Cost Derivations

### Halving: why the loop runs logarithmically many times
Let $N$ denote the initial array length and let $W_t$ be the window length after
$t$ iterations, where $W_0 = N$.

Each iteration sets `mid` to the middle element and then keeps a window of at
most

$$
W_{t+1} = \left\lceil \frac{W_t}{2} \right\rceil
$$

because the larger of the two halves produced by splitting an interval of length
$W_t$ at its midpoint has size $\lceil W_t / 2 \rceil$.

Unrolling, after $k$ iterations the window is at most

$$
W_k = \left\lceil \frac{N}{2^k} \right\rceil
$$

The loop stops when the window is empty. A window of length $m$ is non-empty
while $m \ge 1$, so the loop stops at the smallest $k$ for which
$\lceil N / 2^k \rceil = 0$. This is the smallest $k$ such that

$$
N < 2^k, \quad \text{equivalently} \quad 2^k > N
$$

where $2^k$ here means "two raised to the power $k$". Writing
$k = \lceil \log_2(N+1) \rceil$ satisfies this for every $N \ge 1$, since
$2^k \ge N+1 > N$.

So the exact worst-case comparison count is $\lceil \log_2 (N+1) \rceil$. To see
why this is a logarithm and not a constant: increasing $k$ by one halves the
remaining work, so the number of doublings needed to exhaust $N$ items is the
number of times you can halve before reaching 1. Doubling and halving are
inverse operations on exponents, hence $\log$.

**This is where `\log` first appears.** In this lesson $\log_2 x$ denotes the
base-2 logarithm: the unique real number $e$ such that $2^e = x$. Only the base
matters up to a constant factor, since $\log_b x = \log_2 x / \log_2 b$, so
$\log_b N$ and $\log_2 N$ are within a constant factor of each other for any
fixed base $b > 1$.

### Comparisons
Each iteration performs exactly one comparison of an element against the
target, plus at most two integer comparisons to select the branch. The integer
comparisons are constant-time register operations; the element comparison is a
memory read at cost $O(1)$ on contiguous storage. Hence

- **Time:** $O(\log N)$ in the worst case, which is also the average case.
- **Best case:** $O(1)$ — the target sits at the first midpoint probed.
- **Space:** $O(1)$ auxiliary. Only `lo`, `mid`, `hi` are maintained.

### Why the best case is not amortised away
For $n$ independent searches on the same array of length $N$, the expected
number of comparisons is $\sum_{k=1}^{K} k/2^k$, where $K$ is the depth above and
the summation runs over every possible depth, weighted by the probability of
halting there. That series converges to 2. So a *random* target is found in a
constant expected number of probes. The $O(\log N)$ bound is a *worst-case*
guarantee, and it is the one to rely on: an adversary who controls the target
can force the deepest descent on every single query.

### Linear Scan Comparison
Linear search performs $N/2$ comparisons on average and $N$ in the worst case.
The ratio is $(N/2) / \log_2 N$, which grows without bound; for $N = 10^6$ that
is roughly $50{,}000$ comparisons versus about 20. The crossover point where
linear search actually wins for tiny inputs is $N \le 8$ or so — worth knowing
if a micro-benchmark ever surprises you.

## Limits

**No asymptotically faster search is known in the comparison model.** This is a
precise statement and the precise model matters. In the *comparison decision
tree* model, an algorithm may only learn about the relative order of keys by
comparing two of them, and the keys are assumed distinct. A correct search
algorithm must distinguish among $N$ possible outcomes, so its worst-case
decision tree must have at least $N$ leaves, and a binary tree of depth $k$ has
at most $2^k$ leaves. Therefore $k \ge \lceil \log_2 N \rceil$.
**Binary search attains the bound**, so within this model it is
optimal — not merely good.

Here $\Omega(g(n))$ denotes the asymptotic lower-bound notation: a function that
grows at least as fast as $g(n)$. The statement is therefore: no comparison-based
search does better than $\Omega(\log N)$ in the worst case.

**Where binary search genuinely loses.** The lower bound above assumes the input
is already sorted and stored contiguously. Break either assumption and the bound
does not transfer:

- *Unsorted input.* Sorting first costs $\Omega(N \log N)$ in the comparison
  model, which dominates the $\log N$ search. Searching a small number of times
  over unsorted data is better served by a hash table at $O(1)$ average.
- *Non-contiguous storage.* Over a linked list, reaching `mid` costs $O(N)$
  probes, so total cost is $O(N \log N)$ — strictly worse than a linear scan.
  The algorithm's power comes from $O(1)$ random access, not from the halving
  argument alone. This is the single most common exam-style trap.
- *Need for all matches or a rank.* Returning the leftmost duplicate, counting
  occurrences, or answering "how many elements are less than $x$" turns the
  single-shot search into a boundary descent. Those cost $O(\log N + k)$ for
  $k$ results, and $O(\log N)$ plus $O(k)$ is still logarithmic *plus* output,
  which is optimal — the $k$ is unavoidable.

**What is unknown.** Whether a non-comparison model can beat $\log N$ is not an
open question, because richer models change the problem rather than solving it:
if you may index a precomputed table, a dictionary lookup answers in $O(1)$.
The genuine open and practically important questions are different ones —
whether hash-based lookup can be made deterministic worst-case $O(1)$ (this is
not known in general, and it is the motivation for structures such as cuckoo
hashing), and what the optimal bounds are for hardware-aware search under
machine-word constraints.

## Trade-offs and When to Use
- **Use binary search when** the data is sorted, immutable, and queried often.
  Many queries over stable data amortise any one-time build cost many times
  over.
- **Use it for boundaries, not just hits.** The `lower_bound` / `upper_bound`
  pattern — find the first index at or after a value — is the genuinely powerful
  form. It answers "count of elements less than $x$" and "insert position" in
  the same $O(\log N)$ shape.
- **Prefer a hash table when** the order of keys carries no meaning and only
  exact-match lookups are needed. $O(1)$ average beats $O(\log N)$ and there is
  no sorting cost to pay.
- **Prefer a sort plus one scan when** you need almost every element in sorted
  order anyway. Paying $O(N \log N)$ then reading everything out is cheaper than
  $N$ separate $O(\log N)$ searches whenever you touch a constant fraction of
  the data.
- **Avoid it on small inputs.** For $N$ below roughly 8–16 the constant factors
  dominate and a linear scan is competitive or faster. This is why standard
  library sorts switch to insertion sort for small ranges.