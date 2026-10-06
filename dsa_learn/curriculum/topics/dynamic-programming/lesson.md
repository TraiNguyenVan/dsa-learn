# Dynamic Programming

## Overview
Dynamic programming applies to a problem that satisfies two properties at once.
*Optimal substructure*: an optimal solution to a problem is built from optimal
solutions to subproblems. *Overlapping subproblems*: the same subproblem is
solved again and again by a naive recursion. The first property says
decomposition is valid; the second says memoisation will pay. Both must hold —
optimal substructure without overlap usually means plain divide and conquer, and
overlap without optimal substructure usually means the decomposition is invalid
and the greedy choice is safe.

What makes DP different from its naive recursive counterpart is a specific
discipline: **order of evaluation**. The recursion computes subproblems in
whatever order the call tree happens to reach them. A DP solution instead decides,
before writing any code, which states exist and what order they will be filled in,
so that every state is computed exactly once after all its dependencies.

That reordering is the entire mechanism. The number of *distinct subproblems* is
usually polynomial in the input while the number of *calls* in the naive recursion
is exponential. DP does not make the state space smaller; it makes each state cost
$O(1)$ instead of being recomputed many times.

## Mechanics and Memory Layout
A DP solution needs four things, and each has a decision attached to it.

**The state.** What single quantity, plus which prefix or window of the input,
fully determines the subproblem. The question to ask is: *if two calls have the
same state, will they always return the same answer?* If yes the state is
sufficient and memoisation is sound. The failure mode is a state that is too
coarse — it omits a parameter the answer depends on — which produces confidently
wrong answers.

**The transition.** The recurrence expressing the current state's answer in terms
of smaller states. It must reference only already-computed states, which is what
forces a topological order. A recurrence that refers to the same state is not a
recurrence; it is an equation to solve, and solving equations may be the right tool
instead.

**The evaluation order.** Either bottom-up over a filled table, or top-down with a
memo table. Bottom-up needs no recursion, so no stack risk and predictable
memory access. Top-down computes only reachable states, which can be a large
saving when most states are irrelevant, at the cost of recursion depth.

**The table layout.** A full $O(n \cdot m)$ table is often unnecessary. If state
$(i, j)$ depends only on $(i, j-1)$, the $i$-th row is never revisited, so a
single row suffices: $O(m)$ space instead of $O(nm)$. This rolling-array
optimisation is the single most valuable DP skill, because it is where the
$O(nm)$ → $O(m)$ improvement comes from.

## Core Operations and Invariants
The DP invariant is the thing to state before writing code:

> **DP invariant.** When state $(i, j)$ is computed, every state in its dependency
> set has already been computed correctly. Consequently $(i, j)$ is correct.

*Setup.* A state with no dependencies — the base cases — is correct by direct
definition, so the invariant holds initially.

*Step.* Let $(i, j)$ be computed. By the invariant every dependency holds its
correct value. The recurrence combines exactly those correct values, so by
optimal substructure the value it produces is the correct optimum for $(i, j)$. The
invariant therefore extends to $(i, j)$.

*Termination.* The dependency graph is acyclic, so a topological order exists and
every state is reached. When the last state is computed, the invariant says it is
correct, and optimal substructure propagates correctness back to the entry state.

The requirement that dependencies are already computed is why the order must be
explicit. Choosing the wrong order — bottom-up without checking the recurrence's
direction — produces a table of zeros, and the failure is silent because the
algorithm still returns a number.

## Correctness Argument
**Correctness of the decomposition.** Optimal substructure is a property of the
problem, not of the algorithm, and it must be argued rather than assumed.

Take a problem $P(x)$ with optimal substructure, and an optimal solution $S^*$ for
some instance $x$. $S^*$ decomposes into solutions to subproblems
$P_1(x_1), \dots, P_k(x_k)$. Suppose for contradiction that the chosen solution
for some $P_i(x_i)$ is not optimal, with cost $c'$. Then substituting it into $S^*$
produces a valid solution to $P(x)$ with strictly smaller cost than $S^*$ — a
contradiction. So every component of an optimal solution must itself be optimal.

This is the whole argument, and it is short. What makes it worth stating is that it
fails exactly when the problem lacks optimal substructure. Greedy interval
selection is the standard counterexample: choosing the earliest-finishing interval
is not optimal because an optimal solution may contain a subinterval that is not
itself the earliest-finishing one, so no decomposition into optimal pieces exists.

**No cycles, so no infinite regress.** The recurrence must reference strictly
smaller states under a measure that decreases — typically the window size or the
remaining input. Because the measure is a non-negative integer that strictly
decreases, the recursion terminates. Without such a measure the recurrence is not
well-founded and the algorithm does not terminate, which is why every correct DP
specification states it.

**Existence and uniqueness.** The DP explores all possible first choices and
recursively optimises the remainder, so by induction on the measure every candidate
is considered and each returns its optimum. The minimum over those candidates is
therefore the global optimum. This also gives a practical check: for a problem with
many solutions, the DP is exhaustive over decompositions, so a bug shows up as a
missing candidate rather than as a wrong value from a present one.

**Top-down and bottom-up agree.** Memoised recursion and bottom-up fill produce
identical tables, because each state is a pure function of its inputs and both
compute every reachable state exactly once with the same recurrence. They differ
only in which states are visited and in space usage, never in results. If they
disagree, the cause is a mutable input or a non-pure state definition — the memo
key does not determine the answer, which is precisely the too-coarse-state failure.

## Cost Derivations

### The state space count
Let the state be indexed by a pair $(i, j)$ with $0 \le i \le n$ and $0 \le j \le m$.
There are $(n+1)(m+1) = O(nm)$ states — this is the quantity that matters, and it
is a product, not a sum. The recursion tree, by contrast, has a branching factor
equal to the number of options per state and depth $O(n+m)$, so its size is
exponential: Fibonacci recurrence $F(n) = F(n-1) + F(n-2)$ gives about
$\varphi^n$ calls, where $\varphi$ is the golden ratio, roughly 1.618. **The ratio
between the two is the entire value of DP for that problem.**

### Time is (states) × (per-state cost)
If there are $O(nm)$ states and each transition examines $O(1)$ or $O(k)$ options,
time is $O(nm)$ or $O(nmk)$. Written honestly it is: *number of states times cost
per state*, and both factors must be counted. Reducing per-state cost from $O(k)$
to $O(1)$ is the second lever after reducing the state count.

### Space is states, or states on one axis
A full table is $O(nm)$ space. If the recurrence for row $i$ references only row
$i$ and row $i-1$, two rows suffice: $O(m)$. If it references only row $i-1$, one
row suffices. The general rule: keep as many rows as the recurrence's *lookback
depth* in $i$ requires. This is where the largest practical gains usually are, and
it is why knapsack is often quoted as $O(nW)$ time with $O(W)$ space.

### Space reduction can break correctness
Rolling arrays are safe only when the retained rows genuinely cover every
reference. Knapsack's descending-index loop avoids reusing an item; the ascending
version with one row silently computes an unbounded knapsack instead. This is the
classic rolling-array failure: the space optimisation is correct only if the
iteration order is chosen to match the dependency direction, and getting that
wrong produces a plausible, wrong answer.

### Comparison against the alternatives
- **Against naive recursion.** Exponential to polynomial in the number of calls.
- **Against divide and conquer.** DP wins on overlap and loses when there is none:
  merge sort does each merge once, so memoising would add a table for nothing.
- **Against greedy.** Greedy is $O(n)$ but wrong without a proof that the greedy
  choice is always safe. DP is slower and always correct once optimal substructure
  holds. The honest comparison is DP's cost against the risk of being wrong.

## Limits

**No matching lower bound is known for DP, and this is a real gap rather than a
subtle technicality.** For the classic problems, the DP upper bound is believed to
be close to optimal in practice, but a lower bound matching the $O(nm)$ state count
is not known. The reason is structural rather than an oversight: **the state count
is a property of the chosen recurrence, not of the problem.** A different recurrence
over different states can change it, sometimes drastically. This is what separates
dynamic programming from sorting or graphs: for those, the $\Omega(n \log n)$ and
$\Omega(V+E)$ bounds are properties of the *problem class*, independent of
technique. Here, proving a lower bound means proving something about the specific
recurrence, which says much less about the problem. **Treating a DP's complexity as
optimal is therefore unjustified**, and DP problems should be re-derived from the
memo key rather than accepted from a reference.

**Optimal substructure does not imply the greedy choice is safe.** The classic
failures are: choose the fewest coins first in a coin system where it fails; take the
first course that ends earliest when a longer course chosen later enables an earlier
finish; cut at the first price drop in a transaction problem where holding across
the drop pays better. In each case the greedy choice destroys the decomposition, so
DP is needed. Each is a counterexample people produce once and remember, so it is
worth studying them as a set.

**A DP that blows up the state space is worse than exponential search.** If the
memo key omits a parameter the answer depends on, a hash memo may not dedupe
anything — the cache grows like the recursion and total cost becomes
$O(\text{states} \cdot \text{cost per state})$ with no dedupe benefit, strictly
worse than plain backtracking with no table at all. Watch for state explosion: a
table that grows faster than polynomial means the key is wrong.

**Space reduction is not automatically safe.** As above: the rolling-array
optimisation is only sound when the retained rows and the iteration direction
together cover every dependency. A one-row solution to a problem needing two rows
computes a different problem. Verify the dependency direction before optimising.

**Greedy algorithms with matroid structure admit exchange proofs and beat DP on
both time and space.** Spanning trees, job scheduling with deadlines, and bipartite
matching all have matroid or exchange structure where a local choice provably
extends to an optimum. For those, DP's polynomial table is genuinely wasteful, and
the correct response is a proof, not a bigger table. Overlapping DP states are a
sufficient condition for DP, not a necessary one.

**What is genuinely open.** Whether DP always admits a recurrence matching the
natural lower bound is unresolved even in simple settings. Knapsack has a trivial
pseudo-polynomial $O(nW)$ DP with no known strongly polynomial algorithm, yet
pseudo-polynomial time cannot be trusted against binary-encoded input, where $W$
is exponential in the input size. So knapsack is an $NP$-complete problem with an
easy DP, and the gap between "easy to DP" and "easy to solve" is exactly the space
where $P \ne NP$ would live.

## Trade-offs and When to Use
- **Use DP when both properties hold** — optimal substructure *and* overlapping
  subproblems. Verify the first with an argument, not a hunch; it is the one that
  fails silently.
- **Derive the state before writing code.** Ask: if two calls share this state,
  must they return the same value? If not, the key is too coarse and the table is
  useless.
- **Count states first.** $O(nm)$ states with $O(1)$ transitions is the target. A
  state count that is exponential in the input means the recurrence is wrong.
- **Choose bottom-up unless states are mostly unreachable.** Bottom-up avoids
  stack depth and gives predictable memory access; top-down is worth its overhead
  when most states are never reached.
- **Roll rows once the recurrence's lookback depth is understood.** This is
  usually the largest available win after fixing the state.
- **Match iteration direction to the dependency.** With rolling arrays, ascending
  versus descending index changes which items may be reused, and the wrong choice
  silently computes a different problem.
- **Reach for greedy instead when an exchange or matroid argument exists.** Proving
  a local choice safe beats any table, in time and in space.
- **Check pseudo-polynomial complexity against the encoding.** A DP that is
  polynomial in the maximum value is exponential in the input size if that value is
  binary-encoded, so state the bound in terms of input length when it matters.