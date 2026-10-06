# Feature Specification: Direct Navigation Across Concept & Theory Material

**Feature Branch**: `007-concept-theory-navigation`

**Created**: 2026-10-06

**Status**: Draft

**Input**: User description: "its very hard to navigate between concept and theory, almost no direct place to do that"

## Clarifications

### Session 2026-10-06

- Q: Does "navigate between concept and theory" mean moving between different topics' concept & theory lessons, or additionally mean splitting "concept" and "theory" into two separately navigable layers inside each topic? → A: Moving between different topics' concept & theory lessons. Each topic's lesson stays a single continuous lesson; concept and theory are not separated into distinct layers, and no lesson is re-authored to create such a split. The prerequisite graph already declared across the sixteen topics is what makes these lessons one connected body of material, and making that graph navigable is the fix.
- Q: Must concept & theory locations be addressable and shareable through the browser address and history controls, or is in-application navigation alone sufficient? → A: Fully addressable. The location appears in the browser's address, navigation populates the browser's back and forward history, and a location can be copied and opened in a separate tab or a later session. In-application navigation alone was rejected: it leaves every jump a one-way trip, so a learner still loses their place on refresh and still cannot retrace or share a path — the sharpest reading of "almost no direct place to do that" would go unaddressed.

## Problem Statement

The platform has sixteen topics, and each topic carries a substantial authored concept & theory lesson (spec 006: purpose, memory representation, invariants, derived costs, limits). Those topics declare a prerequisite graph against one another: 21 edges across 16 topics, including chains such as Arrays & Hashing → Stack → Backtracking, Arrays & Hashing → Linked Lists → Trees → Graphs → Graph Algorithms, and Arrays & Hashing → Trees → Advanced Data Structures.

None of that graph is reachable from where the learner actually reads. Specifically, today:

- A lesson's "Builds on" list renders the prerequisite topics as inert text. It shows a de-slugified identifier ("linked lists") rather than the topic's real name ("Linked Lists"), and clicking it does nothing.
- Nothing anywhere shows the forward direction. After finishing a topic, there is no in-content indication of which topics build on it, so the learner cannot tell where the learning path goes next.
- There is no way to discover a neighbouring topic except by scanning the left-hand curriculum list of exercises. That list is organised around problems, so a learner who wants to compare two concepts must go via their exercises.
- No concept & theory location can be addressed. There is no shareable or bookmarkable link, no open-in-a-new-tab, and the browser's back and forward controls do not undo a topic switch — a learner who follows a path of six topics cannot retrace it, and a refresh loses their place entirely.
- The curriculum list's search matches exercises only. Searching for a subject name finds no topic and no lesson.
- Switching topic from the list forcibly changes which view the learner is in, and picking an exercise while reading a lesson throws the learner out of the lesson. Nothing remembers which section of which topic they were reading.

The result is that the concept & theory material is a set of sixteen isolated documents reachable only through an exercise-oriented list, even though the material is explicitly structured as a connected body of theory.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Follow a Declared Prerequisite From Inside the Lesson (Priority: P1)

As a learner reading a topic's concept & theory lesson who encounters an idea that rests on something they have not met, I want to see which earlier topics this one builds on and jump straight to any of their lessons, so that I can fill the gap without leaving the flow of reading.

**Why this priority**: The prerequisite graph is already declared and already displayed, but as dead text. Making those existing references real is the single highest-value change in this feature: it converts an inert list into the intended reading path, at the lowest cost, across every topic at once. Nothing else here matters if this does not work.

**Independent Test**: Open the concept & theory lesson for a topic with two or more prerequisites (for example Trees, which builds on Arrays & Hashing and Linked Lists), verify each prerequisite is shown with the topic's real name and is operable, follow one, land on that topic's lesson, then return to the original topic and the exact section previously being read. Fully deliverable alone: it repairs the only cross-topic reference that already exists.

**Acceptance Scenarios**:

1. **Given** a learner reading a topic's concept & theory lesson that declares prerequisites, **When** the lesson is displayed, **Then** each prerequisite appears with the topic's real display name, not an internal identifier, and is visibly operable rather than plain text.
2. **Given** a learner who selects one of those prerequisites, **When** the selection is made, **Then** the platform displays that prerequisite topic's concept & theory lesson, with the same view and reading affordances as any other lesson.
3. **Given** a learner who has just jumped from one topic's lesson to another's, **When** they use the browser's back control, **Then** they return to the topic and the lesson section they left.
4. **Given** a topic that declares no prerequisites (Arrays & Hashing, Linked Lists and Math and Bitwise Techniques are the three today), **When** its lesson is displayed, **Then** no prerequisite block is shown at all, rather than an empty or disabled one.
5. **Given** a prerequisite whose topic is absent from the curriculum, **When** the lesson is displayed, **Then** the reference is shown as visibly unavailable and inert, and the platform reports it for authoring follow-up instead of offering a destination that fails.
6. **Given** the one fully disconnected topic — Math and Bitwise Techniques, which neither declares a prerequisite nor is declared by anyone — **When** the learner opens its lesson, **Then** neither direction block is shown, and the topic is still reachable from the curriculum overview and from search.

---

### User Story 2 - See Where a Topic Leads (Priority: P1)

As a learner who has finished a topic's lesson, I want to see which other topics build on this one and why, so that I know what I have unlocked, what to learn next, and in what order.

**Why this priority**: A one-directional path teaches as badly as no path. The forward direction is what turns the curriculum into a progression the learner can drive, and it is what turns the "finished this" moment into a "what now" moment. It is the other half of Story 1 and ranks equally with it.

**Independent Test**: Open the lesson for Arrays & Hashing, verify that the topics declaring it as a prerequisite (Two Pointers, Sliding Window, Stack, Binary Search, Linked Lists' successors, Tries, Heap, Trees, Dynamic Programming, Sorting, Advanced Data Structures) are reachable from there; open the lesson for Math and Bitwise Techniques, verify it is correctly presented as a starting point with no forward links. Deliverable independently: it gives every one of the sixteen topics an explicit "what next" surface.

**Acceptance Scenarios**:

1. **Given** a topic whose lesson declares prerequisites, **When** the learner views the end of the lesson, **Then** the platform shows the topics that declare this topic as a prerequisite, each with its display name and an indication of what it covers.
2. **Given** a topic that no other topic builds on — seven of the sixteen today, including Tries, Dynamic Programming and Sorting — **When** its lesson is displayed, **Then** the platform states plainly that it is a starting point and offers no misleading empty forward-link list.
3. **Given** a learner who has not completed any section of a topic, **When** the learner views forward links, **Then** the links are shown and operable; completion is never required to explore ahead.
4. **Given** a topic that is both a prerequisite of others and depends on others, **When** its lesson is displayed, **Then** both directions are presented and are distinguishable at a glance.

---

### User Story 3 - Address, Bookmark, Share, and Return to a Learning Location (Priority: P1)

As a learner, I want every concept & theory location to have an address I can return to, bookmark, share, or open in a second tab, so that I can resume exactly where I left off and can point a study partner at the passage I am reading.

**Why this priority**: This is the "almost no direct place to do that" complaint in its sharpest form. Navigation that cannot be addressed cannot be reversed, resumed, or shared, so every jump is a one-way trip and every interruption costs the learner their context. Without this, Story 1 and Story 2 amount to more links into the same dead end.

**Independent Test**: Read three topics in sequence, jump between them via prerequisite links, then use back and forward to retrace the sequence; refresh the page mid-lesson and confirm the same topic, view, and lesson section return; copy the location while reading a specific section, open it in a separate tab, and confirm it lands on the same section. Deliverable independently: it makes the existing content navigable and recoverable without adding any new content.

**Acceptance Scenarios**:

1. **Given** a learner who has navigated within the concept & theory material, **When** they use the browser's back and forward controls, **Then** the platform moves through the sequence of topics, views, and sections they actually visited, in order.
2. **Given** a learner partway through a lesson section, **When** the page is refreshed or the platform is reopened later, **Then** the same topic, the same view, and the same lesson section are shown.
3. **Given** a learner reading a specific lesson section, **When** they copy the location from the browser or open the lesson's own share control, **Then** the resulting reference opens that exact topic and section when pasted into a new tab or a later session on the same machine.
4. **Given** any concept & theory link on screen, **When** the learner opens it in a new tab rather than navigating in place, **Then** the new tab shows the same destination and the original tab is undisturbed.
5. **Given** a location reference naming a topic or section that no longer exists, **When** it is opened, **Then** the platform explains what is missing and offers a way onward, rather than presenting a blank or broken view.

---

### User Story 4 - Find a Neighbouring Concept and Keep Your Place (Priority: P2)

As a learner who wants to compare two related ideas or find the topic covering something I half-remember, I want to be offered the neighbouring topics and able to search topics and lesson content by name, so that I can find a concept without knowing which exercises exist for it.

**Why this priority**: The prerequisite graph only answers "what must I know first". Learners routinely need "what else covers this", and today the only discovery surface is a list of problems. This ranks below the three P1 stories because the direct links already get a learner to a useful destination; this widens the funnel.

**Independent Test**: From a topic's lesson, follow a suggested neighbouring topic that is not a declared prerequisite; separately, search the curriculum for a subject name that matches no exercise title and confirm the matching topic and its lesson are returned. Deliverable independently: it gives learners a concept-first discovery path alongside the existing exercise-first path.

**Acceptance Scenarios**:

1. **Given** a learner on a topic's lesson, **When** they look for a neighbouring topic, **Then** the platform suggests topics that share a prerequisite or sit alongside this one in the learning order, each labelled with why it is being suggested.
2. **Given** a learner searching the curriculum, **When** they type a topic name, a subject, or a lesson section title, **Then** matching topics are returned and can be opened directly at their lesson, even when no exercise matches the query.
3. **Given** a learner who has read part of a lesson, **When** they open a different topic and then return, **Then** they are returned to the section they were reading, not to the start of the lesson.
4. **Given** a learner who is reading a lesson and selects a different topic from the curriculum list, **When** the destination opens, **Then** the learner stays in the view they were in rather than being moved into the exercise workspace.

---

### User Story 5 - Survey the Whole Body of Theory Before Choosing (Priority: P3)

As a learner who does not yet know what the sixteen topics are or how they relate, I want a single overview of the curriculum showing how the topics build on each other, with my progress, so that I can choose where to start or where I left off.

**Why this priority**: It is the most direct possible answer to "almost no direct place to do that" — one screen from which the whole concept & theory space can be entered. It ranks last because it is an orientation aid rather than a fix to an obstruction, and a learner who has already started does not need it to navigate.

**Independent Test**: Open the overview, confirm every topic in the curriculum appears with its position in the progression and its completion state, follow a prerequisite edge from it into that topic's lesson, and confirm it lands correctly. Deliverable independently: it is a complete entry point into the concept & theory material.

**Acceptance Scenarios**:

1. **Given** a learner opening the overview, **When** it is displayed, **Then** every topic in the curriculum appears, each showing how many topics it builds on and how many build on it.
2. **Given** a learner with recorded progress, **When** they view the overview, **Then** each topic shows whether it has been started, how much of its lesson has been read, and whether its exercises are complete.
3. **Given** a topic in the overview, **When** the learner selects it, **Then** they are taken to that topic's concept & theory lesson, and the overview can be returned to afterwards.
4. **Given** a learner who is midway through a lesson when they open the overview and then select a topic, **When** they return, **Then** their previous topic and section are restored.

### Edge Cases

- A declared prerequisite naming a topic that is not in the curriculum: shown as visibly unavailable and inert, never a destination that fails, and surfaced for authoring follow-up rather than silently dropped or silently invented.
- A topic with no prerequisites: no prerequisite block rendered at all; no empty heading, no disabled controls.
- A topic nothing builds on: explicitly described as a starting point rather than given an empty forward-link list.
- A prerequisite that also depends back on the current topic, or a longer cycle introduced by future authoring: the platform renders the affected topics without recursing indefinitely, identifies the cycle, and always leaves the learner a way out.
- Two or more topics sharing the same prerequisite: every one of them is offered; none is collapsed or dropped as a duplicate.
- A placeholder (not-yet-authored) lesson: prerequisite, forward, and neighbouring links still work. Navigation must not depend on authored content existing.
- A location reference whose topic has been renamed, merged, or removed: an explanatory message with a route onward, never a blank view.
- Deep-linking into a lesson section of a placeholder lesson: opens the lesson and flags the placeholder as usual; the section anchor degrades to the lesson as a whole rather than failing.
- A learner with no recorded progress anywhere: the overview and every link render fully, with empty progress shown as unstarted rather than omitted.
- Forward links are advisory, never gates: a learner who has read nothing of a topic may still open every topic that builds on it (consistent with the spec 006 decision that prerequisites advise rather than block).
- A topic title long enough to wrap, and a topic with many forward links: the link lists stay legible and bounded rather than overflowing or pushing the lesson content off screen.
- Back pressed past the earliest visit in the session: the platform does not leave the application.
- The platform opened directly from a copied reference on a machine with no prior session, offline: the referenced location resolves using only locally stored curriculum content.

## Requirements *(mandatory)*

### Functional Requirements

**Concept & theory graph**

- **FR-001**: The platform MUST present, on every concept & theory lesson, the topics that lesson declares it builds on, using each referenced topic's real display name rather than an internal identifier.
- **FR-002**: Every displayed prerequisite MUST be operable and MUST open that topic's concept & theory lesson.
- **FR-003**: The platform MUST present, on every concept & theory lesson, the topics that declare the current topic as a prerequisite, distinguished from the prerequisites so the two directions are never confusable.
- **FR-004**: Where a topic has no prerequisites, the platform MUST omit the prerequisite block entirely rather than render an empty one.
- **FR-005**: Where a topic has no topics building on it, the platform MUST state that it is a starting point rather than render an empty forward-link block.
- **FR-006**: The platform MUST resolve the curriculum's prerequisite graph in both directions from the declared curriculum data, without hard-coding any individual topic relationship in the interface.
- **FR-007**: Any prerequisite or forward reference that cannot be resolved to an existing topic MUST be presented as unavailable, MUST NOT be operable, and MUST be recorded so it can be corrected in the curriculum source rather than being silently hidden.
- **FR-008**: Presentation of the graph MUST terminate for any input, including cycles, and MUST always leave the learner a way to leave the current view.

**Addressable learning locations**

- **FR-009**: Every concept & theory location — a topic, the view it is shown in, and a lesson section within it — MUST have a durable reference that resolves to that exact location.
- **FR-010**: Opening a location reference MUST restore the named topic, the named view, and the named lesson section.
- **FR-011**: Navigation between concept & theory locations MUST participate in the browser's own back and forward history, so that a sequence of visited topics can be retraced.
- **FR-012**: The learner MUST be able to open any concept & theory location reference in a separate tab or later session, and land on that same location, using only locally stored curriculum content.
- **FR-013**: The current concept & theory location MUST be copyable by the learner without manual transcription.
- **FR-014**: A reference that cannot be resolved MUST produce an explanatory message identifying what is missing and offering a route onward, and MUST NOT render a blank, partial, or broken view.
- **FR-015**: The platform MUST remember the section a learner last read within each topic, independently of which sections they marked complete, and MUST return them there when they revisit that topic's lesson.
- **FR-016**: Selecting a topic MUST NOT move the learner out of the view they are currently in.

**Neighbour discovery**

- **FR-017**: The platform MUST suggest neighbouring topics for the current topic, drawing on topics that share a prerequisite and on topics adjacent in the curriculum's learning order, and MUST label each suggestion with the reason it is offered.
- **FR-018**: Search MUST match topics by name and description, and MUST match lesson content including section titles, returning topics directly navigable to their lesson — independently of whether any exercise matches the query.
- **FR-019**: The number of suggestions presented MUST be bounded so the concept & theory material stays the focus of the page.

**Curriculum overview**

- **FR-020**: The platform MUST provide a single overview of the whole curriculum listing every topic with its position in the progression — how many topics it builds on and how many build on it — and with the learner's recorded progress for that topic.
- **FR-021**: Every topic in the overview MUST be selectable and MUST open that topic's concept & theory lesson.
- **FR-022**: A learner with no recorded progress MUST see the overview render completely, with unstarted topics shown as unstarted rather than omitted.
- **FR-023**: A learner who opens the overview from within a lesson and then navigates elsewhere MUST be able to return to the topic and section they left.

**Constraint adherence**

- **FR-024**: All navigation behaviour MUST operate fully offline with no external service, account, or network dependency.
- **FR-025**: Reading progress, completed sections, and last-read position MUST continue to be stored locally in the existing human-readable form, with no new remote store.
- **FR-026**: This feature MUST NOT require the learner to have completed anything in order to reach any topic in the curriculum.
- **FR-027**: This feature MUST NOT alter existing lesson, exercise, visualizer, or pattern content; it adds navigation only.
- **FR-028**: "Navigating between concept and theory" is interpreted for this feature as moving between **different topics' concept & theory lessons**. Concept and theory are NOT split into separately navigable layers within a topic: each topic's lesson stays a single continuous lesson, and this feature neither re-authors nor re-partitions lesson content to create such a split.
- **FR-029**: Concept & theory locations MUST be addressable and shareable through the browser. The current location MUST be reflected in the browser's address, navigation MUST populate the browser's back and forward history, and a location MUST be copyable and openable in a separate tab or a later session. In-application navigation alone is NOT sufficient.

### Key Entities

- **Topic**: A subject in the curriculum (sixteen today). Carries a display name, a description, a position in the learning order, and the set of topic identifiers it declares as prerequisites. The authoritative content of a topic is unchanged by this feature.
- **Curriculum Relation**: A directed edge between two topics, derived from the declared prerequisites. Has an originating topic, a target topic, and a direction — the target is a prerequisite of the origin, or the origin builds on the target. Resolved in both directions from the same declaration.
- **Learning Location**: A durable, referenceable position in the platform: a topic, the view being displayed for it, and optionally a lesson section within that view. This is the unit that back, forward, refresh, bookmarking, sharing, and open-in-new-tab all act on.
- **Reading Position**: Per topic, the lesson section the learner was last reading, tracked independently of which sections they marked complete. Distinct from mastery progress.
- **Neighbour Suggestion**: A topic offered as related to the current one, together with the reason for the suggestion — shares a prerequisite, or adjacent in the learning order.
- **Unresolved Reference**: A prerequisite or forward declaration naming a topic absent from the curriculum. Recorded so it can be corrected in the curriculum source rather than being hidden or invented.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every declared prerequisite reference across all sixteen topics — 21 edges as declared today — is displayed with the topic's real display name and is operable, with zero inert prerequisite references.
- **SC-002**: A learner can move from any topic's concept & theory lesson to any of that lesson's declared prerequisites in a single interaction, and land on that topic's lesson.
- **SC-003**: Every one of the sixteen topics surfaces either its forward links or an explicit statement that it is a leaf; no topic presents an unexplained absence. Seven topics are leaves today, and Math and Bitwise Techniques is the single topic that is a leaf with no prerequisites either.
- **SC-004**: After following a chain of at least five cross-topic links, a learner retraces the entire chain using the browser's back control in five actions, landing on the same topic and section at each step.
- **SC-005**: Refreshing the platform or reopening it later returns the learner to the same topic, view, and lesson section 100% of the time.
- **SC-006**: Any concept & theory location, copied and opened in a new tab or a later session on the same machine, resolves to that same topic and section.
- **SC-007**: A learner who has never used the platform can reach any of the sixteen topics' concept & theory lessons from the curriculum overview in two interactions or fewer, without needing to know which exercises exist.
- **SC-008**: A learner who has never used the platform can find a topic by typing its subject name in at most two interactions, even when no exercise in the curriculum matches that name.
- **SC-009**: Selecting a different topic while reading a lesson keeps the learner in the current view and preserves the section they were reading; returning brings them back to that exact section.
- **SC-010**: In a usability session with at least ten participants, at least 90% complete the journey "read a topic's lesson → follow a prerequisite to another topic → read it → return to the original spot" unaided, with no verbal guidance.
- **SC-011**: Walking all sixteen topics and every prerequisite and forward edge in both directions produces zero broken destinations, zero blank views, and zero uncaught errors.
- **SC-012**: No learner is ever shown a navigation target that leads to an error or missing content.
- **SC-013**: Every one of the sixteen topics' concept & theory lessons opens in under 2 seconds on a local machine, including when entered from a copied reference.
- **SC-014**: No new external network dependency is introduced; the platform's offline behaviour is unchanged.

## Assumptions

- "Concept and theory" refers to the platform's existing Concept & Theory view of a topic — the authored lesson, its cost table, and its memory model — consistent with specs 003 and 006. It is not a separate theory-only artifact, and this feature does not create one.
- The sixteen-topic curriculum and its declared prerequisite edges are the source of truth. This feature surfaces and navigates the graph that already exists; it does not re-author, expand, or correct curriculum content. Unresolvable references are reported for authoring follow-up rather than invented.
- Reading progress, section completion, and last-read position are already stored locally in human-readable form. No new storage backend is required.
- Progress data is single-learner and local; there are no accounts, roles, or permissions, so no access-control concerns arise.
- The existing tab bar, keyboard shortcuts, and exercise workspace continue to work unchanged. This feature adds navigation affordances to the concept & theory material; it is not a redesign of the dashboard.
- Prerequisites remain advisory rather than gating, carrying forward the spec 006 decision: a learner must be able to explore ahead without being blocked.
- Neighbouring and forward links are shown with progressive disclosure, bounded in number, so that the lesson itself remains the focus of the page.
- Addressing a location does not require the platform to become a multi-page site, and requires no server restart to continue working.
- The local platform is assumed to be run on a developer or learner workstation, where copying a location reference and reopening it later is a normal, supported action.

## Out of Scope

- Authoring, rewriting, expanding, or correcting lesson, cost-table, or memory-model content.
- Splitting "concept" and "theory" into two separately navigable layers within a topic. Settled by Q1: each topic's lesson stays a single continuous lesson.
- Adding topics, exercises, visualizers, or patterns to the curriculum.
- Redesigning the concept & theory view itself, its layout, or its reading experience.
- Replacing or reorganising the existing curriculum list or exercise workspace.
- Any account, authentication, cloud sync, or multi-device synchronisation.