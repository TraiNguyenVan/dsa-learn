# Coin Change

## Problem Description

You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money.

Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return `-1`.

You may assume that you have an infinite number of each kind of coin.

## Constraints

- $1 \le \text{coins.length} \le 12$
- $1 \le \text{coins}[i] \le 2^{31} - 1$
- $0 \le \text{amount} \le 10^4$

## Target Complexity

- **Time Complexity**: $O(A \cdot C)$
- **Space Complexity**: $O(A)$

## Examples

### Example 1
```text
Input: coins = [1, 2, 5], amount = 11
Output: 3
Explanation: 11 = 5 + 5 + 1
```

### Example 2
```text
Input: coins = [2], amount = 3
Output: -1
```

### Example 3
```text
Input: coins = [1], amount = 0
Output: 0
```
