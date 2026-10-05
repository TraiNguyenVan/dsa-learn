# Koko Eating Bananas

## Problem Description

Koko loves to eat bananas. There are $n$ piles of bananas, the $i^{\text{th}}$ pile has `piles[i]` bananas. The guards have gone and will come back in $h$ hours.

Koko can decide her bananas-per-hour eating speed of $k$. Each hour, she chooses some pile of bananas and eats $k$ bananas from that pile. If the pile has less than $k$ bananas, she eats all of them instead and will not eat any more bananas during this hour.

Koko likes to eat slowly but still wants to finish eating all the bananas before the guards return.

Return the minimum integer $k$ such that she can eat all the bananas within $h$ hours.

## Constraints

- $1 \le \text{piles.length} \le 10^4$
- $\text{piles.length} \le h \le 10^9$
- $1 \le \text{piles}[i] \le 10^9$

## Target Complexity

- **Time Complexity**: $O(N \log(\max))$
- **Space Complexity**: $O(1)$

## Examples

### Example 1
```text
Input: piles = [3, 6, 7, 11], h = 8
Output: 4
```

### Example 2
```text
Input: piles = [30, 11, 23, 4, 20], h = 5
Output: 30
```

### Example 3
```text
Input: piles = [30, 11, 23, 4, 20], h = 6
Output: 23
```
