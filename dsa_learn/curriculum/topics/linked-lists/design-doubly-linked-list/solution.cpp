#include <stdexcept>

struct ListNode {
    int value;
    ListNode* prev;
    ListNode* next;
    ListNode(int v) : value(v), prev(nullptr), next(nullptr) {}
};

// Doubly linked list.
//
// The structure that makes O(1) deletion possible: because every node also stores
// a `prev` pointer, unlinking a node needs no predecessor search. That extra
// pointer is the entire trade -- one word of storage per node, bought with the
// ability to step backwards.
//
// Maintaining both links is the part that goes wrong in practice. Every one of the
// six operations that changes the chain has to update *two* pointers, and a single
// missed re-link turns the list into a cycle. `assert_consistent` below is the
// invariant each operation is held to.
class DoublyLinkedList {
private:
    ListNode* head;
    ListNode* tail;
    int count;

    // Checks both directions agree at every node. Not part of the public surface;
    // it exists so the suite can assert the invariant the class claims to keep.
    bool links_agree() const {
        const ListNode* forward = head;
        int steps = 0;
        while (forward) {
            if (forward->next && forward->next->prev != forward) return false;
            if (!forward->next && forward != tail) return false;
            forward = forward->next;
            if (++steps > count + 1) return false;  // a cycle
        }
        const ListNode* backward = tail;
        steps = 0;
        while (backward) {
            if (backward->prev && backward->prev->next != backward) return false;
            if (!backward->prev && backward != head) return false;
            backward = backward->prev;
            if (++steps > count + 1) return false;
        }
        return true;
    }

public:
    DoublyLinkedList() : head(nullptr), tail(nullptr), count(0) {}

    ~DoublyLinkedList() {
        clear();
    }

    DoublyLinkedList(const DoublyLinkedList&) = delete;
    DoublyLinkedList& operator=(const DoublyLinkedList&) = delete;

    int size() const {
        return count;
    }

    bool empty() const {
        return count == 0;
    }

    bool is_consistent() const {
        return links_agree();
    }

    void push_front(int value) {
        ListNode* node = new ListNode(value);
        node->next = head;
        if (head) {
            head->prev = node;
        } else {
            tail = node;  // first element is also the last
        }
        head = node;
        ++count;
    }

    void push_back(int value) {
        ListNode* node = new ListNode(value);
        node->prev = tail;
        if (tail) {
            tail->next = node;
        } else {
            head = node;
        }
        tail = node;
        ++count;
    }

    int pop_front() {
        if (count == 0) {
            throw std::out_of_range("List is empty");
        }
        ListNode* doomed = head;
        int value = doomed->value;
        head = doomed->next;
        if (head) {
            head->prev = nullptr;
        } else {
            tail = nullptr;  // last element removed
        }
        delete doomed;
        --count;
        return value;
    }

    int pop_back() {
        if (count == 0) {
            throw std::out_of_range("List is empty");
        }
        ListNode* doomed = tail;
        int value = doomed->value;
        tail = doomed->prev;
        if (tail) {
            tail->next = nullptr;
        } else {
            head = nullptr;
        }
        delete doomed;
        --count;
        return value;
    }

    int at(int i) const {
        if (i < 0 || i >= count) {
            throw std::out_of_range("Index out of range");
        }
        // Walk from whichever end is closer; this is why `prev` is worth storing.
        if (i <= count / 2) {
            const ListNode* node = head;
            for (int step = 0; step < i; ++step) node = node->next;
            return node->value;
        }
        const ListNode* node = tail;
        for (int step = count - 1; step > i; --step) node = node->prev;
        return node->value;
    }

    void insert_after(int i, int value) {
        if (i < 0 || i >= count) {
            throw std::out_of_range("Index out of range");
        }
        ListNode* node = new ListNode(value);
        ListNode* at_node = head;
        for (int step = 0; step < i; ++step) at_node = at_node->next;

        node->prev = at_node;
        node->next = at_node->next;
        if (at_node->next) {
            at_node->next->prev = node;
        } else {
            tail = node;  // appended past the old tail
        }
        at_node->next = node;
        ++count;
    }

    void erase_after(int i) {
        if (i < 0 || i >= count - 1) {
            throw std::out_of_range("No node follows that index");
        }
        ListNode* at_node = head;
        for (int step = 0; step < i; ++step) at_node = at_node->next;
        ListNode* doomed = at_node->next;
        at_node->next = doomed->next;
        if (doomed->next) {
            doomed->next->prev = at_node;
        } else {
            tail = at_node;  // the new last element
        }
        delete doomed;
        --count;
    }

    bool contains(int value) const {
        for (const ListNode* node = head; node; node = node->next) {
            if (node->value == value) return true;
        }
        return false;
    }

    void clear() {
        ListNode* node = head;
        while (node) {
            ListNode* next = node->next;
            delete node;
            node = next;
        }
        head = nullptr;
        tail = nullptr;
        count = 0;
    }

    // Reversal is the operation a singly linked list needs O(N) space for, and the
    // one this structure does in O(1) extra space by walking from both ends.
    void reverse() {
        ListNode* previous = nullptr;
        ListNode* node = head;
        ListNode* old_head = head;
        while (node) {
            ListNode* next = node->next;
            node->next = previous;   // reverse this link
            node->prev = next;       // and the mirror, in the same pass
            previous = node;
            node = next;
        }
        head = previous;
        tail = old_head;
    }
};
