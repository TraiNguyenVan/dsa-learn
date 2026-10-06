#include <stdexcept>

struct ListNode {
    int value;
    ListNode* prev;
    ListNode* next;
    ListNode(int v) : value(v), prev(nullptr), next(nullptr) {}
};

// Doubly linked list: because every node also stores a `prev` pointer, deleting a
// known node needs no predecessor search. Every chain-changing operation must
// therefore update *two* pointers, and one missed re-link silently creates a cycle.
class DoublyLinkedList {
private:
    ListNode* head;
    ListNode* tail;
    int count;

public:
    DoublyLinkedList()
        // TODO: start with no head, no tail, and a count of 0.
        : head(nullptr), tail(nullptr), count(0) {
    }

    ~DoublyLinkedList() {
        // TODO: release every node.
    }

    DoublyLinkedList(const DoublyLinkedList&) = delete;
    DoublyLinkedList& operator=(const DoublyLinkedList&) = delete;

    int size() const {
        // TODO: return the node count.
        return 0;
    }

    bool empty() const {
        // TODO: true when there are no nodes.
        (void)0;
        return false;
    }

    bool is_consistent() const {
        // TODO: walk the chain forwards and backwards and confirm that each node's
        // `next->prev` points back at it, that the chain terminates, and that head
        // and tail are where the count says they should be.
        (void)0;
        return false;
    }

    void push_front(int value) {
        // TODO: prepend. When the list was empty the new node is also the tail.
        (void)value;
    }

    void push_back(int value) {
        // TODO: append. When the list was empty the new node is also the head.
        (void)value;
    }

    int pop_front() {
        // TODO: throw std::out_of_range when empty, else detach the head, release it,
        // and return its value. Removing the only element clears the tail too.
        return 0;
    }

    int pop_back() {
        // TODO: throw std::out_of_range when empty, else detach the tail, release it,
        // and return its value. Removing the only element clears the head too.
        return 0;
    }

    int at(int i) const {
        // TODO: throw std::out_of_range unless 0 <= i < size(), then walk from the
        // nearer end and return that node's value.
        (void)i;
        return 0;
    }

    void insert_after(int i, int value) {
        // TODO: throw std::out_of_range unless 0 <= i < size(), then splice a new
        // node in after position i, updating the next node's `prev` and moving the
        // tail when inserting past the old last element.
        (void)i;
        (void)value;
    }

    void erase_after(int i) {
        // TODO: throw std::out_of_range unless 0 <= i < size() - 1, then unlink and
        // release the node after position i, moving the tail when it was the last.
        (void)i;
    }

    bool contains(int value) const {
        // TODO: walk from head looking for the value.
        (void)value;
        return false;
    }

    void clear() {
        // TODO: release every node and reset head, tail, and count.
    }

    void reverse() {
        // TODO: swap every node's `prev` and `next` in one pass, then swap head and
        // tail. Both links must be handled together or the list gains a cycle.
    }
};
