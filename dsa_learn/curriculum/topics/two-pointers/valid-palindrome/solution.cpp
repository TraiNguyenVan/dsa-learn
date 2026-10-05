#include <string>
#include <cctype>

/**
 * Canonical Solution: Two Pointers inward scan
 * Time Complexity:  O(N)
 * Space Complexity: O(1)
 */
bool isPalindrome(const std::string& s) {
    int left = 0;
    int right = static_cast<int>(s.size()) - 1;

    while (left < right) {
        while (left < right && !std::isalnum(static_cast<unsigned char>(s[left]))) {
            left++;
        }
        while (left < right && !std::isalnum(static_cast<unsigned char>(s[right]))) {
            right--;
        }
        if (std::tolower(static_cast<unsigned char>(s[left])) != 
            std::tolower(static_cast<unsigned char>(s[right]))) {
            return false;
        }
        left++;
        right--;
    }
    return true;
}
