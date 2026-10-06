# Sorting

## Overview
Sorting takes a sequence of keys and produces a permutation with the same
multiset in non-decreasing order. Throughout this lesson $\log$ denotes a
logarithm whose base is irrelevant up to a constant factor, and $\Omega(g(n))$
denotes the asymptotic lower-bound notation, a function growing at least as fast as
$g(n)$. The subject is not really about ordering — it is
about the *comparison decision tree*, because that is what separates the families
of sorting algorithm from one another.

Every comparison sort can be modelled as a binary tree whose internal nodes are
comparisons and whose leaves are the possible output permutations. A correct
comparison sort on $n$ distinct keys needs $n!$ leaves, because it must distinguish
that many orderings. A tree of depth $k$ has at most $2^k$ leaves. So
$n! \le 2^k$, giving $k \ge \lceil \log_2 (n!) \rceil = \Omega(n \log n)$.
**No comparison sort can beat that bound.** Mergesort, heapsort and quicksort all
sit on it; none exceeds it.

Knowing that bound is what makes the field navigable. An algorithm that takes
$O(n^2)$ is not merely slower than mergesort — it is using a worse decision
structure. An algorithm that takes $O(n)$ is not beating the bound; it has escaped
the comparison model, by exploiting knowledge that keys are drawn from a bounded
range or are integers.

## Mechanics and Memory Layout
The three canonical layouts are chosen for different reasons, and the choice
mostly determines the memory behaviour.

- **In-place quicksort.** Partition into two halves within one array, recurse.
  Cache behaviour is excellent for small partitions because the working set fits
  in $L_1$, but a skewed partition recurses $n$ deep, which can exhaust the
  native call stack.
- **Out-of-place mergesort.** Allocate a scratch buffer once, ping-pong between
  two arrays. Uses $O(n)$ extra space and is cache-friendly by construction,
  because each pass is a linear scan of contiguous memory.
- **Counting sort.** No comparison at all. Three passes: histogram the keys,
  prefix-sum to find starting positions, then place each element. This is the
  algorithm that *is not* bound by $\Omega(n \log n)$, because it never compares
  two keys — it computes each key's position arithmetically.

The practical consequence of that last point is worth stating plainly: choosing
counting sort when the key range is small beats every comparison sort, and the
decision rule is about the ratio of key range to element count, not about
asymptotic elegance.

## Core Operations and Invariants
**Mergesort** rests on one invariant per merge:

> **Merge invariant.** The two input runs are individually sorted, and every
> element already emitted is no greater than every element not yet emitted.

The merge is therefore a merge sort of size 2, done with two cursors: emit the
smaller front element and advance that cursor, repeat until one run empties, then
emit the remainder of the other in one copy. The recursion's invariant is that each
recursive call returns a sorted run.

**Quicksort** partitions around a pivot into three regions — less than, equal to,
greater than — and recurses on the two outer ones. Its invariant is the partition
invariant: after partitioning index range $[lo, hi)$, every element at index
$\le p$ is $\le$ pivot and every element at index $> p$ is $>$ pivot. Partition
once and the array is globally sorted if each side is sorted, so correctness reduces
to the sides.

**Counting sort** requires no invariant of that shape because it performs no
comparison. Its obligation is different: the histogram must count *exactly* the
keys present, and the prefix sum must place each key's run at its correct offset.
Both are bookkeeping, which is why counting sort is easy to get subtly wrong and
easy to verify once correct.

## Correctness Argument
**Mergesort is correct.** Prove by induction on run length $n$. *Base:* $n \le 1$
is sorted trivially. *Step:* split into two halves of length $\lceil n/2 \rceil$
and $\lfloor n/2 \rfloor$. Both are shorter than $n$, so by induction each
recursive call returns a sorted run. Now consider the merge. Two sorted runs are
merged into a sorted sequence by always emitting the smaller of the two front
elements: if $a \le b$ then $a$ is the minimum of the union, since $b$'s run is
sorted and so every later element of $b$'s run is at least $b \ge a$, and every
element of $a$'s run after $a$ is at least $a$. So each emitted element is a
correct minimum of what remains, and the output is sorted. Induction closes, and
the result is a sorted permutation of the input because every element is emitted
exactly once.

**Quicksort is correct.** Assume each recursive call sorts its sub-range. After
partitioning around pivot $p$, the partition invariant places every element
$\le p$ at or before $p$ and every element $> p$ after it. Sorting the two sides
therefore yields a fully sorted range, and no element moves across $p$, so the
order is consistent. By induction both recursive calls sort correctly. Since
partitioning permutes in place, the output is a permutation of the input.

**Counting sort is correct, under a stated assumption.** Suppose the histogram
records exact counts and the prefix sums give, for each key $k$, the number of
keys strictly less than $k$. Placing each occurrence of $k$ at the running offset
for $k$ and incrementing that offset writes exactly as many copies of $k$ as exist
and places them immediately after all smaller keys. Concatenating over increasing
$k$ gives a sorted sequence. **This proof is valid only because keys are drawn
from a bounded, known range** — that assumption is the whole basis for skipping
comparisons, and violating it silently produces garbage.

**No comparison sort beats the bound.** The $n!$-leaves argument above is not an
argument about any particular algorithm. It constrains the entire class, so a
proposed $O(n)$ comparison sort is not a clever implementation — it is a
mathematical impossibility, and the proof locates the error without needing to run
the code.

## Cost Derivations

### The recursion tree of mergesort
Let $T(n)$ be the cost of sorting $n$ elements. Splitting is free; merging is a
linear pass costing $\Theta(n)$ — each element is emitted exactly once, and each
emission is one comparison plus one copy. So
$T(n) = 2T(n/2) + \Theta(n)$.
Expanding to level $k$ of the tree gives $n/2^k$ subproblems each costing
$2^k$, for a per-level total of $n$. There are $\log_2 n$ levels, giving
$\Theta(n \log n)$. Auxiliary space is $\Theta(n)$ for the scratch buffer, allocated
once and reused, not per level.

### Why quicksort is also $\Theta(n \log n)$ on average
At each level the partition splits into parts of size $m$ and $n-1-m$, so depth is
governed by the split quality. With a uniformly random pivot, the expected size of
the larger part is about $3n/4$, so expected depth is $O(\log n)$ and expected
time is $\Theta(n \log n)$. **The worst case is $\Theta(n^2)$** — inserting already
sorted input with a deterministic pivot such as "first element" makes every
partition maximally unbalanced, so the recurrence becomes $T(n) = T(n-1) + c \cdot n$
for a constant $c$, which sums to $\Theta(n^2)$. Randomised pivot selection removes
this: every possible
pivot is equally likely, so no input order can force the bad case. This is the
practical argument for randomised quicksort over introsort or a median-of-three
pivot.

### Counting sort is $\Theta(n + k)$
Three linear passes: $n$ to histogram, $k$ to prefix-sum, $n$ to place. Here $k$
denotes the key range. Total $\Theta(n + k)$ time and $\Theta(n + k)$ space, with
**no comparison performed at all**. This is what makes it sub-comparison-sort: the
$k$ term is the price of the bounded-range assumption. Counting sort beats any
comparison sort when $k = O(n)$ and loses badly when $k \gg n^2$.

### Insertion sort's quadratic term
On each of the $n$ passes, insertion shifts elements until the insertion point is
found. On random input the expected shift count per pass is about $i/2$, so total
work is $\sum_i i/2 = \Theta(n^2)$. On **already sorted** input every pass finds the
insertion point immediately and the cost is $\Theta(n)$ — which is why production
sorts switch to insertion sort for small ranges, where its tiny constant and
in-place memory behaviour win. Its adaptivity, not its complexity, is the reason to
keep it.

### The bound the tree argument actually gives
Solving $2^k \ge n!$ gives $k \ge \lceil \log_2 (n!) \rceil$. Applying Stirling's
approximation, $\log_2 (n!) \approx n \log_2 n - (\log_2 e)\, n$, so the bound is
$\Theta(n \log n)$ with a leading constant of 1 in base 2. **Information-theoretic
minimum decision depth** is the phrase for this quantity, and it is exactly what a
merge-based sort spends.

## Limits

**$\Omega(n \log n)$ is a floor for comparison sorts, and it is attained.** As
above, the decision-tree argument is a property of the problem class, so
mergesort and heapsort are not merely good — they are optimal. No amount of tuning
changes that, which is why optimisation effort on a comparison sort belongs in
memory layout and branch prediction rather than in the algorithm.

**Beating the bound requires escaping the comparison model, and paying for it.**
Counting, radix and bucket sorts achieve $O(n)$ by exploiting key structure. Radix
sort goes further: for fixed-width keys it performs a stable counting sort once per
digit, giving $O(d(n + k))$ where $d$ is the number of digits. Choosing between
these and a comparison sort is a real engineering decision, not a theoretical
preference — integer radix sort routinely beats introsort in practice precisely
because it makes no comparisons.

**Heapsort's optimal worst case comes with the worst memory pattern.** Its access
pattern jumps across the array, so nearly every comparison touches a distinct cache
line, while quicksort scans contiguously and enjoys excellent locality. Introsort
therefore runs quicksort while recursion stays within a depth bound and falls back
to heapsort only when that bound is breached — obtaining quicksort's locality with
heapsort's guarantee. **The asymptotically optimal algorithm is not the fastest
one**, which is worth internalising before assuming a bound settles a choice.

**Parallel sorting does not have a single settled complexity.** Bitonic and
odd-even mergesort give $O((\log n)^2)$ time on $p$ processors, and whether
sorting $n$ elements on $p$ processors can beat $O(n \log n / p)$ in general is not
fully resolved. Sorting networks give a fixed $O((\log n)^2)$ comparator count
independent of $p$, which is the right model when $p$ is enormous or the keys
cannot be moved freely.

**What is not open.** The comparison lower bound is settled and the standard
practical algorithms are settled. The genuinely open questions are
model-dependent: exact parallel merge complexity, and the best bounds for external
sorting where $n$ exceeds memory and disk seeks dominate comparisons.

## Trade-offs and When to Use
- **Use mergesort when** stability matters, worst-case guarantees are required, or
  the data is on a linked structure or tape where sequential access dominates.
- **Use quicksort (randomised) when** the data is in memory and speed is the
  priority. Its $O(1)$ auxiliary space and cache locality usually win.
- **Use heapsort when** you need $O(1)$ extra space *and* a worst-case guarantee.
  It is the only sort with both.
- **Use counting sort when** the key range is $O(n)$ or smaller. Do not use it at
  $k \gg n$ — the $O(k)$ space and time make it worse than comparison sorting.
- **Use radix sort for fixed-width integers or short strings.** No comparisons, and
  in practice the fastest option available.
- **Use insertion sort for $n$ below roughly 16–32.** Its $\Theta(n)$ behaviour on
  already sorted input and its tiny constant beat every general sort at that size,
  which is why it is the base case inside every hybrid.
- **Keep a stability requirement in mind.** Mergesort, counting and radix sorts are
  stable; quicksort, heapsort and most in-place implementations are not. Stability
  matters whenever equal keys carry differing payloads.
- **Ask what the keys actually are before choosing.** Sorting pointers to 100-byte
  records is not the same problem as sorting the records, and comparing fewer bytes
  is often the largest single win available.