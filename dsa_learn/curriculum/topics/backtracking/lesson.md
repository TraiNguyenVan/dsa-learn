# Backtracking

## Overview
Backtracking searches a space of candidate solutions by building each one
incrementally and abandoning a partial construction the moment it cannot lead to a
valid answer. The distinguishing feature is not recursion — recursion alone is
ordinary — but the pairing of recursion with an explicit state save and undo at
each level. The recursion descends, the condition detects failure, and the undo
restores the state so the next candidate is explored from a clean base.

The name is precise. The algorithm tracks back to the last decision point,
reverses that decision, and tries the next alternative — exactly the discipline
of enumerating all possibilities by hand, formalised. This makes backtracking the
natural technique whenever the constraint structure only becomes apparent partway
through constructing a candidate: placing queens so none attack, arranging tiles so
neighbours match, ordering $n$ items under pairwise constraints, selecting items
under a capacity limit.

What separates competent backtracking from naive enumeration is **pruning**: using
constraint propagation to detect that a partial construction is already doomed, so
its entire subtree is skipped rather than descended. A correct implementation
without pruning is exponential. A correct implementation with sound pruning can be
several orders of magnitude faster, and pruning is where the real intellectual
content lives.

## Mechanics and Memory Layout
The state a backtracking function manipulates is the partial solution plus whatever
auxiliary bookkeeping the constraints need — a used-value set, a board grid, a
running count.

Three memory consequences follow, and all three are worth internalising because
they determine whether the algorithm runs at all:

- **Auxiliary space is $O(d)$ where $d$ is the depth of the search tree.** The
  recursion stack holds one copy of the state per level. This is usually
  dominated by the partial solution itself, which is typically a length-$d$ array
  or string being built in place.
- **In-place mutation with explicit undo.** The partial solution is usually a
  single array written in place rather than a fresh copy per level. That choice
  reduces space to $O(d)$ but makes correctness depend entirely on the undo
  restoring state *exactly*. A missing undo does not cause a wrong answer
  immediately — it causes a wrong answer several levels later, which is why this
  bug class is so hard to find.
- **Constraint state is the actual cost driver.** For $n$-queens, the board is
  $O(n)$ but the per-node legality check is $O(n)$ because it scans the columns
  under attack, giving $O(n)$ total space and $O(n)$ per node. Where that check is
  implemented incrementally with per-column and per-diagonal counters, it becomes
  $O(1)$ per node and the pruning cost falls with it.

The last point is the practical lever. Most of the improvement in real backtracking
code comes from replacing an $O(k)$ legality scan with $O(1)$ incremental
bookkeeping, not from changing the search itself.

## Core Operations and Invariants
A backtracking function has a fixed three-part shape:

1. **Base case.** If the current construction is complete and valid, record it.
2. **Prune.** If the current construction cannot be completed to a valid
   solution, return immediately.
3. **Try, recurse, undo.** For each candidate value at this position: apply it,
   recurse, then reverse the application.

The invariant every correct implementation maintains:

> **Backtracking invariant.** On entry to a call at depth $d$, the mutable state
> exactly reflects the decisions recorded in the current path — the assignment at
> each of the first $d$ positions — and every constraint violated so far has
> caused an immediate return rather than a descent.

Two properties are non-negotiable:

- **Sound pruning.** Pruning must only discard partial constructions that provably
  have no valid completion. Pruning a branch that did contain a solution is a
  correctness bug that silently returns a wrong answer set.
- **Complete restoration.** The undo at each level must restore the state to
  precisely its entry value, so the next candidate is explored from the same base
  as the first.

The ordering of operations in step 3 is the subtle part. Apply, recurse, undo — in
that sequence. Undo-before-recurse, or omitting the undo, both produce wrong
answers in ways that pass small tests.

## Correctness Argument
**Completeness.** We show that backtracking finds every valid solution: if a valid
solution $S = (s_0, s_1, \dots, s_{n-1})$ exists, the algorithm records it.

Proceed by induction on the depth $d$ of the decision for $s_d$.

*Base case $d = 0$.* The function enumerates every candidate value for position 0.
By induction hypothesis all shallower valid solutions have been found. For $s_0$:
the loop reaches the iteration where candidate $s_0$ is applied, provided it was
not pruned. If it was pruned, the pruning test must have found $S$ invalid at
depth 0 — but $S$ is valid, so a sound pruning test would not prune it. So $s_0$ is
applied and the invariant holds at depth 1 with $s_0$ recorded.

*Step.* Assume every valid solution consistent with the first $d$ values is found
within the subtree at depth $d$. At depth $d+1$ the loop enumerates every
candidate for position $d+1$, including $s_{d+1}$, for the same reason: sound
pruning cannot discard a branch containing the valid solution $S$. The recursion
at that branch is covered by the induction hypothesis. Hence $S$ is recorded.

*Termination.* Each level of the loop is finite, so the recursion terminates.

The conclusion holds with the pruning test fixed: if it is sound, no valid
solution is ever pruned, and completeness follows. **Completeness and soundness
of pruning are the same property, and that is why pruning bugs are correctness
bugs.**

**Soundness of pruning.** A recorded solution is one that reached a base case
having satisfied every constraint, since each constraint is checked either at
prune time or before recording. Every constraint on the problem is checked at the
point it becomes determined — a pair-wise constraint as soon as both elements are
placed, a capacity constraint as soon as the total exceeds the limit. Checking a
constraint only when fully determined is what makes the recorded solutions valid.

**No duplicates.** At each depth the loop enumerates distinct candidate values, so
two different paths to depth $n$ must differ at some depth $d$ where they took
different branches of the loop. Therefore distinct leaves correspond to distinct
solutions, and each is visited exactly once.

## Cost Derivations

### The search tree is the cost, and it is usually exponential
Let $b$ denote the number of candidate values available at each decision, and let
$d$ denote the depth of the search tree. The number of leaf nodes is at most
$b^d$. The algorithm visits every node it does not prune, and node count is
geometric in depth: $1 + b + b^2 + \dots + b^d$, which is $\Theta(b^d)$ for
$b > 1$. So unpruned time is $\Theta(b^d)$.

For $n$-queens with $b \approx n$ this is $O(n^n)$ — useless. For subset
enumeration with $n$ items and $b = 2$ it is $O(2^n)$, which is why a $2^{30}$
search is infeasible on a machine doing roughly a billion operations per second.
**The growth rate is the same either way; only the constant differs.** Any claim
that backtracking is "polynomial for small inputs" is a statement about constants,
not about complexity.

### Pruning converts exponential into a smaller function
Let $P$ be the fraction of nodes surviving the prune test at each level. Then
visited nodes are $\Theta((bP)^d)$ instead of $\Theta(b^d)$. This is why pruning
dominates everything else in practice: reducing $P$ from 1 to $1/10$ multiplies the
saving by $10^d$, which for $d = 20$ is $10^{20}$.

For $n$-queens the pruning tests — same column, same diagonal, row already filled —
reject the large majority of candidates immediately, which is what brings the
practical count down from $n^n$ to something tractable while remaining
exponential in the worst case. **Pruning changes the constant in the exponent, not
the exponent's base.** No amount of pruning makes backtracking polynomial in
general, and that is a theoretical fact rather than a practical observation.

### Per node cost and where it comes from
Total time is (number of visited nodes) × (per-node cost). Reducing the per-node
cost from $O(k)$ to $O(1)$ — by replacing a legality scan with incremental
counters — gives a factor-$k$ speedup. That is real and worth doing, but it is
exponentially smaller than the effect of improving the prune rate. This ordering
of priorities is the practical takeaway: **prune better before working faster per
node.**

### Space
Auxiliary space is $O(d)$ for the recursion stack plus the state it holds. The
number of nodes visited does not affect space at all — that is the saving grace of
in-place mutation with undo. For $d$ bounded by $n$ this is $O(n)$, small enough
that the recursion depth limit, not space, is usually the practical constraint on
very deep searches.

### Enumerating all solutions versus finding one
The proofs above are unchanged, but the cost is not: "find any solution" can
terminate at the first leaf, while "find all" must traverse the entire tree. The
exhaustive version can be exponentially more expensive for no additional
correctness work. Choosing the wrong one is a common and expensive mistake.

## Limits

**No general guarantee of better than exponential exists.** Finding a Hamiltonian
path, a valid $n$-queens arrangement, or a satisfying assignment for a general
Boolean formula admits no known algorithm faster than exhaustive search in the
worst case. Two deeper facts make this more than ignorance. Solving arbitrary
3-SAT has no known sub-exponential algorithm and is conjectured to have none,
which would imply $P \ne NP$. And no monotone CNF with polynomially many clauses
has a sub-exponential algorithm under the exponential-time hypothesis, a result
(Fine-grained complexity, via ETH) that rules out whole classes of hoped-for
improvements at once. **So the exponential behaviour of backtracking is not a
weakness of the technique; for a substantial class of problems it is the best
currently known.**

**Memoisation does not belong in plain backtracking — that is dynamic
programming.** If two different paths reach the same partial state, the subtrees
below them are identical, and recomputing both is wasted. Caching states and
solving each once converts factorial or exponential into polynomial. The
diagnostic question is precise: *can two distinct paths reach the same state?* If
yes, memoise. If no, states are unique and backtracking is the right tool. Choosing
backtracking where DP applies is the single most common performance error in this
family, and it costs exponential time for nothing.

**Pruning is not free, and over-pruning is silent.** Every pruning test costs time
on every node it examines, so a test that rejects 1% of candidates may not repay
its cost. Worse, a test that rejects a branch containing a valid solution produces
a wrong answer that is indistinguishable from a correct one by inspection. There
is no partial credit: correctness is binary. This asymmetry — cheap to get subtly
wrong, fatal when you do — is why pruning tests deserve the same scrutiny as the
search itself.

**Constrained-permutation problems have no known sub-exponential general
algorithm.** For problems such as graph colouring and Hamiltonian cycle under
general constraints, no better-than-exponential algorithm is known, and this
believed gap is the content of the exponential-time hypothesis. The practical
consequence is that heuristics are not a workaround; on some inputs they are the
best available method.

**What is genuinely open.** The exact worst-case count of nodes visited by
$n$-queens is not known in closed form — the growth rate is believed to be about
$1.942^n$, established numerically, but no proof of that rate exists. Proving
such bounds for even a single classical problem is open work, so "no closed-form
bound is known" is the accurate statement, not an evasion.

## Trade-offs and When to Use
- **Use backtracking when** constraints only become checkable as the solution is
  built, and you need every valid solution rather than the best one.
- **Decide enumerate-versus-early-exit first.** "Any solution" can stop at the
  first leaf; "all solutions" cannot. Choosing wrongly costs exponentially.
- **Ask the memoisation question before writing anything.** If two paths can reach
  the same state, use dynamic programming instead. This single check prevents the
  most common catastrophic mistake.
- **Prune first, optimise later.** Improving the prune rate beats improving
  per-node cost by exponentially many orders of magnitude.
- **Make pruning incremental.** Replace $O(k)$ legality scans with $O(1)$
  counter updates where possible; this is the best per-node improvement available.
- **Undo exactly, in order.** Apply, recurse, undo. Deviating from that order
  produces failures that surface far from their cause.
- **Use forward checking or constraint propagation when constraints interact.**
  They detect inconsistency several levels ahead rather than at the level where it
  appears, which prunes strictly earlier.
- **Keep the recursion depth bounded in mind.** Deep searches can exhaust the
  native stack, so size the limit deliberately rather than discovering the
  boundary empirically.