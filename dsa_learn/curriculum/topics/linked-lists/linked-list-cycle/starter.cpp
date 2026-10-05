#ifndef LISTNODE_DEF
#define LISTNODE_DEF
struct ListNode {
    int val;
    ListNode *next;
    ListNode(int x) : val(x), next(nullptr) {}
};
#endif

bool hasCycle(ListNode *head) {
    // TODO: Floyd's Tortoise and Hare algorithm.
    return false;
}
