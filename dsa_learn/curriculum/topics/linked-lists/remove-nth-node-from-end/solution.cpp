#ifndef LISTNODE_DEF
#define LISTNODE_DEF
struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};
#endif

ListNode* removeNthFromEnd(ListNode* head, int n) {
    ListNode dummy(0, head);
    ListNode* fast = &dummy;
    ListNode* slow = &dummy;

    for (int i = 0; i < n; ++i) {
        if (!fast->next) return head;
        fast = fast->next;
    }

    while (fast->next) {
        fast = fast->next;
        slow = slow->next;
    }

    ListNode* to_delete = slow->next;
    if (to_delete) {
        slow->next = to_delete->next;
        delete to_delete;
    }

    return dummy.next;
}
