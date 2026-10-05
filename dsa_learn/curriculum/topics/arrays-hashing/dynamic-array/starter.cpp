#include <stdexcept>

class DynamicArray {
private:
    int* data;
    int capacity;
    int length;

    void resize() {
        // TODO: Allocate doubled buffer and copy elements over
    }

public:
    DynamicArray(int cap = 2) {
        // TODO: Initialize buffer on heap
        capacity = cap > 0 ? cap : 2;
        length = 0;
        data = nullptr;
    }

    ~DynamicArray() {
        // TODO: Clean up heap buffer
    }

    int get(int i) const {
        // TODO: Return element at index i
        (void)i;
        return 0;
    }

    void set(int i, int n) {
        // TODO: Set element at index i to n
        (void)i;
        (void)n;
    }

    void push_back(int n) {
        // TODO: Push element, resizing if length == capacity
        (void)n;
    }

    int pop_back() {
        // TODO: Pop and return last element
        return 0;
    }

    int size() const {
        return length;
    }

    int get_capacity() const {
        return capacity;
    }
};
