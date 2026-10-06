# Feature Specification: DSA Theory, Concept & Algorithm Visualization Expansion

**Feature Branch**: `006-add-dsa-learning-materials`

**Created**: 2026-10-06

**Status**: Draft

**Input**: User description: "add more learning materials on data structure/algorithm" / "especially the concept and theory section" / "theory and concept only, take your focus on algorithm visualization, we dont need exercise to grow except the exercise which stick to that theory for example 'implement linked list'"

## Clarifications

### Session 2026-10-06

- Q: Should emphasising concept and theory content reduce how much the curriculum grows in new practice exercises? → A: Theory and concept material only, with algorithm visualization as the centrepiece; the curriculum does not grow new problem exercises, except implementation exercises that directly embody a topic's theory (for example, implementing a linked list).
- Q: What counts as a topic being "visualized" — is it enough to animate one representative algorithm per topic, or must each topic animate all of its headline algorithms? → A: One animation per topic is the floor; larger topics may have several. Exhaustive coverage of every algorithm within a topic is not required.
- Q: How deep should the concept and theory material go for each topic? → A: Deepest option — existing depth plus correctness reasoning for why each operation preserves its invariants, plus why the stated limits exist, plus the mathematical groundwork behind costs, so that amortized bounds are derived rather than merely asserted.
- Q: Should the implementation exercises that build a data structure be required for every topic, or only for topics whose theory is genuinely a data structure? → A: Every topic gets one. Where the subject is a technique rather than a container — sliding window, binary search, backtracking — the topic introduces a supporting structure that the technique operates on, and the learner builds that.
- Q: How should the curriculum be prioritised for delivery when it is likely to be built in stages rather than all at once? → A: Theory depth first across all topics, then visualization coverage, then implementation exercises.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Authored Concept and Theory Lessons for Every Topic (Priority: P1)

As a learner studying a data structure or algorithm, I want a lesson written specifically about that subject — what it is, how it is laid out in memory, how it works, the invariants it must preserve, what it costs, why those costs are what they are, why the limits exist, and when to choose it over an alternative — so that I understand why it works and why it cannot be beaten, instead of only recognising when to reach for it and accepting the cost on faith.

**Why this priority**: This is the direct reading of "especially the concept and theory section". Eight of twelve topics have no authored lesson at all; they fall back to a generic scaffold that describes no particular structure and would be equally valid for any subject. Every other addition in this feature — visualization, implementation exercises — lands on top of this teaching layer, so it must come first.

**Independent Test**: Open the lesson view for every topic and confirm each presents content specific to its own subject — named operations, named invariants, derived costs, concrete trade-offs — rather than text shared with other topics. Fully deliverable alone: it replaces 8 placeholder lessons with real ones and gives every topic a real, derived cost table.

**Acceptance Scenarios**:

1. **Given** any topic in the curriculum, **When** a learner opens its lesson, **Then** the lesson describes that specific subject's purpose, memory representation, how its operations work, the invariants it maintains, and its trade-offs, and contains no placeholder text shared with other topics.
2. **Given** a lesson for any topic, **When** the learner views the cost table, **Then** they see best, average, and worst-case time cost plus space cost for at least five of that subject's characteristic operations, rather than a generic lookup/insert/delete stub.
3. **Given** a lesson containing multiple sequential modules, **When** the learner completes a module, **Then** the completion is recorded and reflected in that topic's conceptual mastery indicator.
4. **Given** a subject whose costs are not operations on a container — a sorting algorithm, a graph traversal, a dynamic-programming technique — **When** the learner views its cost table, **Then** it presents costs for that subject's own steps and comparisons rather than an empty or borrowed table.
5. **Given** a learner studying a topic's core operations, **When** they read the lesson's correctness argument, **Then** it shows why each operation preserves that structure's invariants and why its algorithms terminate, rather than merely asserting that it works.
6. **Given** a lesson stating an amortized cost, **When** the learner reads the derivation, **Then** the derivation shows why the bound follows from the underlying mechanism — the geometric resizing, the halving, the credit or potential argument — so the learner can recompute it rather than take it on trust.
7. **Given** a learner asking whether a topic's core problem could be done faster, **When** they read the lesson's limits section, **Then** it states whether a better approach is known to be impossible and on what basis, or states plainly that no such limit is known, rather than leaving the learner to assume either.
8. **Given** a lesson introducing mathematical notation, **When** the learner encounters that notation, **Then** it is defined where it appears and is followable from the topic's declared prerequisites.

---

### User Story 2 - Step-by-Step Algorithm Visualization Across Every Topic (Priority: P1)

As a learner who does not yet trust an algorithm in their head, I want to watch it run one step at a time — with play, pause, step forward and back, and a plain-language explanation of what each step is doing and why — so that I can see the search space collapse, the pointers cross, the frontier expand, or the table fill in, instead of taking it on faith.

**Why this priority**: This is the centrepiece the feature is directed at. Today the curriculum has seven animations covering only six of twelve topics, and the visual styles needed for graphs, tries, dynamic programming, backtracking and stacks do not exist yet. Algorithms such as binary search, graph traversal, and dynamic-programming fill are close to invisible in text: their whole point is a sequence of decisions over time, which prose cannot show. It ranks alongside the lessons because animation and explanation teach different halves of the same idea.

**Independent Test**: Open the visualizer for every topic and confirm each presents at least one algorithm or operation that can be played, paused, stepped in both directions, and scrubbed, with a narration panel explaining the current step. Deliverable independently: it extends what already works and adds the missing visual styles.

**Acceptance Scenarios**:

1. **Given** any topic in the curriculum, **When** a learner opens its visualizer, **Then** at least one algorithm or operation from that topic can be watched running step by step; no topic presents an empty or unavailable visualizer.
2. **Given** a running visualization, **When** the learner uses playback controls — play, pause, step forward, step back, reset, and speed selection — **Then** the visual state responds immediately and the narration describes the current step in plain language, such as "range 3–7 contains the target, so discard the right half".
3. **Given** a subject with no existing visual style — a graph, a trie, a dynamic-programming table, a backtracking decision tree, a stack — **When** a learner views its visualization, **Then** a visual representation suited to that subject is drawn rather than forcing the subject into an array or tree layout.
4. **Given** a learner resuming a partially watched visualization, **When** they reopen the topic, **Then** the platform indicates where they stopped and lets them resume.
5. **Given** a visualization on an input that triggers a boundary condition — an empty collection, a single element, an already-sorted input, a fully exhausted search — **When** the learner selects it, **Then** it plays to a correct conclusion without error or a blank frame.
6. **Given** a learner watching the same algorithm twice, **When** they replay it on the same input, **Then** the steps are identical, with no variation between runs.

---

### User Story 3 - Theory and Visualization for Subject Areas Currently Absent (Priority: P2)

As a learner working through the reference curriculum, I want the subject areas the reference roadmap names but the platform currently omits to be available — sorting, core graph algorithms, advanced data structures, and mathematical or bitwise techniques — so that I am not silently missing whole families of knowledge after exhausting everything that exists today.

**Why this priority**: Adding theory to existing topics deepens a bucket; it does not create one. A learner can complete every current topic and still never have studied sorting, graph traversal, or union-find. This ranks below the first two stories because a missing subject area is less damaging than an existing topic being taught with placeholder material, but it is the largest remaining hole in coverage.

**Independent Test**: Confirm each absent subject area is reachable as a topic offering a concept lesson, a cost table, pattern guidance, and at least one visualization, and confirm none of them requires problem exercises to be usable. Deliverable independently: it introduces entirely new subject areas without altering anything a learner already uses.

**Acceptance Scenarios**:

1. **Given** the curriculum index, **When** a learner looks for sorting, core graph algorithms, advanced data structures, or mathematical and bitwise techniques, **Then** each appears as a selectable topic offering a concept lesson, a cost table, pattern guidance, and at least one visualization.
2. **Given** a newly added topic, **When** a learner opens it, **Then** it presents the same material types as established topics, with no topic offering a reduced set.
3. **Given** a newly added topic that builds on knowledge from an existing topic, **When** the learner views it, **Then** the topic states its prerequisite relationships so the learner knows what to review first.
4. **Given** a learner who has finished a newly added topic's lesson and animation, **When** they have no problem exercises to attempt, **Then** the topic is still a complete, satisfying learning experience rather than an unfinished stub.

---

### User Story 4 - Implementation Exercises That Embody the Theory (Priority: P2)

As a learner who has read how a data structure works, I want to build that structure myself from an empty skeleton — implementing its operations so it holds the invariants the lesson described — so that I experience the mechanics the theory describes rather than only reading about them.

**Why this priority**: This is the single exception the feature makes to not growing exercises, and it is scoped to exercises that *are* the theory: building a linked list, a binary heap, a search tree, or a union-find structure is the only way to feel pointer rewiring, heap percolation, rebalancing, or path compression. Every topic gets one, including the topics whose subject is a technique rather than a container — a sliding window, a binary search, a backtracking search — by having the topic introduce the supporting structure its technique operates on and asking the learner to build that. It ranks below the theory and visualization stories because a learner cannot build a structure they have not been taught. These exercises are deliberately limited to building the structure the topic teaches; the curriculum does not grow new problem exercises.

**Independent Test**: For each topic, attempt its implementation exercise and confirm it evaluates the structure's operations against standard, corner, and memory-safety cases, and that guidance escalates without revealing the answer. Deliverable independently: it completes the learn-theory → watch-it-work → build-it-yourself loop for one topic.

**Acceptance Scenarios**:

1. **Given** any topic in the curriculum, **When** the learner opens its implementation exercise, **Then** they are given an empty skeleton with the operations clearly marked for completion, the same invariants the lesson described, and the costs that must be met.
2. **Given** a topic whose subject is a technique rather than a container, **When** the learner opens its implementation exercise, **Then** its lesson has already introduced the supporting structure the technique operates on, and the exercise asks the learner to build that structure rather than inventing an unrelated container.
3. **Given** a learner attempting an implementation exercise, **When** they request help, **Then** guidance escalates from a conceptual nudge through a strategy outline to a worked structural blueprint, and no tier contains the working implementation.
4. **Given** a learner completing an implementation exercise, **When** verification runs, **Then** it evaluates the structure's operations individually — construction, insertion, deletion, lookup, traversal, and memory cleanup — rather than reporting a single pass or fail.
5. **Given** an implementation exercise exists for a topic, **When** the learner completes it, **Then** the topic's mastery indicator reflects both having read the theory and having built the structure.

---

### User Story 5 - Pattern Recognition Guidance for Every Topic (Priority: P3)

As a learner facing an unfamiliar problem, I want each topic to tell me the signals in the problem statement that should make me reach for its techniques, the invariants I must preserve, and the mistakes people typically make — so that I learn to select an approach, not just execute one I was handed.

**Why this priority**: Pattern recognition is the conceptual skill that transfers between problems, so it belongs with the theory rather than with the exercises. It ranks last because the lessons and visualizations teach the ideas first, and a learner still working through those gains more than a recognition heuristic.

**Independent Test**: Open pattern guidance for every topic and confirm each topic is reachable from at least one pattern, and that each pattern states its trigger signals, invariants, and pitfalls. Deliverable independently: pure guidance content, needing no new lessons or animations.

**Acceptance Scenarios**:

1. **Given** any topic in the curriculum, **When** a learner looks up its pattern guidance, **Then** they find at least one pattern naming the problem signals that point to that topic's techniques.
2. **Given** a pattern, **When** the learner reviews it, **Then** it states the invariants to preserve and the mistakes that commonly cause failure.
3. **Given** a pattern referencing a lesson or animation, **When** the learner follows it, **Then** it resolves to material that exists in the curriculum rather than a dead end.

---

### User Story 6 - Reference Documentation That Matches the Actual Curriculum (Priority: P3)

As a learner or maintainer using the project's reference guide to decide what to study next, I want the guide's stated coverage to match what the platform actually offers, so that I am not sent chasing material that does not exist, and do not miss material that does.

**Why this priority**: The reference guide still describes a six-exercise starter curriculum, lists planned problems under headings already built, and makes no mention of visualization. Trust in the roadmap is what makes it usable as a study guide. It ranks last because it serves orientation rather than learning itself.

**Independent Test**: Compare every coverage claim in the reference guide against the live curriculum and confirm there are no overstated or missing entries, and that the guide describes which topics have animations. Deliverable independently: documentation work with no effect on any learner-facing feature.

**Acceptance Scenarios**:

1. **Given** a learner reading the reference guide to plan a study path, **When** they follow a claimed topic, lesson, or animation to the platform, **Then** it exists.
2. **Given** a maintainer auditing the curriculum against the guide, **When** they compare planned against delivered material, **Then** delivered items are marked delivered and genuinely absent items remain listed.
3. **Given** the curriculum has grown, **When** a learner reads the guide's summary of coverage, **Then** the stated topic counts, lesson coverage, and animation coverage match the live curriculum.

---

### Edge Cases

- **A topic with no authored lesson**: Today the platform substitutes a generic lesson so nothing appears broken. After this feature, a topic must never fall back to generic content — a missing lesson must be authored or the topic withheld, so no learner is silently given placeholder teaching material.
- **A topic with no cost data**: A subject whose costs are not container operations — a sorting algorithm, a graph traversal, a dynamic-programming fill — must still present a meaningful table covering *its* own steps, not an empty or borrowed one.
- **A subject with no visual style yet**: Graphs, tries, dynamic-programming tables, backtracking decision trees, and stacks have no renderer today. Forcing them into an array or tree layout misrepresents the algorithm, so a suited representation must exist before such a topic claims to be visualized.
- **An algorithm with nothing to animate**: Some theory is static — a definition, a cost argument, a proof of correctness. A topic's visualization must animate what genuinely has a time dimension rather than inventing a contrived animation for conceptual material that has none.
- **A visualization whose steps are too fine to follow**: A step-by-step animation is useless if each frame changes nothing perceptible. Steps must correspond to a meaningful decision or state change.
- **A visualization whose steps are too coarse to teach**: Equally, an animation that jumps a whole algorithm in two frames teaches nothing. Steps must be fine enough to expose the decision points that make the algorithm non-obvious.
- **An amortized cost that cannot actually be derived**: Some costs are genuinely hard to justify from the mechanism, and some commonly quoted bounds are folklore with a thin proof. Such a cost must either be given a real derivation or its cost target loosened to something provable — never stated with a derivation that does not hold up.
- **A lower bound that is not actually known**: For many problems no limit is proven. A lesson must say so plainly rather than implying an optimality that has not been established, since a learner who believes a bound is a floor will wrongly stop searching for better methods.
- **A correctness argument that proves the wrong thing**: Showing that an algorithm terminates is not the same as showing it returns the right answer. A correctness argument must address both, and must not substitute an invariant that holds vacuously.
- **Derivation depth exceeding the stated prerequisites**: A lesson that proves its bounds using machinery the learner has not been introduced to fails the learner just as surely as one that states costs without argument. Notation and machinery must be defined or reachable from what the topic declares as prerequisites.
- **Narration that explains what the frame shows but not why it matters**: Describing "index 3 is now the midpoint" teaches nothing; the learner needs to be told that the right half was discarded and why that is safe. Narration must state the reasoning, not merely restate the picture.
- **A technique spanning several topics**: Some material (a technique usable in both arrays and graphs) could reasonably be filed under more than one topic. It must have one authoritative home and be discoverable from the other, never duplicated in a way that lets the copies drift apart.
- **Theory not tied to a single container**: Some subjects are not tied to any one structure. Their lessons must still be scoped to a topic and must state their prerequisites, or they become an un-navigable orphan.
- **Guidance that accidentally gives the answer**: Escalating hints must stay pedagogically honest at every tier. The final tier is a structural blueprint and must never be the reference implementation.
- **Guidance pointing at material that does not exist**: Cross-references must resolve to real lessons or animations. A dangling reference sends the learner to a dead end and is worse than no reference.
- **Existing learner progress**: Learners already have completion history, streaks, and animation positions recorded. Adding and re-filing material must not erase, reset, or invalidate that history.
- **Duplicated or renamed material**: The reference roadmap and the curriculum both use names that do not always match. If a planned item and an existing item turn out to be the same exercise, it must be recognised as one rather than added twice.
- **Difficulty drift on animations**: An animation that does not faithfully depict the algorithm it claims to show teaches a wrong mental model. Every animation must be checked against the algorithm's real steps.
- **A topic with theory but no visualization yet**: A topic may legitimately ship its lesson before its animations exist. Such a topic must be visibly marked as incomplete for visualization rather than presenting an empty viewer that looks broken.

## Requirements *(mandatory)*

### Theory and Concept Content

- **FR-001**: Every topic in the curriculum MUST present a lesson authored for that specific subject, containing no text shared verbatim with another topic's lesson.
- **FR-002**: Every topic MUST present a cost table covering at least five of that subject's characteristic operations, steps, or comparisons, each with best, average, and worst-case time cost and space cost.
- **FR-003**: A topic whose subject is not a container of standard operations MUST present costs for its own steps and comparisons rather than an empty or borrowed table.
- **FR-004**: Every topic MUST state its prerequisite relationships so a learner can determine what to review first.
- **FR-005**: Every topic MUST offer pattern guidance stating the problem signals that point to its techniques, the invariants to preserve, and the common mistakes.
- **FR-006**: Every topic MUST be reachable from at least one pattern, and every lesson, animation, or exercise a pattern cross-references MUST resolve to material that exists.
- **FR-007**: Every topic's lesson MUST include a correctness argument explaining why each of its core operations preserves the structure's invariants and why its algorithms terminate, rather than asserting correctness without argument.
- **FR-008**: Every topic's lesson MUST include the derivation of each cost it states. An amortized cost MUST be shown to follow from its mechanism — the geometric resizing, the halving, the credit or potential argument — rather than merely asserted.
- **FR-009**: Every topic's lesson MUST state where its limits come from: whether a faster or better approach is known to be impossible, and on what basis. Where no such limit is known, the lesson MUST say so rather than implying one exists.
- **FR-010**: Every topic's lesson MUST present the reasoning behind its stated costs at a level a learner can follow from the topic's declared prerequisites, defining any mathematical notation it introduces.
- **FR-011**: A topic whose material is not algorithmic — a definition, a representation choice, a complexity argument — MUST NOT be given a contrived animation; such material belongs in the lesson.

### Algorithm Visualization

- **FR-012**: Every topic in the curriculum MUST present at least one algorithm or operation that a learner can watch running step by step. One such animation per topic is the required floor; larger topics MAY present several, and no topic is required to animate every algorithm it covers.
- **FR-013**: Every visualization MUST support play, pause, step forward, step back, reset, and speed selection, responding immediately at every control.
- **FR-014**: Every step MUST carry a plain-language narration explaining what is happening at that step and why it follows, not merely restating what the picture shows.
- **FR-015**: Every step MUST correspond to a meaningful decision or state change; steps that change nothing perceptible MUST NOT be emitted.
- **FR-016**: Steps MUST be fine-grained enough to expose the decision points that make the algorithm non-obvious.
- **FR-017**: Every subject that cannot be honestly represented by an existing visual style — graphs, tries, dynamic-programming tables, backtracking decision trees, stacks, and any other subject needing it — MUST have a visual representation suited to that subject.
- **FR-018**: A topic MUST NOT present an empty or unavailable visualizer; a topic whose animations are not yet authored MUST be visibly marked as incomplete for visualization.
- **FR-019**: Visualizations MUST behave correctly on boundary inputs, including empty collections, single elements, already-sorted input, duplicate values, and fully exhausted searches.
- **FR-020**: Every visualization MUST be deterministic, producing identical steps for identical inputs across runs.
- **FR-021**: Every visualization MUST faithfully depict the algorithm it claims to show, and MUST be checked against that algorithm's real steps.
- **FR-022**: A learner resuming a partially watched visualization MUST be able to continue from where they stopped.
- **FR-023**: Subject matter with no genuine time dimension — a definition, a cost argument, a proof of correctness — MUST NOT be given a contrived animation; such material belongs in the lesson.

### Subject Coverage

- **FR-024**: The curriculum MUST offer a topic for each subject area named in the project's reference roadmap that currently has none.
- **FR-025**: A newly added topic MUST present the same material types as established topics — lesson, cost table, pattern guidance, and at least one visualization — with no reduced set.
- **FR-026**: A newly added topic MUST be a complete learning experience on its own, and MUST NOT require problem exercises to be usable.

### Theory-Embedded Implementation Exercises

- **FR-027**: Every topic in the curriculum MUST offer an implementation exercise in which the learner builds a data structure from an empty skeleton. Where the topic's subject is a technique rather than a container, the structure built MUST be the supporting structure that the technique operates on.
- **FR-028**: A technique-based topic's lesson MUST introduce the supporting structure its implementation exercise asks the learner to build. The structure MUST be one the technique genuinely operates on, not an unrelated container introduced to satisfy the requirement that every topic has an exercise.
- **FR-029**: An implementation exercise MUST specify the operations to complete, the invariants from the topic's lesson that must hold, and the costs that must be met.
- **FR-030**: An implementation exercise MUST evaluate the structure's operations individually — construction, insertion, deletion, lookup, traversal, and memory cleanup — rather than reporting a single pass or fail for the whole structure.
- **FR-031**: Every implementation exercise MUST offer a guidance ladder of at least three escalating tiers, progressing from a conceptual nudge to a strategy outline to a worked structural blueprint.
- **FR-032**: No guidance tier MUST contain the working implementation from that exercise's reference solution.
- **FR-033**: Every implementation exercise MUST meet all quality gates mandated by the project constitution — problem statement with stated costs and examples, a skeleton with clearly marked completion points, a non-learner-editable test suite covering standard, corner, memory-safety and stress cases, and a verified reference solution.
- **FR-034**: The curriculum MUST NOT grow new problem exercises; new exercises MUST be limited to those that embody a topic's theory or introduce the supporting structure a technique-based topic builds on.

### Organisation and Integrity

- **FR-035**: A technique applicable to more than one topic MUST have exactly one authoritative definition, and MUST be discoverable from every topic it applies to.
- **FR-036**: Every exercise and animation MUST be filed under a topic whose subject matter it actually demonstrates.
- **FR-037**: New material MUST NOT duplicate an existing exercise, lesson, or animation that serves the same learning goal under a different name.
- **FR-038**: Existing learner completion history, streaks, lesson completion, and animation positions MUST be preserved unchanged across this feature.
- **FR-039**: New material MUST be added without removing or altering the behaviour of any currently working exercise, lesson, or animation.
- **FR-040**: All new material MUST continue to satisfy the offline-first constraint — no new material may require network access, remote services, or authentication to author, load, or use.
- **FR-041**: The project's reference guide MUST state coverage that matches the delivered curriculum, marking planned material as delivered once built and listing genuinely absent material as still planned.
- **FR-042**: The reference guide MUST describe which topics have authored lessons and which have visualizations, and its summary counts MUST match the live curriculum.

### Key Entities

- **Topic**: A named subject area in the curriculum (for example, sorting, or core graph algorithms). Carries a title, description, ordering position, prerequisite relationships, and its own lesson, cost table, pattern guidance, visualizations, and implementation exercise. Every topic carries all of these. 12 exist today.
- **Lesson**: The authored teaching content for one topic, divided into ordered modules that a learner completes to build conceptual mastery. Distinct from an exercise: a lesson explains, an exercise is built. A lesson carries not just what a subject is and what it costs, but a correctness argument for its operations, the derivation of each stated cost, and a statement of where its limits come from.
- **Correctness Argument**: A topic lesson's account of why each core operation preserves that structure's invariants and why its algorithms terminate, rather than an assertion that it works.
- **Cost Derivation**: The worked reasoning showing why a stated cost follows from its mechanism, so an amortized bound is recomputable by the reader rather than taken on trust.
- **Limits Statement**: A topic lesson's account of whether a better approach to its core problem is known to be impossible, and on what basis, including the case where no such limit is known.
- **Cost Table Entry**: One row of a topic's cost table, naming a characteristic operation, step, or comparison of that subject and stating its best, average, and worst-case time cost and space cost. Four topics have an authored table today; the rest fall back to a generic stub.
- **Visualization**: A step-by-step animation of one algorithm or operation within a topic, together with the playback controls that drive it and the narration attached to each step. Seven exist today, covering six of twelve topics.
- **Visual Style**: The subject-specific rendering a visualization draws through — currently array, linked list, tree, and heap. Subjects such as graphs, tries, dynamic-programming tables, backtracking decision trees, and stacks have no style yet.
- **Step Frame**: One state in a visualization's sequence, carrying the visual state and the plain-language narration of what is happening at that step and why.
- **Implementation Exercise**: A practice activity in which the learner builds a data structure from an empty skeleton, so that the mechanics its lesson describes are experienced rather than only read. Evaluated per operation. Two exist today; every topic will have one. For a topic whose subject is a technique rather than a container, the structure built is the supporting structure the technique operates on, introduced by that topic's own lesson.
- **Supporting Structure**: The data structure a technique-based topic teaches alongside its technique — the window state a sliding window maintains, the search structure a binary search probes, the choice set a backtracking search explores — so that the topic still has something concrete to build. It exists to make the technique's mechanics tangible, not as an unrelated container introduced to satisfy a quota.
- **Pattern Blueprint**: A transferable technique description naming the problem signals that point to it, the invariants to preserve, the common mistakes, and the material that demonstrates it. Five exist today, covering six of twelve topics.
- **Prerequisite Relationship**: A directed dependency from one topic to another, telling a learner what to review before starting.
- **Learner Progress Record**: Locally stored evidence of a learner's completed exercises, lesson modules, animation checkpoints, and mastery indicators. Must survive this feature untouched.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of curriculum topics present an authored lesson specific to their own subject; zero topics show shared placeholder teaching text.
- **SC-002**: 100% of curriculum topics present a cost table with at least five subject-appropriate entries; zero topics show a generic, borrowed, or empty cost table.
- **SC-003**: Every subject area named in the project's reference roadmap is reachable as a topic in the curriculum, with zero entirely absent subject areas remaining.
- **SC-004**: 100% of topics include a correctness argument for their core operations, verified by reviewer inspection that the argument actually explains why the invariant holds; zero topics assert correctness without argument.
- **SC-005**: 100% of amortized costs stated in a lesson are accompanied by the derivation showing why they follow from the mechanism; zero amortized bounds are presented as bare assertions.
- **SC-006**: 100% of topics state whether a better approach is known to be impossible for their core problem, and on what basis; zero topics imply an unproven limit or omit the question entirely.
- **SC-007**: 100% of mathematical notation introduced in a lesson is defined where it appears and is followable from that topic's declared prerequisites.
- **SC-008**: 100% of topics offer at least one visualization that can be played, paused, stepped forward and back, reset, and speed-adjusted; zero topics present an empty or unavailable visualizer. Larger topics presenting several animations is a permitted outcome, not a requirement.
- **SC-009**: The number of topics with at least one visualization rises from 6 of 12 to 12 of 12 or better, and every subject added under SC-003 also has one.
- **SC-010**: Every subject that cannot be honestly drawn by an existing visual style has a suited visual representation before its topic claims to be visualized; zero topics force graphs, tries, dynamic-programming tables, backtracking decision trees, or stacks into an array or tree layout.
- **SC-011**: 100% of visualization steps carry narration explaining what is happening and why; zero steps carry narration that merely restates the picture.
- **SC-012**: 100% of visualizations produce identical step sequences for identical inputs across repeated runs; zero visualizations exhibit nondeterminism.
- **SC-013**: 100% of visualizations play to a correct conclusion on boundary inputs — empty, single-element, already-sorted, all-duplicate, and exhausted-search — with zero errors or blank frames.
- **SC-014**: 100% of animations are verified to faithfully depict the algorithm they claim to show, by review against that algorithm's real steps.
- **SC-015**: Every topic offers an implementation exercise, verified by attempting it; zero topics lack one.
- **SC-016**: For every technique-based topic, the structure its implementation exercise asks the learner to build is one the technique genuinely operates on, and is introduced by that topic's own lesson; zero topics pair a technique with an unrelated container merely to satisfy this requirement.
- **SC-017**: 100% of implementation exercises evaluate construction, insertion, deletion, lookup, traversal, and memory cleanup individually; zero report a single undifferentiated pass or fail.
- **SC-018**: 100% of implementation exercises offer a guidance ladder of at least three escalating tiers, with zero lacking guidance.
- **SC-019**: No guidance tier across the curriculum contains working implementation code, verified by review of all tiers.
- **SC-020**: 100% of topics are reachable from at least one pattern, with zero uncovered topics, and 100% of pattern cross-references resolve; zero dangling references.
- **SC-021**: The curriculum's problem-exercise count grows by zero as a result of this feature; every added exercise is either a theory-embedded implementation exercise or introduces a technique-based topic's supporting structure.
- **SC-022**: Every topic added under SC-003 is a complete learning experience offering a lesson, cost table, pattern guidance, and visualization without requiring a problem exercise.
- **SC-023**: 100% of currently working exercises, lessons, and animations continue to pass after this feature, with zero regressions.
- **SC-024**: 100% of existing learner completion history, streak records, lesson completion, and animation positions remain unchanged and readable after this feature.
- **SC-025**: 100% of new material loads, renders, and plays with no network access; the platform remains fully functional offline.
- **SC-026**: The reference guide's coverage claims match the delivered curriculum with zero overstated or missing entries, its lesson and animation coverage descriptions are accurate, and its summary counts match the live curriculum exactly.
- **SC-027**: 100% of new material passes a reviewer walkthrough of the project constitution's mandated exercise quality gates — problem statement with costs and examples, skeleton with marked completion points, corner-and-memory-safety test suite, and verified reference solution — with zero exceptions.

## Assumptions

- **Target users**: Self-directed learners studying data structures and algorithms, typically preparing for technical interviews or coursework, working locally and offline in their own editor with the local dashboard for lessons, animation, and feedback.
- **Scope boundary — in**: Authoring the missing concept lessons and cost tables for existing topics; expanding algorithm visualization from its current seven animations to coverage of every topic, including the new visual styles that requires; adding topics for currently absent subject areas (sorting, core graph algorithms, advanced data structures, mathematical and bitwise techniques) with theory and visualization; adding implementation exercises that embody a topic's theory; completing pattern coverage for every topic; correcting the reference guide.
- **Scope boundary — out**: New problem exercises. The curriculum's problem-exercise set is explicitly not grown by this feature. Also out: new learner-facing surfaces beyond what the visualization needs, changes to the practice runner, changes to the authoring standard the constitution sets, and any change requiring network access.
- **Every topic gets an implementation exercise**: including the technique-based topics, which introduce the supporting structure their technique operates on. This is a deliberate breadth decision so that no topic lacks a hands-on element, and it carries the authoring cost of designing a structure genuinely native to each technique rather than bolted on.
- **Emphasis**: Concept, theory, and algorithm visualization are the deliverable. Implementation exercises are the single exception, admitted because building the structure *is* the theory — and extended to every topic, with technique-based topics introducing the supporting structure their technique operates on. Problem exercises are not a growth area.
- **Theory depth**: Lessons are expected to carry the reasoning, not only the conclusions — a correctness argument per topic, a derivation behind every stated cost including amortized ones, and an honest statement of where each topic's limits come from, including where no limit is known. This is a deliberate authoring burden and is the standard the four existing lessons do not yet meet, so those four are reworked to it rather than used as the reference for depth.
- **Notation**: Mathematical notation is expected and permitted. Anything introduced must be defined where it appears, so that a learner can follow the reasoning from the topic's declared prerequisites alone.
- **Existing problem exercises are retained, not removed**: The 52 existing exercises remain available and unchanged. This feature stops adding to that set rather than shrinking it.
- **Delivery order**: This is expected to be built in stages. The intended order is theory depth across all topics first, then visualization coverage, then implementation exercises — so that a partial delivery still leaves every topic teachable rather than half-visualized. Sequencing is a planning concern and is not further decomposed here.
- **Authoring standard**: All exercises continue to be authored under the standard, format, and quality gates the project constitution mandates. This feature supplies more material meeting those gates; it does not relax them.
- **Visualization is deterministic and offline**: Animations are precomputed step sequences with no live execution and no network dependency, so the same input always yields the same frames and the platform stays fully offline.
- **Source of truth for scope**: The project's reference roadmap is treated as the authoritative statement of intended subject coverage, so that "more materials" means closing documented gaps rather than inventing a new taxonomy.
- **Data model reuse**: Topics, lessons, cost tables, visualizations, visual styles, step frames, implementation exercises, and patterns reuse the entities the curriculum already defines; the feature adds instances and fields rather than introducing a parallel content system.
- **Progress preservation**: Learner progress is stored locally per the constitution's offline-first requirement; adding content must not require any migration that discards recorded history.
- **Single authoritative home**: Where a technique spans topics, one authoritative definition exists and others link to it, requiring cross-references to stay resolvable rather than duplicating content.
