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
        ListNode* curr = head;
        while (curr) {
            ListNode* next = curr->next;
            delete curr;
            curr = next;
        }
    }

    int get(int index) const {
        if (index < 0 || index >= size) {
            return -1;
        }
        ListNode* curr = head;
        for (int i = 0; i < index; ++i) {
            curr = curr->next;
        }
        return curr->val;
    }

    void insertHead(int val) {
        ListNode* node = new ListNode(val);
        node->next = head;
        head = node;
        size++;
    }

    void insertTail(int val) {
        ListNode* node = new ListNode(val);
        if (!head) {
            head = node;
        } else {
            ListNode* curr = head;
            while (curr->next) {
                curr = curr->next;
            }
            curr->next = node;
        }
        size++;
    }

    bool remove(int index) {
        if (index < 0 || index >= size) {
            return false;
        }
        if (index == 0) {
            ListNode* toDelete = head;
            head = head->next;
            delete toDelete;
        } else {
            ListNode* curr = head;
            for (int i = 0; i < index - 1; ++i) {
                curr = curr->next;
            }
            ListNode* toDelete = curr->next;
            curr->next = toDelete->next;
            delete toDelete;
        }
        size--;
        return true;
    }

    std::vector<int> getValues() const {
        std::vector<int> res;
        ListNode* curr = head;
        while (curr) {
            res.push_back(curr->val);
            curr = curr->next;
        }
        return res;
    }
};
