# Container With Most Water

## Problem Description

You are given an integer array `height` of length $n$. There are $n$ vertical lines drawn such that the two endpoints of the $i^{\text{th}}$ line are $(i, 0)$ and $(i, \text{height}[i])$.

Find two lines that together with the x-axis form a container, such that the container contains the most water.

Return the maximum amount of water a container can store. Notice that you may not slant the container.

## Constraints

- $n == \text{height.length}$
- $2 \le n \le 10^5$
- $0 \le \text{height}[i] \le 10^4$

## Target Complexity

- **Time Complexity**: $O(N)$
- **Space Complexity**: $O(1)$

## Examples

### Example 1
```text
Input: height = [1, 8, 6, 2, 5, 4, 8, 3, 7]
Output: 49
Explanation: The vertical lines are represented by array [1, 8, 6, 2, 5, 4, 8, 3, 7]. The max area is between index 1 and index 8, area = min(8, 7) * (8 - 1) = 49.
```

### Example 2
```text
Input: height = [1, 1]
Output: 1
```
