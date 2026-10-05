#include <string>
#include <stack>

/**
 * Canonical Solution: LIFO Stack
 * Time Complexity:  O(N)
 * Space Complexity: O(N)
 */
bool isValid(const std::string& s) {
    if (s.length() % 2 != 0) {
        return false;
    }

    std::stack<char> st;
    for (char c : s) {
        if (c == '(' || c == '{' || c == '[') {
            st.push(c);
        } else {
            if (st.empty()) {
                return false;
            }
            char top = st.top();
            st.pop();
            if ((c == ')' && top != '(') ||
                (c == '}' && top != '{') ||
                (c == ']' && top != '[')) {
                return false;
            }
        }
    }

    return st.empty();
}
