# Sliding Window

## Overview
A sliding window examines a contiguous range of the input while allowing that
range to move. Both ends advance and neither ever retreats, so the total work is
proportional to how far the window travels rather than to how many windows could
exist. That single constraint is what turns a family of problems from quadratic
into linear.

The technique answers questions of the form: *among all subarrays satisfying some
property, what is the largest?* Anagrams of a target, longest substring without
repeats, minimum-length covering subarray, longest subarray with sum at most a
limit. The unifying feature is that validity is a property of the window's
*contents* and behaves monotonically as the window grows.

Two different monotonicities lead to two different shapes of solution, and
confusing them is the most common source of a wrong answer:

- **Shrinkable** property. Valid implies that any sub-window is valid — every
  subarray of a valid window is valid. Longest-substring-without-duplicates is the
  archetype. Here you grow the right edge until the window breaks, then shrink
  from the left until it is valid again.
- **Growable** property. Invalid implies that any larger window is also invalid —
  every super-window of an invalid window is invalid. Minimum-length covering
  subarray is the archetype. Here you grow the right edge, and whenever the window
  becomes valid you record the answer and shrink.

The choice between them is not stylistic. Using a shrink-when-valid pattern on a
growable property returns a stale answer that still passes casual testing.

## Mechanics and Memory Layout
A window is two indices $L$ and $R$ delimiting the half-open range $[L, R)$.
Windows differ from containers: nothing is copied, nothing is stored separately,
and the structure has no fixed capacity. The state that makes windowing cheap is
the *aggregate* maintained over the current contents.

That aggregate is the design decision. Three options:

- **Incremental counter or frequency table.** Each entering or leaving element
  updates the aggregate in $O(1)$. This is the fast option: the whole algorithm is
  $O(N)$ with no rescans.
- **Segment tree or BIT.** Updates and queries cost $O(\log N)$, and the aggregate
  may be a range sum, range minimum, or range maximum. Total $O(N \log N)$.
- **Rescan on demand.** Recompute the aggregate from scratch whenever the window
  changes. Each change is $O($window size$)$, giving $O(N \cdot W)$ overall.

Rescanning is correct and is almost always a mistake; it is nonetheless what a
naive first attempt does, and it is the reason so many windowing problems are
submitted as quadratic. Before writing any windowing solution, decide explicitly
which of the three aggregates you are using.

Frequency tables are worth singling out because the alphabet usually bounds them.
Over a byte-valued input the table has a fixed 256 entries regardless of $N$, so it
is $O(1)$ space. Over arbitrary values it is $O(\Sigma)$ where $\Sigma$ is the
alphabet size, and the correct choice there is usually to hash — accepting an
$O(1)$ *expected* cost instead of an $O(\Sigma)$ worst case when $\Sigma$ is large.

## Core Operations and Invariants
The loop shape is fixed; only the predicate and the aggregate vary.

1. **Extend.** Increment $R$, add `input[R]` to the aggregate, mark it active.
2. **Contract.** While the window is in a bad state, remove `input[L]` from the
   aggregate, unmark it, and increment $L$.
3. **Record.** Optionally update the answer.

The invariant is the part that must be stated and defended:

> **Window invariant.** At the top of every iteration, the aggregate describes
> exactly the contents of $[L, R)$, and $L$ never decreases over the run.

The second clause is what delivers linearity. A window that had to retreat would
make the total movement potentially $N^2$; because $L$ only advances, the sum of
all movements is $(R - R_0) + (L - L_0) \le 2N$.

Two subtleties that separate correct implementations from nearly-correct ones:

- **Answer timing.** In the shrink-when-valid pattern the window is largest
  *immediately before* the contraction loop runs, not after. Recording the length
  after shrinking silently reports a smaller-than-optimal window.
- **Window bounds.** `$L < R$ (or `<= R`) must be enforced before removing
  `input[L]`, or an empty input reads out of bounds. This is the most common
  crash in windowing code.

## Correctness Argument
**Shrink-when-valid (longest valid window).**

> **Invariant.** At the end of each outer iteration, the window $[L, R)$ is the
> *largest* valid window ending at position $R-1$.

*Setup.* Before the first iteration the invariant holds vacuously for $R = -1$.

*Step.* Assume the invariant holds after iteration $R-1$, so $[L_{prev}, R-1)$ is
the largest valid window ending at $R-2$. Extend to include `input[R-1]`, which
may make the window invalid. Then contract: while invalid, increment $L$. Each
increment discards a left endpoint that has just been *proved* invalid — for the
shrinkable property, an invalid window has no valid sub-window, so shrinking
cannot make it valid, which means termination is guaranteed and the loop cannot
shrink past the point of validity. When the loop stops, $[L, R-1)$ is valid, and
every window ending at $R-1$ that starts before $L$ was rejected at the moment we
passed it.

Why does that rejection persist? Any window $[L', R-1)$ with $L' < L$ contains
$[L'', R-1)$ for some rejected $L''$, and super-windows of an invalid window are
invalid for the shrinkable property. So all of them are invalid. Hence $[L, R-1)$
is the largest valid window ending at $R-1$. Invariant preserved.

*Termination.* $R$ advances monotonically over $N$ positions, so the outer loop
ends. Taking the maximum recorded length over all $R$ yields the globally longest
valid window, by the invariant.

**Growable property (minimum covering window).** The argument is mirrored and
worth stating because it is where intuition misleads. Here invalid windows have
invalid super-windows, so once a window is invalid, growing only makes it worse.
The loop records the answer *every* time the window becomes valid and then
contracts — because for a fixed $R$, the earliest it can be valid is at the
smallest $L$, and contracting finds that smallest valid $L$. So each iteration
records the minimum-length covering window ending at $R$, and the global minimum
follows.

## Cost Derivations

### The total-movement bound
This is the whole derivation, and it is short. $R$ starts at $R_0$ and ends at
$R_f \le N$, moving forward once per outer iteration: $R_f - R_0$ steps. $L$ starts
at $L_0$ and, by the invariant, never decreases, ending at $L_f \le N$: $L_f - L_0$
steps. Total movement is the sum, at most $2N$.

Each movement costs $O(1)$ — one increment plus one aggregate update. So total time
is $O(2N) = O(N)$ *provided the aggregate is incrementally updatable*. With a
$O(\log N)$ aggregate the bound becomes $O(N \log N)$; with a rescan it becomes
$O(N \cdot W)$ where $W$ is the maximum window width, which is the quadratic
blow-up this technique exists to avoid.

### Why the naive scan is quadratic
Counting subarrays directly visits every one of the $N(N+1)/2$ subarrays, and
each validity check costs $O(1)$ to $O(W)$. Windowing visits at most $N$ *positions*
of $R$, and reuses the previous window's aggregate instead of rebuilding it. The
saving is not a constant factor — it is the difference between enumerating $N^2$
candidate windows and maintaining $N$ of them.

### The amortised argument, stated plainly
The aggregate is updated twice per element on average: once when the element
enters at $R$, and once when it leaves at $L$. That is $2N$ updates total,
regardless of how the window size fluctuates. A window can shrink to size 1 and
grow back to size $N$ repeatedly without changing the total, because growth is
charged to advancing $R$ and shrinkage to advancing $L$.

### Frequency-table space
Over an alphabet of size $\Sigma$ the table is $O(\Sigma)$. For byte-valued input
$\Sigma = 256$ and the table is a fixed 256-element array: $O(1)$ space
independent of $N$. Over unbounded integer values, a hash map gives $O(S)$ space
for $S$ distinct values with $O(1)$ expected update; a direct-address table
would need $O(U)$ space for universe size $U$, which is why hashing is chosen
whenever $U \gg S$.

## Limits

**Windowing is not a general strategy, and its boundary is sharp.** It applies
exactly when validity is determined by window contents and is monotone under
inclusion in one direction. Problems where the property depends on pairs of
*non-adjacent* positions — longest palindromic substring, most "maximum distance
with constraint" problems, anything needing a set that may be added and removed in
arbitrary order — fall outside it. Some can be forced in with extra structures
(monotonic deques, prefix minima) but then the analysis is no longer the clean
two-pointer argument, and you should verify the cost rather than assume it.

**Neither shape gives sub-linear time.** Here $\Omega(N)$ denotes the asymptotic
lower-bound notation, a function growing at least as fast as its argument. An
adversary can place the single violating element anywhere, so any correct
algorithm must read essentially every position: inspecting only $k$ of $N$ leaves
the rest indistinguishable from a configuration with no violation. So $\Omega(N)$
is required, and windowing attains it. Note that even the *decision* problem
cannot be answered in $o(N)$, which surprises people who expect the answer itself
to be small.

**Rolling state does not extend for free.** Many windowing solutions secretly
maintain a full aggregate, for example recomputing the maximum over the window
after every change. That aggregate is $O(W)$ to rebuild and makes the whole thing
quadratic while still looking like a windowing solution. The discipline that
keeps it linear is: every state the loop consults must be updatable in $O(1)$ per
element. A segment tree or monotonic deque restores the bound at $O(\log N)$ or
$O(1)$ respectively, and that cost must be counted honestly.

**The alphabet assumption is load-bearing.** A frequency table over an unbounded
value domain needs hashing, which is $O(1)$ *expected* and $O(S)$ worst case when
collisions cluster. A table over a bounded domain is genuinely $O(1)$ worst case.
Claiming $O(1)$ auxiliary space for a windowing algorithm without stating which
regime it assumes is the most common imprecision in published solutions.

**What is not open.** There is no unknown here; this is settled complexity
accounting. The hard parts are practical: recognising which monotonicity a problem
has, and building an aggregate that stays constant-time. Those are engineering
judgements, not theoretical gaps.

## Trade-offs and When to Use
- **Use a sliding window when** the answer is a contiguous range and validity
  depends only on that range's contents, and only in one inclusion direction.
- **Decide shrinkable versus growable first.** It determines whether you record
  before or after the contraction loop. Getting this backwards is the usual cause
  of "my answer is one too small".
- **Choose the aggregate before the loop.** Incremental counter or frequency table
  for $O(N)$; segment tree or BIT for $O(N \log N)$ with range aggregates; rescans
  only when the window is provably tiny.
- **Combine with two pointers and a monotonic deque for the harder variants.**
  Windowing supplies the movement discipline, and a deque keeps the extremum
  query at $O(1)$.
- **Do not force it.** If the answer needs arbitrary-order insertion and removal
  of elements, use a hash map or a balanced tree. Forcing a window produces code
  that looks linear and is not.
- **Watch the empty-window bound.** Enforcing `L <= R` before every removal is
  what keeps degenerate inputs from reading out of bounds.