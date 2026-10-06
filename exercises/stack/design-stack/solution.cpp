#include <stdexcept>

// A fixed-capacity stack with an explicit `full` state -- deliberately not
// `std::stack`, whose underlying `std::vector` grows and can never report full.
class BoundedStack {
private:
    int* data;
    int cap;
    int count;

public:
    explicit BoundedStack(int capacity)
        // TODO: initialise the buffer on the heap with `capacity` slots. A
        // non-positive capacity falls back to 1.
        : cap(capacity > 0 ? capacity : 1), count(0) {
    }

    ~BoundedStack() {
        // TODO: release the heap buffer.
    }

    BoundedStack(const BoundedStack&) = delete;
    BoundedStack& operator=(const BoundedStack&) = delete;

    void push(int value) {
        // TODO: throw std::overflow_error when full, else store and grow the height.
        (void)value;
    }

    int pop() {
        // TODO: throw std::out_of_range when empty, else return data[--count].
        return 0;
    }

    int peek() const {
        // TODO: throw std::out_of_range when empty, else return the top element
        // without removing it.
        (void)0;
        return 0;
    }

    bool empty() const {
        // TODO: true when the height is 0.
        (void)0;
        return false;
    }

    bool full() const {
        // TODO: true when the height equals the capacity.
        (void)0;
        return false;
    }

    int size() const {
        // TODO: return the current height.
        return 0;
    }

    int capacity() const {
        // TODO: return the fixed capacity.
        return 0;
    }

    void clear() {
        // TODO: reset the height to 0; the buffer keeps its contents.
    }
};
