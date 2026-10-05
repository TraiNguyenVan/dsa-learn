#ifndef LIST_NODE_DEF
#define LIST_NODE_DEF
struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};
#endif

/**
 * Canonical Solution: 3-pointer iterative reversal
 * Time Complexity:  O(N)
 * Space Complexity: O(1)
 */
ListNode* reverseList(ListNode* head) {
    ListNode* prev = nullptr;
    ListNode* curr = head;

    while (curr != nullptr) {
        ListNode* next_temp = curr->next;
        curr->next = prev;
        prev = curr;
        curr = next_temp;
    }

    return prev;
}
