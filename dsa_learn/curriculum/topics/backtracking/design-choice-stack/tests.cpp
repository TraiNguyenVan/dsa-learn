#include "dsa_test.hpp"
#include "solution.cpp"

#include <functional>
#include <string>
#include <vector>

// ---------------------------------------------------------------------------
// Foundation tier: one group of tests per declared component.
// ---------------------------------------------------------------------------

TEST_FOUNDATION("constructor", "Starts with no branch, nothing tried") {
    ChoiceStack stack;
    ASSERT_EQ(stack.depth(), 0);
    ASSERT_EQ(stack.backtrack_count(), 0);
    ASSERT_FALSE(stack.is_backtracking());
    ASSERT_EQ(stack.tried_at_current_depth(), 0);
}

TEST_FOUNDATION("push_choice", "Extends the branch and raises its depth") {
    ChoiceStack stack;
    stack.push_choice(3);
    ASSERT_EQ(stack.depth(), 1);
    stack.push_choice(7);
    ASSERT_EQ(stack.depth(), 2);
    ASSERT_EQ(stack.at(0), 3);
    ASSERT_EQ(stack.at(1), 7);
}

TEST_FOUNDATION("pop_choice", "Undoes the most recent choice") {
    ChoiceStack stack;
    stack.push_choice(1);
    stack.push_choice(2);
    stack.push_choice(3);
    ASSERT_EQ(stack.pop_choice(), 3);
    ASSERT_EQ(stack.depth(), 2);
    ASSERT_EQ(stack.at(1), 2);
}

TEST_FOUNDATION("pop_choice", "Each undo counts as one backtrack") {
    ChoiceStack stack;
    stack.push_choice(1);
    stack.push_choice(2);
    ASSERT_EQ(stack.backtrack_count(), 0);
    ASSERT_FALSE(stack.is_backtracking());
    stack.pop_choice();
    ASSERT_EQ(stack.backtrack_count(), 1);
    ASSERT_TRUE(stack.is_backtracking());
    stack.pop_choice();
    ASSERT_EQ(stack.backtrack_count(), 2);
}

TEST_FOUNDATION("pop_choice", "Throws when the branch is empty") {
    ChoiceStack stack;
    bool threw = false;
    try {
        stack.pop_choice();
    } catch (const std::out_of_range&) {
        threw = true;
    }
    ASSERT_TRUE(threw);
    ASSERT_EQ(stack.depth(), 0);
}

TEST_FOUNDATION("depth", "Tracks how far into the search tree we are") {
    ChoiceStack stack;
    for (int i = 0; i < 10; ++i) {
        ASSERT_EQ(stack.depth(), i);
        stack.push_choice(i);
    }
    ASSERT_EQ(stack.depth(), 10);
    for (int i = 10; i > 0; --i) {
        stack.pop_choice();
        ASSERT_EQ(stack.depth(), i - 1);
    }
}

TEST_FOUNDATION("at", "Reads a choice on the current branch") {
    ChoiceStack stack;
    stack.push_choice(10);
    stack.push_choice(20);
    stack.push_choice(30);
    ASSERT_EQ(stack.at(0), 10);
    ASSERT_EQ(stack.at(2), 30);
    bool threw_low = false;
    bool threw_high = false;
    try {
        stack.at(-1);
    } catch (const std::out_of_range&) {
        threw_low = true;
    }
    try {
        stack.at(3);
    } catch (const std::out_of_range&) {
        threw_high = true;
    }
    ASSERT_TRUE(threw_low);
    ASSERT_TRUE(threw_high);
}

TEST_FOUNDATION("tried", "Records a refusal and reports it") {
    ChoiceStack stack;
    ASSERT_FALSE(stack.tried(5));
    stack.mark_tried(5);
    ASSERT_TRUE(stack.tried(5));
    ASSERT_FALSE(stack.tried(6));
}

TEST_FOUNDATION("tried", "The same candidate at a different depth is a different branch") {
    // This is the memo's whole purpose. Path [1] + candidate 9 and path [1, 2] +
    // candidate 9 are unrelated branches, so one must not poison the other.
    ChoiceStack stack;
    stack.push_choice(1);
    stack.mark_tried(9);
    ASSERT_TRUE(stack.tried(9));

    stack.push_choice(2);
    ASSERT_FALSE(stack.tried(9));
    stack.mark_tried(9);
    ASSERT_TRUE(stack.tried(9));

    stack.pop_choice();
    ASSERT_TRUE(stack.tried(9));
}

TEST_FOUNDATION("mark_tried", "Records a refusal that later queries can see") {
    // The record is the memo. A refusal marked here must be visible to `tried` at the
    // same depth, and must stay invisible everywhere else.
    ChoiceStack stack;
    stack.push_choice(4);
    ASSERT_FALSE(stack.tried(7));
    stack.mark_tried(7);
    ASSERT_TRUE(stack.tried(7));
    ASSERT_EQ(stack.tried_at_current_depth(), 1);
    // Re-marking is idempotent: a branch is refused once, not once per attempt.
    stack.mark_tried(7);
    ASSERT_EQ(stack.tried_at_current_depth(), 1);
}

TEST_FOUNDATION("tried_at_current_depth", "Counts refusals on the current branch") {
    ChoiceStack stack;
    ASSERT_EQ(stack.tried_at_current_depth(), 0);
    stack.mark_tried(1);
    stack.mark_tried(2);
    ASSERT_EQ(stack.tried_at_current_depth(), 2);
    stack.mark_tried(3);
    ASSERT_EQ(stack.tried_at_current_depth(), 3);
    // Repeating a refusal does not inflate the count.
    stack.mark_tried(1);
    ASSERT_EQ(stack.tried_at_current_depth(), 3);
}

TEST_FOUNDATION("tried_at_current_depth", "Descendant refusals do not count at the parent") {
    ChoiceStack stack;
    stack.push_choice(1);
    stack.push_choice(2);
    stack.mark_tried(3);
    ASSERT_EQ(stack.tried_at_current_depth(), 1);
    stack.pop_choice();
    ASSERT_EQ(stack.tried_at_current_depth(), 0);
}

TEST_FOUNDATION("is_backtracking", "False until the first undo") {
    ChoiceStack stack;
    ASSERT_FALSE(stack.is_backtracking());
    stack.push_choice(1);
    stack.push_choice(2);
    ASSERT_FALSE(stack.is_backtracking());
    stack.pop_choice();
    ASSERT_TRUE(stack.is_backtracking());
    stack.pop_choice();
    ASSERT_TRUE(stack.is_backtracking());
}

TEST_FOUNDATION("backtrack_count", "Counts every undo") {
    ChoiceStack stack;
    for (int i = 0; i < 5; ++i) stack.push_choice(i);
    for (int i = 0; i < 3; ++i) stack.pop_choice();
    ASSERT_EQ(stack.backtrack_count(), 3);
    ASSERT_EQ(stack.depth(), 2);
}

TEST_FOUNDATION("reset", "Clears the branch, the refusals, and the count") {
    ChoiceStack stack;
    stack.push_choice(1);
    stack.mark_tried(9);          // refused at path [1]
    ASSERT_TRUE(stack.tried(9));
    stack.push_choice(2);
    stack.pop_choice();
    stack.pop_choice();
    ASSERT_TRUE(stack.is_backtracking());

    stack.reset();
    ASSERT_EQ(stack.depth(), 0);
    ASSERT_EQ(stack.backtrack_count(), 0);
    ASSERT_FALSE(stack.is_backtracking());
    ASSERT_FALSE(stack.tried(9));
    ASSERT_EQ(stack.tried_at_current_depth(), 0);
    // Reusable afterwards.
    stack.push_choice(5);
    ASSERT_EQ(stack.depth(), 1);
    ASSERT_FALSE(stack.tried(5));
}

// ---------------------------------------------------------------------------
// Functional / Boundary / Complexity tiers
// ---------------------------------------------------------------------------

TEST_FUNCTIONAL("A subset-sum search drives the structure and returns the right answer") {
    // The technique on the structure: choose an element or skip it, recurse, and
    // undo on the way out. `tried` refuses a candidate once its subtree is known to
    // be dead.
    const std::vector<int> numbers = {3, 34, 4, 12, 5, 2};
    const int target = 9;

    ChoiceStack stack;
    bool found = false;

    // Explicit DFS over include/skip decisions, index implied by depth.
    std::vector<bool> taken;
    std::function<bool(int, int)> search = [&](int index, int remaining) -> bool {
        if (remaining == 0) return true;
        if (index >= static_cast<int>(numbers.size())) return false;

        // Skip first, so the "undo" path is genuinely exercised.
        stack.push_choice(0);
        if (search(index + 1, remaining)) { found = true; return true; }
        stack.pop_choice();

        if (stack.tried(1)) return false;

        stack.push_choice(1);
        if (search(index + 1, remaining - numbers[static_cast<size_t>(index)])) {
            found = true;
            return true;
        }
        stack.pop_choice();
        stack.mark_tried(1);
        return false;
    };

    ASSERT_TRUE(search(0, target));
    ASSERT_TRUE(found);
    ASSERT_TRUE(stack.is_backtracking());

    // Verify the found branch really does sum to the target.
    int sum = 0;
    for (size_t i = 0; i < stack.depth(); ++i) {
        if (stack.at(static_cast<int>(i)) == 1) {
            sum += numbers[i];
        }
    }
    ASSERT_EQ(sum, target);
}

TEST_FUNCTIONAL("A retained memo refuses the same dead branches without re-walking them") {
    // The memo's whole purpose: once a subtree has been proved dead, a repeat
    // search consults the record instead of re-expanding it. So the *second*
    // identical search must visit strictly fewer candidates than the first.
    const std::vector<int> numbers = {2, 4, 6, 8, 10, 12, 14, 16, 18, 20};
    const int target = 999;   // unreachable, so the search fails and the memo fills

    ChoiceStack stack;
    int visits_first = 0;
    int visits_second = 0;
    int visits_after_reset = 0;

    auto run = [&](int& visits) {
        std::function<bool(int, int)> search = [&](int index, int remaining) -> bool {
            if (remaining == 0) return true;
            if (index >= static_cast<int>(numbers.size())) return false;
            ++visits;
            // Skip.
            stack.push_choice(0);
            if (search(index + 1, remaining)) return true;
            stack.pop_choice();
            // Take, unless this exact branch is already known dead.
            if (stack.tried(1)) return false;
            stack.push_choice(1);
            bool ok = search(index + 1, remaining - numbers[static_cast<size_t>(index)]);
            stack.pop_choice();
            if (!ok) stack.mark_tried(1);
            return ok;
        };
        return search(0, target);
    };

    ASSERT_FALSE(run(visits_first));
    ASSERT_TRUE(visits_first > 0);
    ASSERT_EQ(stack.depth(), 0);
    ASSERT_TRUE(stack.backtrack_count() > 0);

    // Same problem, same memo, nothing cleared: the refusals are reused.
    ASSERT_FALSE(run(visits_second));
    ASSERT_TRUE(visits_second < visits_first);

    // Clearing the memo restores the full cost -- which is the point of `reset`.
    stack.reset();
    ASSERT_FALSE(run(visits_after_reset));
    ASSERT_EQ(visits_after_reset, visits_first);
}

TEST_FUNCTIONAL("Deep push/pop interleaving keeps the branch consistent") {
    ChoiceStack stack;
    int seed = 61803;
    std::vector<int> model;
    for (int step = 0; step < 4000; ++step) {
        seed = seed * 1103515245 + 12345;
        int op = static_cast<int>(((seed >> 8) & 0x7fffffff) % 3);
        if (op == 0 || model.empty()) {
            int value = static_cast<int>((seed >> 4) % 100);
            stack.push_choice(value);
            model.push_back(value);
        } else if (op == 1) {
            int expected = model.back();
            model.pop_back();
            ASSERT_EQ(stack.pop_choice(), expected);
        } else {
            ASSERT_EQ(stack.depth(), static_cast<int>(model.size()));
            for (size_t i = 0; i < model.size(); ++i) {
                ASSERT_EQ(stack.at(static_cast<int>(i)), model[i]);
            }
        }
    }
}

TEST_BOUNDARY("An empty branch answers every query") {
    ChoiceStack stack;
    ASSERT_EQ(stack.depth(), 0);
    ASSERT_FALSE(stack.is_backtracking());
    ASSERT_FALSE(stack.tried(0));
    ASSERT_EQ(stack.tried_at_current_depth(), 0);
    stack.mark_tried(0);
    ASSERT_TRUE(stack.tried(0));
    ASSERT_EQ(stack.tried_at_current_depth(), 1);
}

TEST_BOUNDARY("Negative and zero choices are ordinary values") {
    // The key encoding must separate them, or -1 and 1 collide.
    ChoiceStack stack;
    stack.mark_tried(-1);
    ASSERT_TRUE(stack.tried(-1));
    ASSERT_FALSE(stack.tried(1));
    stack.push_choice(-1);
    stack.push_choice(0);
    ASSERT_FALSE(stack.tried(-1));
    ASSERT_EQ(stack.at(1), 0);
}

TEST_BOUNDARY("A branch of one level distinguishes prefixes correctly") {
    ChoiceStack stack;
    for (int value = 0; value < 5; ++value) {
        stack.push_choice(value);
        for (int candidate = 0; candidate < 5; ++candidate) {
            stack.mark_tried(candidate);
            ASSERT_EQ(stack.tried_at_current_depth(), candidate + 1);
        }
        stack.pop_choice();
        // Deeper refusals must not leak up into this level.
        ASSERT_EQ(stack.tried_at_current_depth(), 0);
    }
}

TEST_COMPLEXITY("A 10,000-level search refuses each candidate once per node") {
    // Without the memo, a search that hits many dead ends re-walks them. Each
    // refusal here is a single hash insertion and each check is a single lookup.
    const int depth_limit = 10000;
    ChoiceStack stack;
    for (int i = 0; i < depth_limit; ++i) {
        stack.push_choice(i);
    }
    ASSERT_EQ(stack.depth(), depth_limit);

    for (int candidate = 0; candidate < 64; ++candidate) {
        ASSERT_FALSE(stack.tried(candidate));
        stack.mark_tried(candidate);
    }
    ASSERT_EQ(stack.tried_at_current_depth(), 64);
    for (int candidate = 0; candidate < 64; ++candidate) {
        ASSERT_TRUE(stack.tried(candidate));
    }
    ASSERT_FALSE(stack.tried(64));

    for (int i = 0; i < depth_limit; ++i) {
        stack.pop_choice();
    }
    ASSERT_EQ(stack.depth(), 0);
    ASSERT_EQ(stack.backtrack_count(), depth_limit);
}
