import { useEffect, useState } from 'react';
import { Search, ChevronDown, ChevronRight, CheckCircle2, Circle, Clock, ExternalLink, BookOpen, Network, Loader2 } from 'lucide-react';
import { TopicSummary, ExerciseSummary, TopicSearchResult } from '@/lib/types';
import { searchTopics } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProgressOverview } from './ProgressOverview';
import { FoundationBadge } from '@/components/problem/FoundationBadge';
import { cn } from '@/lib/utils';

interface CurriculumSidebarProps {
  topics: TopicSummary[];
  exercises: ExerciseSummary[];
  selectedExerciseId: string | null;
  selectedTopicId?: string | null;
  onSelectExercise: (id: string) => void;
  onSelectTopic?: (topicId: string) => void;
  /** spec 007 FR-020: open the whole-curriculum overview. */
  onShowOverview?: () => void;
  showOverviewActive?: boolean;
}

export function CurriculumSidebar({
  topics,
  exercises,
  selectedExerciseId,
  selectedTopicId,
  onSelectExercise,
  onSelectTopic,
  onShowOverview,
  showOverviewActive = false,
}: CurriculumSidebarProps) {
  const [search, setSearch] = useState('');
  const [collapsedTopics, setCollapsedTopics] = useState<Record<string, boolean>>({});

  // spec 007 FR-018 / T042: concept-first search. The previous filter matched
  // exercise titles only, so searching for a subject name found no topic and no
  // lesson — a learner had to know an exercise existed to find its concept.
  const [topicResults, setTopicResults] = useState<TopicSearchResult[] | null>(null);
  const [searchingTopics, setSearchingTopics] = useState(false);

  useEffect(() => {
    const term = search.trim();
    if (!term) {
      setTopicResults(null);
      setSearchingTopics(false);
      return;
    }

    let cancelled = false;
    setSearchingTopics(true);
    // Debounced so a fast typist does not fire a request per keystroke.
    const timer = setTimeout(() => {
      searchTopics(term)
        .then((res) => {
          if (!cancelled) setTopicResults(res.results);
        })
        .catch(() => {
          if (!cancelled) setTopicResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearchingTopics(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  const toggleTopic = (topicId: string) => {
    setCollapsedTopics((prev) => ({ ...prev, [topicId]: !prev[topicId] }));
  };

  const filteredExercises = exercises.filter((ex) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return ex.title.toLowerCase().includes(q) || ex.id.toLowerCase().includes(q);
  });

  // Topics matching the query directly, so a concept is findable even when no
  // exercise matches (SC-008). Section-heading matches are labelled with the
  // heading, because every authored lesson shares the same seven headings and
  // an unexplained breadth of 16 results reads as a broken filter.
  const matchingTopics = (topicResults ?? []).filter(
    (r) => r.node.id !== selectedTopicId && !filteredExercises.some((ex) => ex.topic_id === r.node.id)
  );

  return (
    <div className="h-full flex flex-col select-none text-slate-200">
      {/* Search Header */}
      <div className="p-3 border-b border-slate-800">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search topics and problems (Ctrl+K)..."
            aria-label="Search topics and problems"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-md text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/80 transition-colors"
          />
          {searchingTopics && (
            <Loader2 className="w-3 h-3 absolute right-2.5 top-2.5 text-slate-500 animate-spin" />
          )}
        </div>

        {/* spec 007 FR-020: the whole-curriculum entry point, always reachable
            without an exercise in progress. */}
        {onShowOverview && (
          <button
            onClick={onShowOverview}
            className={`mt-2 w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              showOverviewActive
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            Curriculum Map
            <span className="ml-auto font-mono text-[10px] text-slate-500">{topics.length}</span>
          </button>
        )}
      </div>

      {/* spec 007 FR-018: topic-level matches, so a concept is findable by name
          even when no exercise shares it. */}
      {matchingTopics.length > 0 && (
        <div className="px-2 py-2 border-b border-slate-800 space-y-0.5">
          <div className="px-1 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-600">
            Topics
          </div>
          {matchingTopics.map((result) => (
            <button
              key={result.node.id}
              onClick={() => onSelectTopic?.(result.node.id)}
              className="w-full text-left px-2 py-1.5 rounded text-xs text-slate-300 hover:text-emerald-300 hover:bg-slate-800/60 transition-colors group"
            >
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 shrink-0" />
                <span className="truncate">{result.node.title}</span>
              </span>
              {result.matched_sections.length > 0 && (
                <span className="block pl-[22px] text-[10px] text-slate-500 truncate">
                  in {result.matched_sections.join(', ')}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Curriculum List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3">
          {topics.map((topic) => {
            const topicExercises = filteredExercises.filter((e) => e.topic_id === topic.id);
            if (topicExercises.length === 0 && search.trim()) return null;

            const isCollapsed = collapsedTopics[topic.id] || false;
            const completedInTopic = topicExercises.filter((e) => e.status === 'COMPLETED').length;

            const isTopicSelected = selectedTopicId === topic.id;

            return (
              <div key={topic.id} className="rounded-md overflow-hidden">
                {/* Topic Header Accordion */}
                <div
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold rounded transition-colors group",
                    isTopicSelected
                      ? "bg-slate-800/80 text-emerald-400 border-l-2 border-emerald-500"
                      : "text-slate-300 hover:bg-slate-800/40"
                  )}
                >
                  <button
                    onClick={() => toggleTopic(topic.id)}
                    className="flex-1 flex items-center space-x-1.5 truncate text-left hover:text-white"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                    <span className="truncate">{topic.title}</span>
                  </button>
                  <div className="flex items-center space-x-1 shrink-0 ml-1">
                    <span className="text-[11px] font-mono text-slate-500">
                      {completedInTopic}/{topicExercises.length}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTopic?.(topic.id);
                      }}
                      title="Learn concept and view visualizer"
                      className="p-1 rounded text-slate-500 hover:text-emerald-400 hover:bg-slate-800/80 transition-colors"
                    >
                      <BookOpen className="w-3 h-3" />
                    </button>
                    <a
                      href={topic.roadmap_url || "https://roadmap.sh/datastructures-and-algorithms"}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open roadmap.sh reference for this topic"
                      className="p-0.5 text-slate-500 hover:text-indigo-400 opacity-60 group-hover:opacity-100 transition-opacity"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Exercises Under Topic */}
                {!isCollapsed && (
                  <div className="mt-1 space-y-0.5 pl-2">
                    {topicExercises.map((ex) => {
                      const isSelected = ex.id === selectedExerciseId;
                      return (
                        <button
                          key={ex.id}
                          onClick={() => onSelectExercise(ex.id)}
                          className={cn(
                            'w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors text-left group cursor-pointer',
                            isSelected
                              ? 'bg-slate-800 text-white font-medium shadow-sm'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                          )}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            {ex.status === 'COMPLETED' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : ex.status === 'IN_PROGRESS' ? (
                              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            )}
                            <span className="truncate">{ex.title}</span>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                            {ex.is_foundation && <FoundationBadge size="sm" />}
                            <Badge
                              variant={
                                ex.difficulty === 'Easy'
                                  ? 'easy'
                                  : ex.difficulty === 'Medium'
                                  ? 'medium'
                                  : 'hard'
                              }
                              className="text-[10px] py-0 px-1 font-mono"
                            >
                              {ex.difficulty}
                            </Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Progress Overview Footer */}
      <ProgressOverview topics={topics} exercises={exercises} />
    </div>
  );
}
