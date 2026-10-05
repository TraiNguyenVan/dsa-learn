#include <vector>

struct ListNode {
    int val;
    ListNode* next;
    ListNode(int x) : val(x), next(nullptr) {}
};

class LinkedList {
private:
    ListNode* head;
    int size;

public:
    LinkedList() {
        head = nullptr;
        size = 0;
    }

    ~LinkedList() {
        // TODO: Deallocate all nodes in the list
    }

    int get(int index) const {
        // TODO: Return value at 0-indexed position, or -1 if invalid
        (void)index;
        return -1;
    }

    void insertHead(int val) {
        // TODO: Insert node with val at the head
        (void)val;
    }

    void insertTail(int val) {
        // TODO: Insert node with val at the tail
        (void)val;
    }

    bool remove(int index) {
        // TODO: Remove node at index. Return true if removed, false if invalid
        (void)index;
        return false;
    }

    std::vector<int> getValues() const {
        // TODO: Return vector of values in head-to-tail order
        return {};
    }
};
