# Design a Backtracking Choice Stack

## Problem Description

Design the explicit undo-and-memo structure that backtracking searches run on.

Implement the `ChoiceStack` class:
- `ChoiceStack()`: Starts with no branch, nothing refused, zero backtracks.
- `void push_choice(int choice)`: Extends the current branch.
- `int pop_choice()`: Undoes the most recent choice and returns it. Throws `std::out_of_range` when the branch is empty.
- `int depth() const`: Number of choices on the current branch.
- `int at(int i) const`: Choice at index `i`. Throws `std::out_of_range` unless `0 <= i < depth()`.
- `bool tried(int candidate) const`: Whether this exact candidate has already been refused here.
- `void mark_tried(int candidate)`: Records that this candidate leads nowhere.
- `bool is_backtracking() const`: True once at least one choice has been undone.
- `int backtrack_count() const`: How many choices have been undone.
- `int tried_at_current_depth() const`: How many distinct branches have been refused at exactly the current depth.
- `void reset()`: Clears the branch, the refusals, and the backtrack count.

## Undo is the defining operation

Backtracking is not "try a candidate". It is *try, and put everything back* — the recursive call returns, and the caller has to be exactly as it was. In a recursive search that undo is invisible: it happens in the return path and nobody can observe it.

Here it is a first-class operation. `pop_choice` undoes one level and counts it, so `backtrack_count` is a direct readout of how much work the search threw away. A search that returns without exploring is a search that never backtracked, and that is now checkable rather than assumed.

## The memo, and why the key must include the path

`tried` records branches that have been proved dead. Without it, an exponential search re-walks shared dead suffixes over and over, and the cost is invisible — the search is merely slow.

Two properties of the key matter, and both are easy to get wrong:

- **The same candidate at two depths is two different branches.** Path `[1]` + candidate `9` and path `[1, 2]` + candidate `9` are unrelated. A key that hashes only the candidate would make one poison the other, and the search would return wrong answers.
- **A prefix match is not a depth match.** `tried_at_current_depth` must count only branches refused *at* this depth. A descendant's key also begins with this path's text, so matching the prefix alone reports a child's refusals as the parent's. Only a key with no further separator after the prefix belongs here.

That second rule is the exact bug a prefix-based implementation produces, and it silently corrupts the count that looks like search progress.

## Examples

### Example 1

```text
ChoiceStack stack;
stack.push_choice(1);
stack.push_choice(2);
stack.depth();
stack.pop_choice();
stack.backtrack_count();
stack.is_backtracking();

Output:
stack.depth() => 2
stack.pop_choice() => 2
stack.backtrack_count() => 1
stack.is_backtracking() => true
```

### Example 2 — the memo is depth-sensitive

```text
ChoiceStack stack;
stack.push_choice(1);
stack.mark_tried(9);
stack.tried(9);          // => true  at path [1]

stack.push_choice(2);
stack.tried(9);          // => false at path [1, 2]
```

## Constraints

- Choices are `int` in range `[INT_MIN, INT_MAX]`
- At most `10^5` choices live on the branch at once and at most `10^6` mutating calls are made
- `pop_choice` and `at` may be called out of range

## Target Complexity

- **Time Complexity**: $O(1)$ amortized for `push_choice` / `pop_choice` / `depth` / `at`, expected $O(1)$ for `tried` / `mark_tried`, $O(R)$ for `tried_at_current_depth` over $R$ recorded refusals, and $O(D + R)$ for `reset`
- **Space Complexity**: $O(D)$ for the branch and $O(R \cdot L)$ for the memo keys, where $D$ is the depth and $R$ the number of refusals
