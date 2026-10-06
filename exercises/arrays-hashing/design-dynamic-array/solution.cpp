#include <stdexcept>

class DynamicArray {
private:
    int* data;
    int capacity;
    int length;
    int resize_count;

    void resize() {
        // TODO: allocate a buffer of twice the capacity, copy `length` elements
        // across, release the old buffer, and bump `resize_count`.
        (void)0;
    }

public:
    DynamicArray(int cap = 2) {
        // TODO: initialise the buffer on the heap with `capacity` slots.
        capacity = cap > 0 ? cap : 2;
        length = 0;
        resize_count = 0;
        data = nullptr;
    }

    ~DynamicArray() {
        // TODO: release the heap buffer.
    }

    // Copying is forbidden because the raw buffer would be double-freed. The
    // reference implementation declares these deleted; keep them.
    DynamicArray(const DynamicArray&) = delete;
    DynamicArray& operator=(const DynamicArray&) = delete;

    int get(int i) const {
        // TODO: throw std::out_of_range unless 0 <= i < length, then return data[i].
        (void)i;
        return 0;
    }

    void set(int i, int n) {
        // TODO: throw std::out_of_range unless 0 <= i < length, then assign.
        (void)i;
        (void)n;
    }

    void push_back(int n) {
        // TODO: resize when length == capacity, then store at data[length++].
        (void)n;
    }

    int pop_back() {
        // TODO: throw std::out_of_range when empty, else return data[--length].
        return 0;
    }

    void clear() {
        // TODO: reset length to 0 (capacity is retained).
        (void)0;
    }

    int size() const {
        return length;
    }

    int get_capacity() const {
        return capacity;
    }

    int resizes() const {
        // TODO: return how many times the buffer has been reallocated.
        return 0;
    }
};
