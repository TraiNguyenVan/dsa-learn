#include <vector>
#include <stack>
#include <algorithm>

class MinStack {
private:
    std::stack<int> s;
    std::stack<int> min_s;
public:
    MinStack() {}
    void push(int val) {
        s.push(val);
        if (min_s.empty() || val <= min_s.top()) {
            min_s.push(val);
        }
    }
    void pop() {
        if (!s.empty()) {
            if (s.top() == min_s.top()) {
                min_s.pop();
            }
            s.pop();
        }
    }
    int top() {
        return s.top();
    }
    int getMin() {
        return min_s.top();
    }
};
