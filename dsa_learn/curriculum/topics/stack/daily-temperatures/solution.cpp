#include <vector>
#include <stack>

std::vector<int> dailyTemperatures(const std::vector<int>& temperatures) {
    int n = static_cast<int>(temperatures.size());
    std::vector<int> res(n, 0);
    std::stack<int> st; // indices

    for (int i = 0; i < n; ++i) {
        while (!st.empty() && temperatures[i] > temperatures[st.top()]) {
            int prev_idx = st.top();
            st.pop();
            res[prev_idx] = i - prev_idx;
        }
        st.push(i);
    }
    return res;
}
