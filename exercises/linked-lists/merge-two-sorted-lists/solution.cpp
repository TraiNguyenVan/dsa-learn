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

/**
 * Merge two sorted linked lists into one sorted list.
 *
 * Time Complexity Target:  O(N + M)
 * Space Complexity Target: O(1) auxiliary
 */
ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {
    // TODO: Implement in-place list merging with a dummy head here.
    return nullptr;
}
