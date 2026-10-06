# Math and Bitwise Techniques

## Overview
Bitwise operations treat an integer as a vector of bits and manipulate all of them
at once with a single machine instruction. This is the one area of the curriculum
where a *constant number of arithmetic operations* is the whole goal, and where the
same trick can turn an $O(n)$ loop into $O(1)$ code.

The subject has three layers, and they build on each other:

1. **Identities** — that `x & 1` is the low bit, that `x & (x-1)` clears the lowest
   set bit, that `x & -x` isolates it. These are the primitives every other
   technique is assembled from.
2. **XOR properties** — `x ^ x = 0`, `x ^ 0 = x`, and commutativity and
   associativity. XOR is its own inverse, which makes it the natural tool for
   "find what is different" and "remove duplicates".
3. **Mask arithmetic** — building and applying masks to test, set, and clear
   individual bit *positions*, which is how you manipulate a fixed-width integer's
   fields without touching the rest.

The reason this matters is not novelty. A machine word is 64 bits, so one operation
does the work of 64 boolean operations. On bit-level problems the gap between a
bitwise solution and a boolean-array solution is not a constant factor — it is a
factor of 64 per operation, which is the difference between passing and timing out.

## Mechanics and Memory Layout
Bitwise operations operate on machine words: fixed-width integers, typically 32 or
64 bits. Three properties of this representation drive everything.

- **Operations are O(1) regardless of width.** A 64-bit AND is one instruction with
  latency of about one cycle. Nothing scales with the number of bits set.
- **Overflow is undefined behaviour in C++ for signed types.** Shifting into or past
  the sign bit of a signed integer is undefined, not merely implementation-defined.
  This is why bit manipulation uses `unsigned` types throughout — a real correctness
  constraint, not a style preference.
- **Shifts have two meanings.** A left shift multiplies by 2 and is arithmetic. A
  *logical* right shift on an unsigned value fills with zeros, while an *arithmetic*
  right shift on a signed value replicates the sign bit. `-1 >> 1` is `-1` arithmetically
  and a large positive number logically. Getting this wrong is a common and quiet bug.

Endianness matters when bits leave the machine. The byte layout of a word in memory
depends on the architecture, so serialising a word by writing its bytes produces
different on-disk representations on big-endian and little-endian machines. Numeric
values are unaffected; only the byte order is. Network protocols therefore specify
byte order explicitly rather than relying on the host's.

## Core Operations and Invariants
The primitives, each with its justification:

| Expression | Meaning | Why it holds |
|:--|:--|:--|
| `x & 1` | low bit | Bit 0 of the mask selects only the lowest position |
| `x & (x - 1)` | clears lowest set bit | Subtracting 1 flips the low set bit to 0 and all lower zeros to 1 |
| `x & -x` | isolates lowest set bit | Two's complement: `-x = ~x + 1` |
| `x & (1 << k)` | tests bit $k$ | A mask with a single bit selects only that position |
| `x \|= mask` | sets bit $k$ | OR with a set bit forces it on |
| `x &= ~mask` | clears bit $k$ | AND with a zero bit forces it off |
| `x ^= mask` | flips bit $k$ | XOR with a set bit inverts it |
| `x >> k` | divides by $2^k$ | Each position shifts down by $k$ places |

The two most useful are `x & (x - 1)` and `x & -x`, and they are worth deriving
rather than memorising.

**`x & (x - 1)` clears the lowest set bit.** Suppose $x$ has a 1 at position $k$ and
zeros below it. Then $x$ can be written as $H \cdot 2^{k+1} + 2^k$, where $H$ denotes
the part of $x$ above position $k$.

Subtracting one gives $x - 1 = H \cdot 2^{k+1} + 2^k - 1$, and the term
$2^k - 1$ is exactly $k$ ones in binary. So subtracting one leaves the higher bits
untouched, clears the bit at position $k$, and sets all $k$ lower bits to 1.

Masking with $x$ keeps only the bits $x$ itself has set: the bit at position $k$ is
now zero in $x-1$, and the newly set lower bits do not survive the AND because they
were zero in $x$. Exactly one set bit is removed, and it is the lowest.

**`x & -x` isolates it.** In two's complement, $-x = \sim x + 1$. Let $x$ be as
above. Then $\sim x$ has zeros at positions $0 \dots k$ and inverted higher bits;
adding 1 turns the low $k+1$ zeros into a carry that clears bit $k$ and sets bits
$0 \dots k-1$. Masking with $x$ keeps only bit $k$.

**Popcount.** The number of set bits. Kernighan's algorithm clears the lowest set bit
and counts, running once per set bit — $O(k)$ where $k$ denotes the popcount.
Hardware `POPCNT` makes this $O(1)$ on a word, which is one of the clearest cases
where the asymptotic bound is real in wall-clock terms.

## Correctness Argument
**XOR finds the odd one out.** Suppose every element appears an even number of
times except one, which appears an odd number of times. XOR all of them.
Cancellation works because XOR is associative and commutative, so the elements can
be reordered freely, and pairs can be grouped: each pair $x, x$ contributes
$x \oplus x = 0$, and $0$ annihilates. Every even-multiplicity group cancels
completely, and every odd-multiplicity group collapses to a single copy, because three copies
of $x$ XOR to $x$ — grouping them gives zero from the first pair, and zero XOR $x$
is $x$. Exactly one value
remains and it is the odd one out.

The argument shows what the technique requires: **every value must appear an even
number of times except the target**. Without that condition the answer is the XOR of
all the odd-multiplicity values, which may not be a single element. This is why
"XOR everything to find the odd one" fails on arbitrary input, and the failure looks
like a plausible number rather than an error.

**XOR pairs give a constant-time swap.** To swap $a$ and $b$ without a temporary:
`t = a ^ b; a = a ^ t; b = b ^ t`. Correctness: after the first line,
$t = a \oplus b$. Then $a' = a \oplus t = a \oplus a \oplus b = b$ by associativity
and self-inverse. Then $b' = b \oplus t = b \oplus a \oplus b = a$. So $a$ and $b$
are exchanged. It also works when $a$ and $b$ are the same variable, unlike the
temporary-swap version.

**Masking sets, clears and flips exactly one position.** For a mask $m$ with only bit
$k$ set and all others clear: `x | m` forces bit $k$ on and leaves every other bit
equal to $x$'s, because OR with 0 is identity and OR with 1 is 1. `x & ~m` forces
bit $k$ off and preserves the rest symmetrically. `x ^ m` inverts only bit $k$.
Each operation's effect is confined to one position by construction, which is what
makes multi-field manipulation safe.

**`x & (x - 1) != 0` tests for at least one set bit.** If $x = 0$ the expression is
0. Otherwise the derivation above shows it clears exactly one bit and leaves at least
one set. So the predicate is true exactly when $x$ is non-zero — the standard loop
condition for popcount and for stripping bits.

**Union-find on bit sets.** Represent a set as a word where bit $i$ means member $i$.
Union is `|`, intersection is `&`, difference is `& ~`, membership is `& (1 << i)`.
Correctness of each follows from the per-bit meaning: OR sets a bit if either
operand has it, AND if both, and each operation is independent per position, so
results compose exactly as the set operations specify. This gives $\Theta(W/64)$
operations for a set of $W$ elements — linear in the word count rather than in the
element count.

## Cost Derivations

### Why bitwise beats boolean arrays by a factor of the word size
A boolean array of $W$ elements needs $O(W)$ space and $O(W)$ work per operation,
one machine word per element. A bitset in $W/64$ words needs $O(W/64)$ space and
$O(W/64)$ work. The ratio is exactly 64 per operation for 64-bit words, and it is a
constant-factor gain, not an asymptotic one — both are $\Theta(W)$.

It becomes an *asymptotic* gain only when the operation is reducible to a small fixed
number of word operations. Subset-sum over a $k$-bit universe, for example, is $2^k$
boolean operations but $2^k / 64$ word operations — still exponential in $k$, still
$\Theta(2^k)$, but with a different constant. **No bit trick makes an exponential
problem polynomial**, and claiming otherwise is the most common error in this topic.

### Popcount
Kernighan's algorithm runs once per set bit, so $O(k)$ iterations for $k$ set bits —
$O(n)$ for $n$ bits. The word-level version parallelises across the 64 positions:
count in each byte, fold the bytes together with additions rather than shifts, and
popcount the single accumulated word. That reduces $64$ boolean operations to
roughly 10, so about a 6× constant-factor gain on hardware with `POPCNT`.

### XOR prefix over a range
XOR of all elements in $[l, r]$ is $\text{prefix}[r] \oplus \text{prefix}[l-1]$
because XOR is its own inverse, so $a \oplus b \oplus b = a$. The prefix array is
built once in $O(n)$ and each range query is then $O(1)$. This is a genuine
asymptotic improvement over an $O(r-l+1)$ scan, and it is the single most useful
XOR technique.

### Subset enumeration
Given a mask $m$, the standard idiom `for (int s = m; s; s = (s - 1) & m)` enumerates
every non-empty submask. `(s-1) & m` clears the lowest set bit of $s$ and keeps only
bits that were in $m$, so the sequence strictly decreases and every submask appears
exactly once. Iterating to $2^{\text{popcount}(m)}$ costs $O(2^k)$ for $k$ set bits —
exponential, but with no wasted iteration and no per-step cost beyond the arithmetic.

### Signed versus unsigned shifts
On a signed value, `>>` is arithmetic: the vacated high positions are filled with
copies of the sign bit, so `-1 >> 1 == -1`. On an unsigned value the fill is zero, so
`-1u >> 1` is $2^{31}-1$ for 32 bits. Both are single instructions, so this is a
constant-factor question — but it silently produces wrong answers for negative
values, which is why every bit routine should take `unsigned` parameters.

### The mask-shift idiom for powers of two
`1 << k` sets bit $k$. On a 32-bit signed type, `1 << 31` overflows to
`INT_MIN`, which is undefined behaviour, so the idiom must be `1u << k` or
`1ULL << k`. Cost is one shift, $O(1)$, regardless of $k$ — which is exactly why
bit-indexed lookup tables beat hash maps when the index is bounded.

## Limits

**No bitwise trick improves an algorithm's asymptotic complexity.** Every operation
here is $O(1)$ on a fixed-width word, so the number of operations is unchanged;
only constants move, by at most the word size. A problem needing $2^{30}$
enumeration needs $2^{30}$ operations whatever you do with masks. If you find a claim
that masking makes an exponential problem tractable, the word-size argument does not
support it.

**Fixed-width arithmetic cannot represent unbounded values.** Once arithmetic would
exceed the word width, you are into arbitrary-precision territory and the "one
operation does 64 bits" advantage evaporates into $O(W)$ limbs per operation. So the
techniques here apply to values known to fit — which is why they appear in bounded
index problems, not in arbitrary-precision arithmetic.

**Two's complement is universal but not architecturally guaranteed.** C++20 requires
two's complement, and the standard library provides `std::bit_cast` and
`std::popcount`, so the identities above are portable today. The portable formulation
is worth preferring over `-x` and `~x + 1` regardless, because the intent survives
a change of representation.

**There is no generally faster way to compute multiplication or division than the
machine's own instructions.** Bit tricks do not beat hardware `MUL`; they are useful
for *avoiding* a multiply by a constant (replacing it with shifts and adds, which is
what compilers already do) and for extracting fields, not for arithmetic itself.

**Concurrent bit manipulation needs atomics.** `a |= bit` is a read-modify-write, so
several threads doing it concurrently on the same word can lose updates. Correct
concurrent set operations need compare-and-swap loops or `fetch_or`/`fetch_and`, which
are $O(1)$ but far slower than a plain read-modify-write. **The bitwise operations'
indivisability is the main reason bit sets are hard to use concurrently** — the
instruction looks atomic but the compound assignment is not.

**What is not open.** The identities and the word-level tricks are settled. Open
questions are about model-relative bounds — for instance lower bounds for circuits
computing parity or sorting networks — rather than about practical bit manipulation,
which is fully understood.

## Trade-offs and When to Use
- **Use XOR when every value appears an even number of times except one**, or when
  you need an order-independent fold. XOR is the right tool for "what differs" and
  "what is odd" — and wrong for anything else, silently.
- **Use bit tests and masks for bounded indices.** A bitset beats a hash set or
  boolean array by a factor of the word size whenever the universe fits in a few
  words.
- **Use XOR prefix arrays for range-XOR queries.** Build once in $O(n)$, then answer
  in $O(1)$ — a real asymptotic win over rescanning.
- **Use submask enumeration rather than nested loops** over bit combinations. Same
  count, no wasted iteration.
- **Keep every bit routine `unsigned`.** Signed shifts and `1 << 31` are undefined
  behaviour, and the bugs are silent.
- **Reach for `std::popcount` and `std::bit_cast`** (C++20) rather than hand-rolled
  loops, both for correctness and for the hardware instruction.
- **Remember masks are not limited to one bit.** A multi-bit mask with a repeated
  pattern is how you divide by a power of two, round to a power of two, or test
  alignment — `x & ~(n-1)` rounds down to a multiple of $n$ for power-of-two $n$.
- **Do not expect bit tricks to help inherently sequential or branch-heavy work.**
  They shine when the problem is stated over independent bit positions.