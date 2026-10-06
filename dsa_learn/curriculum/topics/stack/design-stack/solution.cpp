#include <stdexcept>

// Bounded stack.
//
// A fixed-capacity buffer with an explicit `full` state. The point of the bound is
// that `full` and `empty` are *distinguishable*, which is why this is not
// `std::stack`: `std::vector` grows, so it can never report full. Overflow is
// therefore an error here rather than an allocation, and every operation stays
// O(1) with no reallocation and no amortization to reason about.
class BoundedStack {
private:
    int* data;
    int cap;
    int count;  // number of live elements; the next push writes at data[count]

public:
    explicit BoundedStack(int capacity)
        : cap(capacity > 0 ? capacity : 1), count(0) {
        data = new int[cap];
    }

    ~BoundedStack() {
        delete[] data;
    }

    // Copying would duplicate the raw pointer and leave two owners of one buffer.
    BoundedStack(const BoundedStack&) = delete;
    BoundedStack& operator=(const BoundedStack&) = delete;

    void push(int value) {
        if (count == cap) {
            throw std::overflow_error("Stack is full");
        }
        data[count++] = value;
    }

    int pop() {
        if (count == 0) {
            throw std::out_of_range("Stack is empty");
        }
        return data[--count];
    }

    int peek() const {
        if (count == 0) {
            throw std::out_of_range("Stack is empty");
        }
        return data[count - 1];
    }

    bool empty() const {
        return count == 0;
    }

    bool full() const {
        return count == cap;
    }

    int size() const {
        return count;
    }

    int capacity() const {
        return cap;
    }

    void clear() {
        // Only the height moves. The buffer keeps its contents but they are
        // logically dead, which is exactly why `count` is the sole source of truth
        // for emptiness -- reading `data[count - 1]` is what `peek` means.
        count = 0;
    }
};
