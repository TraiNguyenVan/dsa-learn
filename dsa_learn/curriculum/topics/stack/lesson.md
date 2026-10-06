# Stacks

## Overview
A stack is a collection with a single access point. You may add to the top and
remove from the top, and that is the entire interface. Nothing else is reachable
without first removing what sits above it, which is why the structure is called
last-in first-out: the most recently pushed element is the first one handed back.

That restriction is the whole point. An array gives random access but forces
O(N) insertion in the middle; a stack gives O(1) insertion and removal but
removes all choice about *what* comes next. Whenever a problem has a
"most recent unprocessed thing" character — an open parenthesis, an unmatched
operator, a deferred decision — a stack is the structure that mirrors it
directly, and the algorithm becomes a traversal rather than an accounting
exercise.

Stacks also carry an implicit capacity question that surfaces constantly. A stack
backed by a fixed-size array has $O(1)$ push and pop with no allocation, but
overflows. A stack backed by a dynamic array never overflows but pays an
occasional $O(N)$ resize. Choosing between them is choosing between a hard
failure at a known bound and an occasional latency spike, and the right answer
depends on whether the bound is provable.

## Mechanics and Memory Layout
A stack has three pieces of state: an array or pointer to the backing storage, the
current size $s$, and a capacity $c$.

- **Fixed-capacity array.** `push` writes at index $s$ then increments it; `pop`
  decrements then reads. Both are $O(1)$ with no allocation and no branching
  beyond the overflow check. Overflow behaviour is the whole risk: silently
  wrapping writes out of bounds, aborting the process, or throwing.
- **Dynamic array.** Identical, except that when $s = c$ the storage is
  reallocated at roughly $2c$ and the contents copied. Each push is still $O(1)$
  amortised because the copy is charged against the pushes since the last
  reallocation.
- **Heap-allocated singly-linked stack.** Each node holds a value and a `next`;
  `top` points at the head. Push allocates one node; pop frees one. Never
  overflows and never reallocates a block, but adds one pointer of overhead and
  one allocation per element, and scatters the nodes across the heap.

In C++, `std::stack` is a container adaptor with no `.begin()` or iteration: the
restriction is enforced by the type, not by convention. That compile-time
enforcement matters, because "a stack you can index into" is not a stack, it is
an array with a misleading name.

## Core Operations and Invariants
The single invariant governs everything:

> **Stack invariant.** The elements at storage indices $0$ through $s-1$ are the
> stack contents in push order, and no element outside that range is reachable.

Every operation must preserve it, and the proof obligation is trivial only
because the invariant is so strong.

- **Push(x)** writes `x` at index s, then increments s. The new
  element is the last of the first $s+1$ entries, so it is on top.
- **Pop** returns the element at index $s-1$, then sets $s \leftarrow s-1$. After
  this the element at $s$ is outside the reachable range, so it is genuinely
  gone — which is what makes pop destructive rather than merely a read.
- **Top / Peek** reads index $s-1$ without changing $s$.
- **IsEmpty** is $s = 0$.

The invariant also tells you exactly when the invariant is violated: writing
beyond index $c$ breaks it, and so does decrementing $s$ below zero. Both
overflow checks are consequences of the invariant, not defensive additions.

The variant that matters for interview work is the **monotonic stack**, where an
auxiliary condition is layered on top: the stack holds indices whose values are
strictly decreasing (or increasing) from bottom to top. That extra constraint is
what turns the structure into an amortised device — see the derivations.

## Correctness Argument
**Expression evaluation.** For a fully parenthesised infix expression, evaluate
with two stacks: an operator stack and an operand stack.

The invariant to maintain is:

> After processing any prefix of the token stream, the operand stack holds the
> values of all subexpressions that are completely parsed but not yet consumed by
> an operator, in left-to-right order; and the operator stack holds all operators
> that have been read but whose right operand is not yet complete, in order of
> appearance.

*Setup.* Before any token both stacks are empty, which is correct for the empty
prefix.

*Step.* Three token kinds:
- *Operand.* Push it. It is a complete subexpression with no operator attached
  yet, so both halves of the invariant hold.
- *Operator.* Push it. It has been read but its right operand is incomplete,
  which is precisely what the operator-stack half of the invariant describes.
- *Closing parenthesis.* Pop operators until the matching open parenthesis is
  found, applying each to operands. Every popped operator has a complete right
  operand at this moment, and every operand the pop consumes is complete by the
  first half. Applying an operator replaces two complete subexpressions with the
  one complete subexpression they denote, so both halves are preserved.

*Termination and conclusion.* Every fully parenthesised expression has matching
parentheses, so the closing-parenthesis steps reduce the operator stack to empty.
Exactly one value then remains on the operand stack, and by the invariant it is
the value of the whole expression. Correct.

The precedence variant, which handles unparenthesised input, is the same argument
with one extra rule: before pushing an operator, first apply every stacked
operator of higher or equal precedence. That keeps the invariant by ensuring a
lower-precedence operator is never buried under one that must act before it.

## Cost Derivations

### The operations themselves
Push performs one store and one increment of $s$. Pop performs one decrement and
one read. Neither involves $N$ — there is no loop and no search over the
contents, because the access point is fixed at the top. Both are $O(1)$ time and
$O(1)$ auxiliary space, and both are $O(1)$ worst case, not merely amortised, for
a fixed-capacity array. Total space is $O(c)$ where $c$ is the capacity.

### Why each element is pushed and popped at most once
This is the observation behind almost every linear-time stack algorithm. Take any
loop that pushes on some iterations and pops on others. Each element enters the
stack at most once, because pushing is guarded by a condition evaluated per
element. Each element leaves at most once, because a pop removes one element. So
over $N$ loop iterations the total number of pushes is at most $N$ and total pops
at most $N$. Each operation is $O(1)$, giving $O(N)$ total time no matter how
imbalanced the pushes and pops are.

The apparent paradox is that a single pop can discard the work of many pushes, as
in a monotonic stack. The argument is unaffected: cost is bounded by the *number
of operations*, and no element is popped more than once.

### Expression evaluation cost
Each token is pushed once and contributes at most one application of an operator.
For an expression of length $L$ there are $L$ tokens, so at most $L$ pushes and
$L$ pops, each $O(1)$. Total $O(L)$ time and $O(L)$ space in the worst case — the
worst case being a fully nested expression like `((((a))))`, where the operator
stack holds every operator simultaneously. That space bound is tight, not
pessimistic.

### Matching delimiters
Scan once, pushing each opener. On a closer, pop until the matching opener is
found; if the stack empties first, the input is unbalanced. Each character
causes one push or one pop, so $O(L)$ time and $O(L)$ space, with $O(L)$ being
the depth of the deepest nesting. This is also a complete correctness check: a
valid expression leaves the stack empty at the end, and a mismatch of the wrong
kind is detected at the exact character where it occurs.

### Monotonic stack: the amortised argument in detail
Suppose each element is pushed once, and on push we first pop every element
smaller than it. A naive count suggests $O(N^2)$ pops. The tighter count: any
element is popped at most once, because popping removes it permanently from the
stack and it cannot be re-pushed. Total pops across the entire pass is therefore
at most $N$. Total time $O(N)$. The apparent quadratic worst case does not exist
— this is the clearest example in the curriculum of amortisation earning its keep.

## Limits

**No stronger lower bound is known for the four-parallel-stack sorting bound.**
Where the theory genuinely thins out is the simultaneous-operator bound. Sorting
with $k$ stacks in parallel takes $\Omega(n \log n / k)$ time, by a counting
argument: the algorithm is comparison-based, so it must distinguish $n!$ orderings,
while $k$ parallel stacks with total depth $t$ can distinguish far fewer. The
remaining open question is not whether this is tight in general but what the
tightest known constants and lower bounds are for small fixed $k$, where clever
adversary arguments improve on the naive count. For most practical purposes $k$ is
large enough that the constants do not matter.

**A stack cannot express "the second most recent item."** Access depth $k$ costs
$O(k)$ pops-then-pushes, which is $O(k)$ work. So there is no $O(1)$ random
access, and nothing in the stack interface reveals the maximum, the minimum, or
how many elements it holds beyond zero — that requires walking it. This is a
genuine expressiveness limit, not an implementation detail: it is why a stack is
the wrong structure for "find the largest so far".

**Linked-stack memory is unbounded and unstructured.** The heap-node version never
overflows, which makes it attractive for unbounded input, but each element costs a
separate allocation plus a pointer. Under sustained load this fragments the heap
and defeats the allocator's size-class caching, so a contiguous block usually has
better throughput despite the theoretical overflow risk. The asymptotic costs are
identical; only constants and failure modes differ.

**Push-heavy workloads are cache-hostile.** Because each push may allocate a new
node, consecutive elements land far apart, and a subsequent pop-through costs
roughly one cache miss per element. The array-backed stack places consecutive
elements on consecutive cache lines. Both are $O(1)$ per operation and $O(L)$ for
a pass; the array version is typically several times faster in wall-clock terms.

**Unbounded recursion is bounded by the hardware stack, not by your algorithm.**
Recursive tree and DFS traversals use the call stack as an implicit stack. On a
degenerate tree of $N$ nodes the recursion depth is $O(N)$, so a depth of
$10^5$ or more overflows the native call stack and crashes the process. The
asymptotic statement "$O(H)$ auxiliary space" hides this, because the constant
factor is an 8 MB address space. Writing the traversal with an explicit heap-
allocated stack removes the crash and makes the bound honest.

## Trade-offs and When to Use
- **Use a stack when** the problem has genuine last-in first-out structure: nested
  delimiters, deferred operators, undo history, DFS traversal, expression
  evaluation, or monotonic-window tricks.
- **Use an array-backed stack by default.** It has better locality, no per-element
  allocation, and the overflow bound is often provable from the input size.
- **Use a linked stack when** the depth is genuinely unbounded and unboundedness
  is a correctness requirement rather than a preference.
- **Do not use a stack when** you need the minimum, the maximum, random access, or
  a count other than zero. Each of those is an explicit traversal, which means you
  should have chosen a different structure.
- **Remember the monotonic variant.** Next-smaller-element, largest-rectangle, and
  daily-temperatures problems are all the same structure with a constraint bolted
  on, and each is $O(N)$ rather than the $O(N^2)$ a naive scan suggests.
- **For breadth-first work, do not reach for a stack.** FIFO is the right
  discipline, and using a stack where a queue belongs is a correctness error, not
  a performance one — it changes which nodes are discovered in which order.