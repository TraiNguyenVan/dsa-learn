# Two Pointers Technique

## Overview
The Two Pointers technique is a foundational algorithmic optimization pattern that transforms quadratic $O(N^2)$ brute-force nested loops into efficient linear $O(N)$ single-pass solutions.

By utilizing two distinct index pointers that navigate an ordered collection (either converging towards each other from opposite ends or moving in the same direction at varying rates), learners can systematically rule out suboptimal search spaces without redundant comparisons.

## Memory Anatomy & Pointer Archetypes
The Two Pointers pattern introduces zero auxiliary heap allocation ($O(1)$ space):
1. **Opposite-Direction Pointers (Convergence)**:
   - `left` begins at index $0$; `right` begins at $N - 1$.
   - Based on a monotonic condition (e.g. `nums[left] + nums[right] < target`), one pointer increments or decrements.
   - Eliminates entire rows/columns of combinations in a sorted space.
2. **Same-Direction Pointers (Fast & Slow / Tortoise & Hare)**:
   - Both pointers start at index $0$.
   - `fast` advances at double speed or leads exploration; `slow` records valid placements or lags behind.
   - Used for in-place array deduplication, partitioning, or linked list cycle detection (Floyd's algorithm).
3. **Sliding Window Variant**:
   - Pointers delimit the boundaries of a dynamic continuous range $[L, R]$ upholding a state constraint.

## Core Operations & Invariants
- **Monotonicity Requirement**: The collection must exhibit sorted or monotonic properties for opposite-direction pointers to make deterministic directional decisions.
- **Convergence Invariant**: The distance `right - left` strictly decreases on each step, guaranteeing termination in at most $N$ operations.
- **Partitioning Invariant (Quickselect / Dutch National Flag)**: In-place swaps maintain segmented regions (e.g., `< pivot`, `== pivot`, `> pivot`). The boundary between the finalised and unprocessed regions never moves backwards, so every element is examined and placed at most once per pass.
- **Cycle-Detection Invariant (Floyd)**: `slow` advances one node per step, `fast` advances two. Both remain in the same component, so if a cycle exists they eventually meet inside it.

## Correctness Argument
The whole technique rests on one move: **discarding an index by proof, not by
heuristic**. Each pointer move claims that a whole set of candidate solutions
cannot contain an answer. If the claim is valid the algorithm stays correct; if
it is not, the algorithm silently returns a wrong answer while still looking
clean. So the proof obligation is per-move.

**Opposite-end convergence (sorted two-sum).** Maintain the invariant:

> **Invariant.** If a valid pair $(i, j)$ with $i < j$ exists in the original
> array, then either it has already been returned, or $i \ge$ `left` and
> $j \le$ `right`.

*Setup.* `left = 0`, `right = N-1`. The invariant holds because every pair's
indices lie inside the full range.

*Case `sum < target`.* Let $s = a[\text{left}] + a[\text{right}]$. For any valid
pair $(i,j)$ still inside the window, since $i \ge$ `left` and $a$ is sorted,
$a[i] \ge a[\text{left}]$, and since $j \le$ `right`, $a[j] \le a[\text{right}]$.
Therefore $a[i] + a[j] \le s <$ target, so **no pair using index `left` can be
valid**. Every remaining pair has $i >$ `left`. Setting `left = left + 1`
preserves the invariant.

*Case `sum > target`.* Symmetrically, $a[i] + a[j] \ge s >$ target for every
remaining pair, so **no pair using index `right` can be valid**, and setting
`right = right - 1` preserves the invariant.

*Termination.* `left - right` strictly decreases each iteration, so the loop ends
with `left >= right`. No pair with $i < j$ remains inside the window, so by the
invariant no valid pair was ever discarded and none remains unexamined. Returning
"no solution" is therefore correct — absence is proved, not merely unobserved.

**Same-direction (partition / dedup).** Maintain:

> **Invariant.** Everything strictly before `slow` is finalised output;
> everything at or after the scan pointer is unprocessed.

Moving `slow` forward only after an element has been written to its final
position keeps the two regions disjoint, so no element is duplicated or dropped.

**Floyd's cycle detection.** If `slow` advances one node per step and `fast`
advances two, and both are in the same component, then within at most
$O(T)$ steps they coincide, where $T$ denotes the tail length. The reason
is arithmetic: once `fast` has entered the cycle, it gains one node per step
on `slow` in relative terms, and keeps gaining thereafter, so it must close
a gap of at most the cycle length. If instead they never meet, no
cycle is reachable from `head`.

## Cost Derivations

### Convergence: N steps, not N squared
At each iteration exactly one pointer moves by one position and the gap
$W = \text{right} - \text{left}$ strictly decreases. It starts at $N-1$ and the
loop runs while $W \ge 0$, so the loop body executes at most $N$ times. Each
execution is $O(1)$: two index reads, one add, one comparison. Total time is
therefore $O(N)$.

The saving is exactly the factor claimed: brute force enumerates $\binom{N}{2}$
pairs in $O(N^2)$; convergence examines $N$ sums, each of which *rules out an
entire row and column* of the pair matrix at once. The sorted order is what makes
that elimination sound — the whole proof is one monotonicity step.

### The sort precondition can dominate the saving
Convergence is $O(N)$ — but only if the input is *already* sorted. Sorting costs
$\Omega(N \log N)$ in the comparison model, where $\Omega(g(n))$ denotes the
asymptotic lower-bound notation, a function growing at least as fast as $g(n)$,
and $\log$ denotes a logarithm whose base is irrelevant up to a constant factor. So an end-to-end solution on unsorted
input is $\Theta(N \log N)$, dominated by the sort, not by the technique. The
technique is worth it when the input is already ordered, when the sort is
amortised across many queries over the same data, or when the problem also needs
sorted output anyway.

### Same-direction fast/slow
`slow` advances one step per iteration, so it makes at most $N$ moves and the
loop runs $O(N)$ times. Each iteration is $O(1)$. Total $O(N)$ time, $O(1)$ extra
space. For Floyd's algorithm the iteration count is bounded by the tail length
plus the cycle length, both at most $N$.

### Windowed variants
When both ends move and neither retreats, total movement is bounded by the sum of
both pointers' travel. Each pointer moves at most $N$ times over the whole scan,
so the total is $O(2N) = O(N)$ amortised across the entire window sweep, even
though a single window recomputation may itself be $O($window size$)$. This
amortisation is what makes sliding windows linear rather than quadratic.

## Limits

**No sub-linear pair search in the comparison model.** The $\Omega(N)$ bound is
tight. Finding a pair summing to a target requires $\Omega(N)$ in the worst case
for sorted input: with all
elements distinct and the target chosen adversarially, an algorithm that has
inspected only $k$ elements cannot distinguish the $k$ values it saw from
$k$ alternatives, so it cannot guarantee success until it has seen almost all of
them. Two pointers *attains* the bound.

**Unsorted input removes the technique entirely.** The discard proof depends on
monotonicity: "sum too small, so drop the left index" is only valid because every
other left index gives an equal-or-smaller sum. Without sortedness there is no
valid move, and the technique degenerates to $O(N^2)$ enumeration. Where indices
matter (the problem returns original indices) sorting also invalidates them, and
the correct fix is to sort *index pairs* by value while carrying the original
positions — the technique survives, the indices are preserved.

**The technique's reach is narrow, and that is the point.** Two pointers solves
problems whose answer is characterisable by a monotone predicate on the window:
is the sum too small, is the window valid, is the substring a palindrome. It
cannot solve problems needing non-monotone reasoning — most subset-sum, most
general matching — because there is no rule that eliminates a whole region at
once. Reaching for it when the predicate is not monotone produces wrong answers
that pass casual testing.

**Where the linear bound is not tight.** The convergence count is worst-case
tight, but on structured input it can be far cheaper: a run of equal values, or
an answer found on the first comparison, terminates in $O(1)$. And the real limit
is usually memory traffic rather than comparisons — $O(N)$ random index accesses
across a large array is bandwidth-bound well before it is comparison-bound.

##

## Trade-offs & When to Use
- **Use Two Pointers when**: The array or list is sorted (or can be sorted in $O(N \log N)$), the goal is finding pairs/triplets, reversing elements in place, or partitioning elements with $O(1)$ space.
- **Avoid Two Pointers when**: The data is unsorted and sorting destroys original indices required by the problem, or when elements cannot be compared monotonically. A non-monotone predicate — anything whose truth does not partition the candidate set cleanly — makes every pointer move unsound.
- **The constant-factor caveat**: the technique allocates nothing, so its $O(1)$ space is a genuine advantage over hashing a window into a map when the window is small and the predicate is cheap.
