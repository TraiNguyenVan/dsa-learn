#include <vector>
#include <algorithm>

/**
 * Canonical Solution: Dynamic minimum price tracking
 * Time Complexity:  O(N)
 * Space Complexity: O(1) auxiliary
 */
int maxProfit(const std::vector<int>& prices) {
    if (prices.empty()) {
        return 0;
    }

    int min_price = prices[0];
    int max_profit = 0;

    for (size_t i = 1; i < prices.size(); ++i) {
        if (prices[i] < min_price) {
            min_price = prices[i];
        } else {
            max_profit = std::max(max_profit, prices[i] - min_price);
        }
    }

    return max_profit;
}
