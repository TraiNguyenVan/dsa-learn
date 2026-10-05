#include <stdexcept>

class DynamicArray {
private:
    int* data;
    int capacity;
    int length;

    void resize() {
        int new_cap = capacity * 2;
        int* next = new int[new_cap];
        for (int i = 0; i < length; ++i) {
            next[i] = data[i];
        }
        delete[] data;
        data = next;
        capacity = new_cap;
    }

public:
    DynamicArray(int cap = 2) {
        capacity = cap > 0 ? cap : 2;
        length = 0;
        data = new int[capacity];
    }

    ~DynamicArray() {
        delete[] data;
    }

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

    int size() const {
        return length;
    }

    int get_capacity() const {
        return capacity;
    }
};
