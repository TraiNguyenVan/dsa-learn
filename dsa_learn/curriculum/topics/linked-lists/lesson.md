# Singly & Doubly Linked Lists

## Overview
A Linked List is a linear data collection whose elements are not stored at contiguous physical memory locations. Instead, each element (node) encapsulates a data payload and one or more explicit pointer addresses referencing adjacent nodes.

Unlike arrays, which have fixed memory allocations or expensive reallocation re-copies, linked lists allow instantaneous $O(1)$ insertions and removals at pointer locations without shifting remaining elements.

## Memory Anatomy & Pointer Linkage
In C++, a standard singly-linked node contains:
```cpp
template <typename T>
struct Node {
    T val;
    Node* next; // Pointer offset (8 bytes on 64-bit systems)
};
```
- **Heap Allocation Overhead**: Every node is independently allocated via `new` (or `std::unique_ptr`). This incurs allocator overhead and cache line misses during sequential traversal because nodes are dispersed throughout heap memory.
- **Doubly-Linked Lists**: Nodes include both `next` and `prev` pointers (16 bytes of pointer overhead per node), enabling bidirectional traversal and $O(1)$ deletion given a node pointer without traversing from `head`.
- **Sentinel / Dummy Nodes**: Prepending a dummy head node eliminates edge-case checks for updating the head pointer during insertions and deletions.

## Core Operations & Invariants
1. **Prepend (`push_front`)**: Create a new node, point its `next` to `head`, then update `head` to point to the new node ($O(1)$).
2. **Append (`push_back`)**: If a `tail` pointer is maintained, link `tail->next` to the new node ($O(1)$). Otherwise, traverse from `head` ($O(N)$).
3. **Deletion**: Re-wire the preceding node's pointer: `prev->next = curr->next`, followed by freeing `curr` to prevent memory leaks ($O(1)$ given `prev`).
4. **List Reversal Invariant**: Reversing a singly linked list requires tracking three pointer variables simultaneously: `prev = nullptr`, `curr = head`, `next = nullptr`. In each iteration:
   - Save next: `next = curr->next;`
   - Reverse link: `curr->next = prev;`
   - Advance prev: `prev = curr;`
   - Advance curr: `curr = next;`

## Correctness Argument

**Structural rewiring.** Every mutation maintains the list invariant:

> **Invariant.** Following `next` from `head` visits exactly the stored elements
> in order, each exactly once, and terminates at a `nullptr`.

*Prepend.* After `new->next = head; head = new;` the walk from `head` yields
`new` followed by the previous chain. Since the previous chain satisfied the
invariant and `new` is not in it, the new walk visits every element exactly once
in the right order and still terminates. Invariant preserved.

*Delete given a predecessor.* The step `prev->next = curr->next` replaces the
two-edge path `prev -> curr -> curr->next` with the single edge
`prev -> curr->next`. The walk from `head` now bypasses `curr` and reaches
exactly the same elements it reached after `curr` previously — every element
except `curr`, which is the intended removal. Because `curr` is unreachable from
`head` afterwards, freeing it cannot corrupt the list. **This is why deletion is
$O(1)$ given `prev`: no traversal is needed because the predecessor is already
known.** Without `prev`, finding it costs $O(N)$, which is why singly-linked
lists are slow to delete at an unknown position.

*Reversal.* Maintain the invariant that after $k$ iterations `prev` points to
the sublist consisting of the first $k$ original nodes fully reversed, and
`curr` points to the $(k{+}1)$-th original node with its remaining suffix intact.

- *Setup.* $k=0$: `prev = nullptr` is the correctly reversed empty list, `curr =
  head` is the untouched suffix. Holds.
- *Step.* The order matters and the proof shows why. **First** `next = curr->next`
  saves the suffix; skipping this destroys it, because the next line overwrites
  exactly that link. **Then** `curr->next = prev` extends the reversed prefix by
  `curr`, and only then do `prev = curr; curr = next;` advance. After the step,
  `prev` is the reversal of the first $k{+}1$ nodes and `curr` heads the intact
  remainder. Invariant preserved.
- *Termination.* The walk follows `next` and each node is distinct, so it
  terminates. On exit `curr == nullptr`, meaning no suffix remains, so `prev`
  points to the reversal of *all* $N$ nodes. Assigning `head = prev` completes it.

**Cycle detection terminates.** Floyd's algorithm alternates `slow` advancing
one edge and `fast` advancing two. First suppose both are in the tail. Once
`fast` is inside the cycle, on every subsequent step `fast` gains exactly one
node on `slow` in relative position. Relative distance is a positive integer
bounded by the cycle length and it strictly decreases, so it reaches zero within
at most one cycle length. Therefore the algorithm always terminates and always
reports correctly.

The second, symmetric argument: if they meet at a node $x$ inside the cycle,
then walking from `head` must eventually pass through $x$, so a cycle *is*
reachable from `head`. If the list has no cycle, `fast` reaches `nullptr` first
and the algorithm reports absence.

## Cost Derivations

### Pointer arithmetic is O(1); traversal is not
Reading or writing one field is a single dereference: compute an address from a
base register, load it. There is no arithmetic in $N$ and no search, so every
pointer operation is $O(1)$ regardless of list length.

Every traversal is therefore $O(N)$: visiting node $i$ requires following $i$
edges, and the sum of 1 over $i = 1 \dots N$ is $N$. This is the recurring
pattern — the *operations* are constant, and any cost that depends on position
comes from having to find that position first.

### The operation costs that surprise people
- **Prepend: $O(1)$.** Three pointer assignments. Independent of $N$.
- **Delete at head: $O(1)$.** `head = head->next; delete old;`
- **Delete at a known node: $O(1)$.** The predecessor's link is rewired. The
  search for the predecessor is not counted because the caller supplies it.
- **Delete at an unknown index $k$: $O(N)$.** You must reach the predecessor,
  which is $k$ edges away. This is the *only* reason singly-linked deletion can be
  linear, and it is a search cost, not a mutation cost.
- **Access by index $k$: $O(k)$.** Random access does not exist; you walk.
- **Append without a tail pointer: $O(N)$.** With a maintained `tail`, $O(1)$.
  This is a one-line field that converts a linear operation into a constant one,
  and forgetting it is the most common linked-list performance bug.

### Space and locality
Per node, a singly-linked node stores a value plus one pointer — 8 bytes of
overhead on a 64-bit machine, which can exceed the payload for small types. The
whole list costs $\Theta(N)$ space, and the nodes themselves are scattered across
the heap, so a traversal incurs roughly one cache miss per node. Traversing a
contiguous array of the same values is bandwidth-bound instead of latency-bound,
and is typically an order of magnitude faster in wall-clock terms despite having
the identical $O(N)$ bound.

**Equal asymptotic cost, very different constant.** This is the honest summary of
linked lists versus arrays.

### Cycle detection
Each iteration does $O(1)$ work: two steps for `fast`, one for `slow`, one
comparison. The iteration count is bounded by the tail length plus one cycle
length, each at most $N$, so the total is $O(N)$ time and — unlike the hash-set
method, which stores every node visited — $O(1)$ space.

## Limits

**There is no faster way to search a list.** Two notations recur below: $\Omega(g(n))$
denotes the asymptotic lower-bound notation, a function growing at least as fast
as $g(n)$; and $\log$ denotes a logarithm whose base is irrelevant up to a
constant factor. Since no ordering is maintained, finding an element requires
examining every node in the worst case, so $\Omega(N)$ is a lower bound and no
clever technique beats it. This is a
structural limit, not an implementation weakness: to do better you must maintain
order, which is exactly what a balanced search tree does at the cost of
$\Omega(\log N)$ per insertion to keep that order valid.

**Self-balancing trees cost log-factor insertions to gain log-factor lookups.**
A tree or skip list supports $O(\log N)$ index access by maintaining an order
that a list does not have, and pays for it on every insertion. So the honest
framing is a trade, not a strict improvement: pay $\log N$ on writes to save
$\log N$ on reads. A workload that is append-only and read once should use a
list; a workload with many finds and few writes should use a tree.

**Contiguity cannot be recovered.** A list can never match an array's cache
behaviour, because the memory layout is not under the structure's control. This
caps the practical gain from pointer-heavy designs, and it is why contiguous
containers win in practice even when a list has the better *asymptotic* bound on
paper.

**What is genuinely hard.** Concurrent linked structures are the hard part, and
the limits there are not asymptotic. Lock-free singly-linked lists are
straightforward because one pointer can be changed atomically. Deletion from the
middle requires either a lock or the Harris/Michael hazard-pointer or
epoch-based reclamation scheme, because the memory may be freed while another
thread is still reading it. These schemes are correct but subtle, and the
practical cost is contention rather than operations per second.

**Doubly-linked lists trade space for a specific convenience.** They make
$O(1)$ deletion possible when you hold only the node itself, at the price of a
second pointer per node and a second link to maintain on every mutation. The
constant-factor cost is real: two writes per splice instead of one, so an
append-heavy workload is measurably slower than on a singly-linked list.

##

## Trade-offs & When to Use
- **Use Linked Lists when**: Frequent insertions and removals occur at the head or known positions, total collection size is unpredictable, or memory fragmentation prevents large contiguous array allocations.
- **Avoid Linked Lists when**: Random access by index is required ($O(N)$ lookup) or cache-friendly sequential iteration over primitive values is desired.
- **Consider a deque, vector, or ring buffer instead when** the access pattern is ends-only: they offer the same $O(1)$ push and pop while keeping elements contiguous, which is strictly better on memory locality.
- **The framework question worth asking**: a list is justified when you already hold a pointer to the position you need. If you do not, the $O(N)$ search dominates and the $O(1)$ insertion never pays off.
