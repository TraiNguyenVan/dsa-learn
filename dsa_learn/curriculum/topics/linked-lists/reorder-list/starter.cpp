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

void reorderList(ListNode* head) {
    // TODO: Split at middle, reverse second half, and interleave nodes in-place.
}
