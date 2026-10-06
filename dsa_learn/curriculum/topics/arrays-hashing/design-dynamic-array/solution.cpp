#include <stdexcept>

// Geometric-growth dynamic array.
//
// The amortization argument the lesson derives: a push that does not resize is
// O(1); a push that resizes costs O(length) to copy. Because capacity doubles,
// the number of resizes needed for N pushes is floor(log2(N)) + 1, so the total
// copying work is sum over doublings, which is a geometric series dominated by
// its last term -- hence O(N) total, O(1) amortized per push. `resizes()` below
// exposes that rescale count so the bound is observable rather than asserted.
class DynamicArray {
private:
    int* data;
    int capacity;
    int length;
    int resize_count;

    void resize() {
        int new_cap = capacity * 2;
        int* next = new int[new_cap];
        for (int i = 0; i < length; ++i) {
            next[i] = data[i];
        }
        delete[] data;
        data = next;
        capacity = new_cap;
        ++resize_count;
    }

public:
    DynamicArray(int cap = 2) {
        capacity = cap > 0 ? cap : 2;
        length = 0;
        resize_count = 0;
        data = new int[capacity];
    }

    ~DynamicArray() {
        delete[] data;
    }

    // Non-copyable: the raw buffer would be double-freed. Not taught by this
    // exercise, but a correct reference has to say so.
    DynamicArray(const DynamicArray&) = delete;
    DynamicArray& operator=(const DynamicArray&) = delete;

    int get(int i) const {
        if (i < 0 || i >= length) {
            throw std::out_of_range("Index out of range");
        }
        return data[i];
    }

    void set(int i, int n) {
        if (i < 0 || i >= length) {
            throw std::out_of_range("Index out of range");
        }
        data[i] = n;
    }

    void push_back(int n) {
        if (length == capacity) {
            resize();
        }
        data[length++] = n;
    }

    int pop_back() {
        if (length == 0) {
            throw std::out_of_range("Array is empty");
        }
        return data[--length];
    }

    void clear() {
        length = 0;
    }

    int size() const {
        return length;
    }

    int get_capacity() const {
        return capacity;
    }

    int resizes() const {
        return resize_count;
    }
};
