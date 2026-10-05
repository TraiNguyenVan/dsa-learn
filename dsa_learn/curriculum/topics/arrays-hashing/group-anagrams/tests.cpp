#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>
#include <string>
#include <algorithm>

static void normalize(std::vector<std::vector<std::string>>& res) {
    for (auto& group : res) {
        std::sort(group.begin(), group.end());
    }
    std::sort(res.begin(), res.end());
}

TEST_FUNCTIONAL("Standard example") {
    std::vector<std::string> strs = {"eat", "tea", "tan", "ate", "nat", "bat"};
    auto actual = groupAnagrams(strs);
    normalize(actual);
    ASSERT_EQ(static_cast<int>(actual.size()), 3);
}

TEST_BOUNDARY("Single character string") {
    std::vector<std::string> strs = {"a"};
    auto actual = groupAnagrams(strs);
    ASSERT_EQ(static_cast<int>(actual.size()), 1);
    ASSERT_EQ(actual[0], std::vector<std::string>{"a"});
}

TEST_COMPLEXITY("10,000 strings complexity check") {
    std::vector<std::string> strs(10000, "abc");
    auto actual = groupAnagrams(strs);
    ASSERT_EQ(static_cast<int>(actual.size()), 1);
    ASSERT_EQ(static_cast<int>(actual[0].size()), 10000);
}
