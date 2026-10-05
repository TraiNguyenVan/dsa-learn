# Design Dynamic Array (Vector)

## Problem Description

Design a resizable dynamic array (similar to `std::vector<int>` in C++) with geometric growth.

Implement the `DynamicArray` class:
- `DynamicArray(int capacity = 2)`: Initializes the dynamic array with an initial capacity. The initial size is 0.
- `int get(int i) const`: Returns the element at index `i`.
- `void set(int i, int n)`: Overwrites the element at index `i` with value `n`.
- `void push_back(int n)`: Appends element `n` to the end of the array. If the array is full (`size == capacity`), double its capacity before appending.
- `int pop_back()`: Removes and returns the last element from the array.
- `int size() const`: Returns the number of elements currently stored.
- `int get_capacity() const`: Returns the total buffer capacity.
- `~DynamicArray()`: Destructor that releases allocated heap memory.

## Examples

### Example 1

```text
Input:
DynamicArray arr(2);
arr.push_back(1);
arr.push_back(2);
arr.push_back(3);
arr.size();
arr.get_capacity();

Output:
arr.size() => 3
arr.get_capacity() => 4
```

## Constraints

- `capacity >= 1`
- `0 <= i < size` for `get` and `set`
- Values appended are in range `[-10^5, 10^5]`
- At most `50,000` calls will be made to `push_back`, `pop_back`, `get`, `set`

## Target Complexity

- **Time Complexity**: $O(1)$ amortized for `push_back`, $O(1)$ for `get` and `set`
- **Space Complexity**: $O(N)$ auxiliary memory
