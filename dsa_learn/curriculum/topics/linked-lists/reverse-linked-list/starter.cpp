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
 * Given the head of a singly linked list, reverse the list,
 * and return the reversed list.
 *
 * Time Complexity Target:  O(N)
 * Space Complexity Target: O(1)
 */
ListNode* reverseList(ListNode* head) {
    // TODO: Reverse the linked list pointers in O(N) time and O(1) space.
    return head;
}
