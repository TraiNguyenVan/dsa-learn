import React, { useEffect, useState, useCallback } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  Code2,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { ConceptLesson } from '@/lib/types';
import { fetchTopicLesson, updateLessonProgress } from '@/lib/api';
import { ComplexityMatrixTable } from './ComplexityMatrixTable';
import { MemoryDiagram } from './MemoryDiagram';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ConceptLessonViewerProps {
  topicId: string;
  onNavigateToVisualizer?: () => void;
  onNavigateToExercises?: () => void;
}

export const ConceptLessonViewer: React.FC<ConceptLessonViewerProps> = ({
  topicId,
  onNavigateToVisualizer,
  onNavigateToExercises,
}) => {
  const [lesson, setLesson] = useState<ConceptLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingSectionId, setUpdatingSectionId] = useState<string | null>(null);

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

  return (
    <div className="h-full overflow-y-auto bg-[#0F172A] p-6 lg:p-8 text-slate-200">
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

                <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed font-sans whitespace-pre-line">
                  {section.content_markdown}
                </div>
              </div>
            );
          })}
        </div>

        {/* Next Pedagogical Actions Banner */}
        <div className="border border-slate-800 rounded-xl p-6 bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div>
            <h4 className="text-sm font-semibold text-white">Ready for the Next Learning Phase?</h4>
            <p className="text-xs text-slate-400 mt-1">
              Solidify your intuition with interactive simulations or start implementing the data structure.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
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
