import { useState } from 'react';
import { Search, ChevronDown, ChevronRight, CheckCircle2, Circle, Clock, ExternalLink, BookOpen } from 'lucide-react';
import { TopicSummary, ExerciseSummary } from '@/lib/types';
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
}

export function CurriculumSidebar({
  topics,
  exercises,
  selectedExerciseId,
  selectedTopicId,
  onSelectExercise,
  onSelectTopic,
}: CurriculumSidebarProps) {
  const [search, setSearch] = useState('');
  const [collapsedTopics, setCollapsedTopics] = useState<Record<string, boolean>>({});

  const toggleTopic = (topicId: string) => {
    setCollapsedTopics((prev) => ({ ...prev, [topicId]: !prev[topicId] }));
  };

  const filteredExercises = exercises.filter((ex) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return ex.title.toLowerCase().includes(q) || ex.id.toLowerCase().includes(q);
  });

  return (
    <div className="h-full flex flex-col select-none text-slate-200">
      {/* Search Header */}
      <div className="p-3 border-b border-slate-800">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search problems (Ctrl+K)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-md text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/80 transition-colors"
          />
        </div>
      </div>

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
