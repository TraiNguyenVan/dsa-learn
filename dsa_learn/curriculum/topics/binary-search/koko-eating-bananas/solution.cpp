#include <vector>
#include <algorithm>

int minEatingSpeed(const std::vector<int>& piles, int h) {
    int low = 1;
    int high = *std::max_element(piles.begin(), piles.end());
    int ans = high;

    while (low <= high) {
        int mid = low + (high - low) / 2;
        long long hours = 0;
        for (int p : piles) {
            hours += (p + mid - 1LL) / mid;
        }

        if (hours <= h) {
            ans = mid;
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }
    return ans;
}
