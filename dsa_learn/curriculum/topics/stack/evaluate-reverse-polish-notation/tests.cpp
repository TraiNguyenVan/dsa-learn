#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>
#include <string>

TEST_FUNCTIONAL("Simple expression") {
    std::vector<std::string> tokens = {"2", "1", "+", "3", "*"};
    ASSERT_EQ(evalRPN(tokens), 9);
}

TEST_FUNCTIONAL("Complex expression with division") {
    std::vector<std::string> tokens = {"4", "13", "5", "/", "+"};
    ASSERT_EQ(evalRPN(tokens), 6);
}

TEST_BOUNDARY("Single number") {
    std::vector<std::string> tokens = {"42"};
    ASSERT_EQ(evalRPN(tokens), 42);
}

TEST_COMPLEXITY("Large token list O(N) check") {
    std::vector<std::string> tokens;
    tokens.push_back("0");
    for (int i = 0; i < 20000; ++i) {
        tokens.push_back("1");
        tokens.push_back("+");
    }
    ASSERT_EQ(evalRPN(tokens), 20000);
}
