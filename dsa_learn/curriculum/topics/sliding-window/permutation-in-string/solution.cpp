#include <string>
#include <array>

bool checkInclusion(const std::string& s1, const std::string& s2) {
    int n1 = static_cast<int>(s1.length());
    int n2 = static_cast<int>(s2.length());
    if (n1 > n2) return false;

    std::array<int, 26> count1{}, count2{};
    for (int i = 0; i < n1; ++i) {
        count1[s1[i] - 'a']++;
        count2[s2[i] - 'a']++;
    }

    if (count1 == count2) return true;

    for (int i = n1; i < n2; ++i) {
        count2[s2[i] - 'a']++;
        count2[s2[i - n1] - 'a']--;
        if (count1 == count2) return true;
    }

    return false;
}
