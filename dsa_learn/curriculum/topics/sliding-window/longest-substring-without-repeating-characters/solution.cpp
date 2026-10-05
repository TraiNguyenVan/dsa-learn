#include <string>
#include <vector>
#include <algorithm>

int lengthOfLongestSubstring(const std::string& s) {
    std::vector<int> last_idx(256, -1);
    int max_len = 0;
    int left = 0;

    for (int right = 0; right < static_cast<int>(s.length()); ++right) {
        unsigned char c = static_cast<unsigned char>(s[right]);
        if (last_idx[c] >= left) {
            left = last_idx[c] + 1;
        }
        last_idx[c] = right;
        max_len = std::max(max_len, right - left + 1);
    }
    return max_len;
}
