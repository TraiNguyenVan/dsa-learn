/**
 * Canonical Solution: Dynamic Programming (space-optimized Fibonacci)
 * Time Complexity:  O(N)
 * Space Complexity: O(1)
 */
int climbStairs(int n) {
    if (n <= 2) return n;
    int prev2 = 1;
    int prev1 = 2;
    for (int i = 3; i <= n; ++i) {
        int curr = prev1 + prev2;
        prev2 = prev1;
        prev1 = curr;
    }
    return prev1;
}
