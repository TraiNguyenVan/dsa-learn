#include <string>
#include <array>

/**
 * Canonical Solution: Fixed 26-element frequency table
 * Time Complexity:  O(N)
 * Space Complexity: O(1) auxiliary
 */
bool isAnagram(const std::string& s, const std::string& t) {
    if (s.length() != t.length()) {
        return false;
    }

    std::array<int, 26> count{};
    for (size_t i = 0; i < s.length(); ++i) {
        count[s[i] - 'a']++;
        count[t[i] - 'a']--;
    }

    for (int diff : count) {
        if (diff != 0) {
            return false;
        }
    }
    return true;
}
