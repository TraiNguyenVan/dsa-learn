# Kth Largest Element in a Stream

## Problem Description

Design a class to find the $k^{\text{th}}$ largest element in a stream. Note that it is the $k^{\text{th}}$ largest element in the sorted order, not the $k^{\text{th}}$ distinct element.

Implement `KthLargest` class:
- `KthLargest(int k, vector<int>& nums)` Initializes the object with the integer `k` and the stream of integers `nums`.
- `int add(int val)` Appends the integer `val` to the stream and returns the element representing the $k^{\text{th}}$ largest element in the stream.

## Constraints

- $1 \le k \le 10^4$
- $0 \le \text{nums.length} \le 10^4$
- $-10^4 \le \text{nums}[i], \text{val} \le 10^4$
- At most $10^4$ calls will be made to `add`.
- It is guaranteed that there will be at least $k$ elements in the array when you search for the $k^{\text{th}}$ element.

## Target Complexity

- **Time Complexity**: $O(\log K)$
- **Space Complexity**: $O(K)$

## Examples

### Example 1
```text
Input:
["KthLargest", "add", "add", "add", "add", "add"]
[[3, [4, 5, 8, 2]], [3], [5], [10], [9], [4]]

Output:
[null, 4, 5, 5, 8, 8]

Explanation:
KthLargest kthLargest = new KthLargest(3, [4, 5, 8, 2]);
kthLargest.add(3);   // return 4
kthLargest.add(5);   // return 5
kthLargest.add(10);  // return 5
kthLargest.add(9);   // return 8
kthLargest.add(4);   // return 8
```
