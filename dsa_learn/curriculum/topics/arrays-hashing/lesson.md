# Arrays & Hashing

## Overview
Arrays and Hash Tables represent the foundational building blocks of algorithmic computing.
A contiguous array stores elements of identical types in adjacent memory locations, enabling instantaneous $O(1)$ random access by index. Hash Tables build upon dynamic arrays by using a mathematical hash function to map arbitrary keys (integers, strings, objects) to array indices, delivering near-constant time $O(1)$ average lookups, insertions, and deletions.

Understanding how elements are indexed, how collisions are resolved, and how hash tables dynamically resize is vital to mastering data structures.

## Memory Anatomy & Layout
In modern hardware architectures, memory layout determines performance:
- **Contiguous Cache Alignment**: In C++ (`std::vector<T>` or `std::array<T, N>`), array elements sit contiguously in memory. When accessing `arr[i]`, the CPU loads a complete 64-byte cache line, making sequential iterations significantly faster than pointer traversal.
- **Hash Table Buckets & Collisions**: `std::unordered_map` typically utilizes separate chaining or open addressing:
  - **Separate Chaining**: An array of buckets where each bucket points to a linked list or tree of colliding entries.
  - **Open Addressing**: Entries reside directly in table slots; collisions trigger linear or quadratic probing to find the next open bucket.
- **Load Factor ($\alpha = N / B$)**: When the ratio of stored elements $N$ to buckets $B$ exceeds a threshold (typically $0.75$ or $1.0$), the table reallocates to double its bucket capacity and rehashes all keys to restore $O(1)$ performance.

## Core Operations & Invariants
1. **Direct Indexing**: $arr[k] = \text{base\_address} + (k \times \text{element\_size})$. Always $O(1)$.
2. **Push Back / Dynamic Amortization**: Appending an element to a dynamic array is $O(1)$ amortized. When capacity is exceeded, an allocation of $2 \times$ capacity occurs ($O(N)$ copy cost spread across all prior insertions).
3. **Arbitrary Insertion & Deletion**: Inserting or removing at index $k$ requires shifting all trailing elements by one position ($O(N)$).
4. **Key Hashing & Equality Invariant**: Two equal keys must always produce the identical hash code: $\text{key}_1 == \text{key}_2 \implies \text{hash}(\text{key}_1) == \text{hash}(\text{key}_2)$.

## Correctness Argument
We prove each of the two structures maintains the property its cost claims
depend on.

**Hash table lookup.** The table is correct provided two invariants hold:
*I1* — equal keys always produce equal hash codes, and *I2* — every stored entry
is reachable from the bucket its key hashes to. Lookup computes `h = hash(key)`,
scans only bucket `h`, and returns a match iff a stored key equals `key`. If the
key is present, *I1* forces it into bucket `h` and *I2* makes it reachable, so
the scan finds it. If the scan finds nothing, then any occurrence of `key` would
have had to live in bucket `h` and been reachable there, so there is none.
Correctness in both directions follows from the two invariants alone.

The invariants are preserved by insertion because the entry is placed in bucket
`hash(key)` (establishing *I1* and *I2* for it) and by resizing because rehashing
recomputes every entry's bucket from its key.

**Load factor and the resize decision.** Let $B$ denote the bucket count and $N$
the entry count, and let $\alpha$ denote the load factor, defined as the ratio
$\alpha = N / B$ of stored entries to buckets. A chain in bucket $b$ holds at
most all $N$ entries, but the expected length of a chain is $\alpha$ because each
entry lands in any bucket with equal probability. So the expected cost of a
lookup is $1 + \alpha$: one probe of the bucket array plus a walk of the chain.
Resizing when $\alpha$ exceeds a fixed threshold keeps $\alpha$ bounded, which
is what makes the expected cost *constant* rather than growing with $N$.

## Cost Derivations

### Contiguous indexing is O(1) because the address is computed, not searched
Element `i` of an array of element size $s$ beginning at address `b` lives at
address $b + i \cdot s$. One multiply and one add. There is no loop, so there is
no $N$ to be found. Cache misses add a constant factor — a miss costs roughly
100 cycles rather than 1 — but the miss count is bounded by the array length,
which does not change the asymptotic class.

### Dynamic-array append: O(1) amortised, not O(1) worst case
Let capacity double whenever the array is full. Appends that fit cost $O(1)$: one
store, one increment of the size counter. An append that does not fit triggers a
resize costing $O(N)$ to copy, after which the new capacity is $2C$ where $C$ was
the old capacity.

To amortise, charge the resize across the appends since the previous resize. The
window from one resize to the next contains at least $C$ appends (the array had to
fill from $C$ to $2C$ slots), and the resize costs $O(C)$ copy work. Charging $O(1)$
to each of those $C$ appends covers the copy exactly. Summing over all windows
gives total work $O(M)$ for $M$ appends, hence $O(1)$ amortised per append.

**The worst case for a single append is still $O(N)$**, and that is the honest
bound to quote. Amortised analysis bounds the *average over a sequence of
operations*, not any individual one. A caller sensitive to individual latency —
an interrupt handler, a real-time thread — needs a preallocated buffer or a
segmented array instead.

### Hash table lookup: expected O(1), worst O(N)
Under the standard assumption that a hash function spreads $N$ keys uniformly over
$B$ buckets, the expected length of the bucket a given key maps to is $N/B$,
which is $\alpha$. Lookup costs one bucket-array probe plus a chain walk of
expected length $\alpha$, giving $O(1 + \alpha)$, which is $O(1)$ while the
threshold keeps $\alpha$ constant.

The worst case is $O(N)$: if all $N$ keys collide into one bucket, the chain is a
linear list and lookup degenerates to a scan. Nothing about the algorithm prevents
this — it is a property of the key distribution, not of the code.

### Rehash on growth is also amortised, by the same argument
The same charging trick applies to hash tables, which is why resizing does not
change the insert cost class. When the load factor $\alpha = N / B$ crosses the
threshold, the bucket count doubles from $B$ to $2B$ and **every** stored entry
is rehashed — its position is recomputed as `key mod 2B` rather than `key mod B`,
because bucket assignment derives from the bucket count.

That rehash costs $\Theta(N)$: $N$ hash computations plus $N$ placements. Charge
it across the inserts since the last resize. Starting from bucket count $B$, the
load factor crosses the threshold only once the entry count has roughly grown by
the same factor, so at least $\Theta(N)$ inserts occurred in that window. An
$O(1)$ charge against each of those covers the $\Theta(N)$ rehash exactly. Over a
lifetime of $M$ inserts the total rehash work is therefore $\Theta(M)$, so the
amortised cost of insert stays $O(1)$ while the load factor stays bounded.

Choosing a growth factor other than 2 changes only the constant, not the class.
Doubling is the usual choice because the copy frequency halves each round: with
a factor of $1 + \epsilon$ the amortised cost rises to roughly $O(1/\epsilon)$
per insert, still constant, but the memory overhead grows by the same factor.

### The bad case is not merely theoretical
Worst-case hashing has been *demonstrated*, not hypothesised: an adversary who
knows the hash function can pick $N$ keys that all land in the same bucket,
forcing $O(N)$ per lookup. This is a real concern for network-facing services
where an attacker influences the keys. Two mitigations exist: seeding the hash
per process so the attacker's chosen set must be found blind, and using keyed
hashes such as SipHash or MurmurHash with a random seed.

## Limits

**No deterministic worst-case O(1) hash lookup is known in general.** In this
section $\Omega(g(n))$ denotes the asymptotic lower-bound notation, meaning a
function that grows at least as fast as $g(n)$, and $\log$ denotes a logarithm
whose base is irrelevant up to a constant factor. The central open question in
hashing is unresolved: with
randomised hashing and a good universal hash family, the *expected* cost is $O(1)$
and the worst case is $O(N)$; what is wanted is $O(1)$ deterministically. Cuckoo
hashing gets close by using two independent hash functions and a bounded number
of probes per key with a structural invariant that guarantees a free slot exists,
but its worst case is $O(N)$ when the load factor exceeds a threshold or when the
key set is adversarially chosen.

**Why the $\Omega(N)$ sorting barrier does not apply here.** Sorting $N$ keys in
the comparison model requires $\Omega(N \log N)$ because every correct algorithm
must distinguish $N!$ orderings, and a comparison tree of depth $k$ has at most
$k! \ge 2^{k-1}$ leaves. Hashing is *not* a comparison algorithm: it computes a
key's position arithmetically rather than by comparing keys, so the barrier does
not apply. This is worth internalising, because "sorting is $O(N \log N)$ so
everything else is too" is a common and wrong instinct.

**What hashing cannot do at all.** A hash table destroys the information that a
sorted order carries, so it cannot support:
- *Sorted iteration.* The best you can do is $O(N \log N)$ to sort, which
  defeats the purpose.
- *Range queries.* "All keys between $a$ and $b$" is $O(N)$ because the keys
  are scattered across buckets arbitrarily.
- *Ordered predecessors and successors.* "The largest key below $x$" has no
  constant-time answer.

For these, the right structure is a balanced search tree or a skip list — both
give $O(\log N)$ per operation while preserving order.

**Space is not free.** A hash table storing $N$ entries needs $\Theta(N)$ total
space: the bucket array alone is $\Theta(B) = \Theta(N/\alpha)$ words, and each
entry adds a key, a value, and either a next pointer or an occupancy marker. The
load factor trades time for space, and pushing it below about 0.5 wastes memory
buys nothing. An array of $N$ primitives is typically substantially smaller.

##

## Trade-offs & When to Use
- **Use Arrays when**: Random indexing by position is frequent, element count is known or grows append-only, and memory footprint must remain minimal.
- **Use Hash Tables when**: Fast associative key-value lookup or frequency counting is required and ordering of keys is irrelevant.
- **Avoid Hash Tables when**: Sorted order traversal, range queries ($[\text{min}, \text{max}]$), or deterministic worst-case execution time limits are mandatory.
