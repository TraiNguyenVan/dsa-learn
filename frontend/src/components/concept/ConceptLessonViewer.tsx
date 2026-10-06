import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  Code2,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Link2,
} from 'lucide-react';
import { ConceptLesson, CurriculumGraph } from '@/lib/types';
import {
  fetchTopicLesson,
  updateLessonProgress,
  fetchCurriculumGraph,
  saveReadingPosition,
} from '@/lib/api';
import { renderMarkdownWithMath } from '@/lib/markdown';
import { ComplexityMatrixTable } from './ComplexityMatrixTable';
import { MemoryDiagram } from './MemoryDiagram';
import { PrerequisiteLinks } from './PrerequisiteLinks';
import { ForwardLinks } from './ForwardLinks';
import { TopicNeighbours } from './TopicNeighbours';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ConceptLessonViewerProps {
  topicId: string;
  /**
   * spec 007 US3 (T033, T041): the section the address names. Takes precedence
   * over the stored reading position (H-7), so a shared link always lands where
   * it points even if the reader was elsewhere.
   */
  requestedSectionId?: string | null;
  /**
   * spec 007 FR-014: set when the address named something unresolvable. The
   * lesson still renders — a blank view is never acceptable.
   */
  locationNotice?: string | null;
  onNavigateToVisualizer?: () => void;
  onNavigateToExercises?: () => void;
  /** spec 007 FR-002: cross-topic navigation. */
  onNavigateToTopic?: (topicId: string) => void;
}

export const ConceptLessonViewer: React.FC<ConceptLessonViewerProps> = ({
  topicId,
  requestedSectionId = null,
  locationNotice = null,
  onNavigateToVisualizer,
  onNavigateToExercises,
  onNavigateToTopic,
}) => {
  const [lesson, setLesson] = useState<ConceptLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingSectionId, setUpdatingSectionId] = useState<string | null>(null);

  // spec 007: the navigation graph is an ADVISORY dependency (R-006). The
  // lesson body must render whether or not it ever arrives — a failed graph
  // request must not blank the content the learner came for.
  const [graph, setGraph] = useState<CurriculumGraph | null>(null);
  const [graphLoading, setGraphLoading] = useState(true);

  // spec 007 FR-015 / R-005 (P-3): which section is currently in view, debounced
  // so scrolling does not produce a write per pixel.
  const visibleSectionRef = useRef<string | null>(null);
  const positionTimerRef = useRef<number | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const didRestoreRef = useRef<string | null>(null);
  // The scroll container is this component's own scrollable div, not the window.
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const loadLesson = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTopicLesson(topicId);
      setLesson(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load lesson content');
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    loadLesson();
  }, [loadLesson]);

  // Advisory: never let the graph block lesson rendering. See
  // navigation-graph-contract.md "Advisory fetch" — on failure the prerequisite,
  // forward and neighbour blocks render nothing and the lesson still appears.
  //
  // The try/catch is NOT redundant with the `.catch()` below. A rejected promise
  // and a synchronous throw are different failures and only the former reaches a
  // `.catch()` on the chain. Without this, a synchronous throw propagates out of
  // the effect and blanks the lesson the learner came for — the exact outcome
  // the advisory contract exists to prevent. See
  // `.specify/bugs/concept-viewer-api-mock-incomplete`.
  useEffect(() => {
    let cancelled = false;
    setGraphLoading(true);
    const giveUp = () => {
      if (cancelled) return;
      setGraph(null);
      setGraphLoading(false);
    };
    try {
      fetchCurriculumGraph()
        .then((data) => {
          if (!cancelled) setGraph(data);
        })
        .catch(giveUp)
        .finally(() => {
          if (!cancelled) setGraphLoading(false);
        });
    } catch {
      giveUp();
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // Lesson markdown is authored with LaTeX math and markdown lists; render it once
  // per lesson load instead of emitting the raw source as a text node.
  const renderedSectionBodies = useMemo(() => {
    const bodies = new Map<string, string>();
    lesson?.sections.forEach((section) => {
      bodies.set(section.id, renderMarkdownWithMath(section.content_markdown, { breaks: true }));
    });
    return bodies;
  }, [lesson]);

  const handleToggleSection = async (sectionId: string, currentCompleted: boolean) => {
    try {
      setUpdatingSectionId(sectionId);
      const updatedProgress = await updateLessonProgress(topicId, sectionId, !currentCompleted);
      setLesson((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          reading_progress: updatedProgress,
        };
      });
    } catch (err) {
      console.error('Failed to update section progress', err);
    } finally {
      setUpdatingSectionId(null);
    }
  };

  // -- reading position (spec 007 FR-015) ----------------------------------

  /** Report a section as "last read" once it has been meaningfully in view. */
  const reportVisibleSection = useCallback(
    (sectionId: string) => {
      if (visibleSectionRef.current === sectionId) return;
      visibleSectionRef.current = sectionId;
      if (positionTimerRef.current !== null) window.clearTimeout(positionTimerRef.current);
      positionTimerRef.current = window.setTimeout(() => {
        saveReadingPosition(topicId, sectionId).catch(() => {
          // A dropped position write is not worth interrupting reading over.
        });
      }, 400);
    },
    [topicId]
  );

  // Observe which section the learner is actually looking at.
  useEffect(() => {
    if (!lesson || lesson.sections.length === 0) return;
    const container = scrollRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        // The entry intersecting most strongly is the one being read.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target instanceof HTMLElement) {
          reportVisibleSection(visible.target.dataset.sectionId ?? '');
        }
      },
      // Scope observation to the lesson's own scroll container so "in view"
      // means in view of the reader, not merely in the layout.
      { root: container, rootMargin: '-10% 0px -60% 0px', threshold: [0, 0.25, 0.5] }
    );

    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [lesson, reportVisibleSection]);

  useEffect(() => {
    return () => {
      if (positionTimerRef.current !== null) window.clearTimeout(positionTimerRef.current);
    };
  }, []);

  /**
   * Restore scroll position, with the precedence from the location contract:
   * an address-supplied section wins (H-7), else the stored reading position,
   * else the top of the lesson.
   */
  const restoreTarget = requestedSectionId ?? lesson?.reading_progress?.last_read_section ?? null;

  useEffect(() => {
    if (loading || !lesson || lesson.sections.length === 0) return;

    // Only restore once per (topic, target) so a learner who deliberately
    // scrolls away is not yanked back on the next render.
    const key = `${topicId}::${restoreTarget ?? 'top'}`;
    if (didRestoreRef.current === key) return;
    didRestoreRef.current = key;

    const sectionIds = new Set(lesson.sections.map((s) => s.id));
    const container = scrollRef.current;

    if (restoreTarget && sectionIds.has(restoreTarget)) {
      // A stored section that no longer exists degrades to the lesson as a
      // whole (L-4) rather than erroring.
      const el = sectionRefs.current[restoreTarget];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }

    // Scroll the lesson's own container, not the window: the lesson renders
    // inside a fixed-height pane, so window scrolling would be a no-op.
    if (container) container.scrollTo({ top: 0 });
  }, [loading, lesson, topicId, restoreTarget]);

  const handleCopyLocation = useCallback(() => {
    try {
      const url = window.location.href;
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(url);
      }
    } catch {
      // Clipboard access can be denied; the address bar is always copyable.
    }
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-8 bg-[#0F172A] text-slate-400">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
          <span className="text-sm font-mono">Loading lesson and conceptual guide...</span>
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="h-full flex items-center justify-center p-8 bg-[#0F172A] text-slate-400">
        <div className="flex flex-col items-center space-y-3 text-center max-w-md">
          <AlertCircle className="w-8 h-8 text-rose-400" />
          <h3 className="text-base font-semibold text-white">Lesson Not Found</h3>
          <p className="text-xs text-slate-400">{error || 'Unable to retrieve lesson data.'}</p>
          <Button variant="outline" size="sm" onClick={loadLesson} className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const completedSections = new Set(lesson.reading_progress.completed_sections || []);
  const totalMinutes = lesson.sections.reduce((acc, s) => acc + (s.estimated_minutes || 1), 0);
  const progressPct = lesson.reading_progress.progress_pct || 0;

  const prerequisites = graph?.prerequisites_by_topic?.[topicId] ?? [];
  const dependents = graph?.dependents_by_topic?.[topicId] ?? [];
  const neighbours = graph?.neighbours_by_topic?.[topicId] ?? [];
  const unresolvedForTopic = (graph?.unresolved ?? []).filter(
    (ref) => ref.referenced_by === topicId
  );

  const navigateToTopic = (targetTopicId: string) => onNavigateToTopic?.(targetTopicId);

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto bg-[#0F172A] p-6 lg:p-8 text-slate-200"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Lesson Header Banner */}
        <div className="border border-slate-800 rounded-xl p-6 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
                  Theoretical Foundations
                </Badge>
                <span className="text-xs text-slate-500 font-mono">Topic ID: {topicId}</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">{lesson.title}</h1>
              <p className="text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">{lesson.summary}</p>
            </div>

            {/* Reading Progress Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 min-w-[200px] shrink-0">
              <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
                <span className="text-slate-400">Mastery Progress</span>
                <span className="text-emerald-400 font-bold">{progressPct}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-2">
                <span className="flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>~{totalMinutes} min read</span>
                </span>
                <span>
                  {completedSections.size}/{lesson.sections.length} read
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* spec 007 FR-014: an unresolvable location explains itself and offers a
            route onward, rather than showing a blank or partial view. */}
        {locationNotice && (
          <div className="border border-amber-700/50 bg-amber-950/30 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-200 mb-1">
                That link did not point where it should
              </h3>
              <p className="text-xs text-amber-200/70 leading-relaxed font-mono">{locationNotice}</p>
            </div>
          </div>
        )}

        {/* spec 006 R-008 / FR-001: the generic fallback is flagged, never
            presented as authored teaching content. */}
        {lesson.is_placeholder && (
          <div className="border border-amber-700/50 bg-amber-950/30 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-200 mb-1">
                This lesson has not been written yet
              </h3>
              <p className="text-xs text-amber-200/70 leading-relaxed font-mono">
                The text below is generic scaffolding, not material specific to{' '}
                {lesson.title}. It is shown so navigation keeps working while
                authoring is in progress, and it earns no mastery credit. No new
                lesson section can be completed until the authored version lands.
              </p>
            </div>
          </div>
        )}

        {/* spec 007 US1 FR-001/FR-002/FR-004: real display names, operable, and
            omitted entirely when the topic declares none. */}
        {(prerequisites.length > 0 || unresolvedForTopic.length > 0 || graphLoading) && (
          <PrerequisiteLinks
            prerequisites={prerequisites}
            unresolved={unresolvedForTopic}
            onNavigate={navigateToTopic}
          />
        )}

        {/* spec 007 FR-017: neighbouring topics, with the reason shown. */}
        {!graphLoading && <TopicNeighbours neighbours={neighbours} onNavigate={navigateToTopic} />}

        {/* Complexity Matrix Table */}
        {lesson.complexity_matrix && lesson.complexity_matrix.length > 0 && (
          <ComplexityMatrixTable entries={lesson.complexity_matrix} />
        )}

        {/* Physical Memory Architecture Diagram */}
        <MemoryDiagram topicId={topicId} />

        {/* Structured Reading Modules */}
        <div className="space-y-6">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Lesson Modules</h2>
          </div>

          {lesson.sections.map((section) => {
            const isCompleted = completedSections.has(section.id);
            const isUpdating = updatingSectionId === section.id;

            return (
              <div
                key={section.id}
                data-section-id={section.id}
                ref={(el) => {
                  sectionRefs.current[section.id] = el;
                }}
                className={`border rounded-lg p-5 transition-all ${
                  isCompleted
                    ? 'border-emerald-500/30 bg-slate-900/40'
                    : 'border-slate-800 bg-slate-900/60'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      0{section.order}
                    </span>
                    <h3 className="text-base font-semibold text-white tracking-wide">{section.title}</h3>
                  </div>

                  <button
                    onClick={() => handleToggleSection(section.id, isCompleted)}
                    disabled={isUpdating}
                    className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                      isCompleted
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span>{isCompleted ? 'Completed' : 'Mark as read'}</span>
                  </button>
                </div>

                <div
                  className="markdown-body text-sm leading-relaxed text-slate-300"
                  dangerouslySetInnerHTML={{
                    __html: renderedSectionBodies.get(section.id) ?? '',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* spec 007 US2 FR-003/FR-005: the reverse direction, or an honest
            statement that this topic is a leaf. */}
        {!graphLoading && (
          <ForwardLinks
            dependents={dependents}
            onNavigate={navigateToTopic}
            graphAvailable={graph !== null}
          />
        )}

        {/* Next Pedagogical Actions Banner */}
        <div className="border border-slate-800 rounded-xl p-6 bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div>
            <h4 className="text-sm font-semibold text-white">Ready for the Next Learning Phase?</h4>
            <p className="text-xs text-slate-400 mt-1">
              Solidify your intuition with interactive simulations or start implementing the data structure.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            {/* spec 007 FR-013: a copyable location, so a passage can be shared
                or bookmarked without manual transcription. */}
            <Button
              onClick={handleCopyLocation}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-emerald-400 flex items-center space-x-1.5"
              title="Copy a link to where you are reading"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Copy link</span>
            </Button>
            {onNavigateToVisualizer && (
              <Button
                onClick={onNavigateToVisualizer}
                variant="outline"
                size="sm"
                className="border-sky-500/40 text-sky-400 hover:bg-sky-500/10 flex items-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Simulate Operations</span>
              </Button>
            )}
            {onNavigateToExercises && (
              <Button
                onClick={onNavigateToExercises}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1.5"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Practice Problems</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};