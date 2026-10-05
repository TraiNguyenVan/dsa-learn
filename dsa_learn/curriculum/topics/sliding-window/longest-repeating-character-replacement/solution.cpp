#include <string>
#include <vector>
#include <algorithm>

int characterReplacement(const std::string& s, int k) {
    std::vector<int> count(26, 0);
    int max_freq = 0;
    int max_len = 0;
    int left = 0;

    for (int right = 0; right < static_cast<int>(s.length()); ++right) {
        count[s[right] - 'A']++;
        max_freq = std::max(max_freq, count[s[right] - 'A']);

        while ((right - left + 1) - max_freq > k) {
            count[s[left] - 'A']--;
            ++left;
        }

        max_len = std::max(max_len, right - left + 1);
    }
    return max_len;
}
