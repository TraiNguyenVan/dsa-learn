import { useState, useMemo } from 'react';
import { Clock, Cpu, FileCode2, Copy, Check, ExternalLink, Lightbulb } from 'lucide-react';
import { renderMarkdownWithMath } from '@/lib/markdown';
import { ExerciseDetail } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FoundationBadge } from './FoundationBadge';
import { ProgressiveHintDrawer } from './ProgressiveHintDrawer';

interface ProblemViewerProps {
  exercise: ExerciseDetail | null;
  loading: boolean;
}

export function ProblemViewer({ exercise, loading }: ProblemViewerProps) {
  const [copied, setCopied] = useState(false);
  const [hintsOpen, setHintsOpen] = useState(false);

  const renderedContent = useMemo(() => {
    if (!exercise?.problem_markdown) return '';
    return renderMarkdownWithMath(exercise.problem_markdown);
  }, [exercise?.problem_markdown]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 text-sm">
        <span className="animate-spin mr-2">⟳</span> Loading problem statement...
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 text-sm">
        Select an exercise from the sidebar to start practicing.
      </div>
    );
  }

  const copyPath = () => {
    navigator.clipboard.writeText(exercise.solution_relpath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden text-slate-200 relative">
      {/* Top Meta Bar */}
      <div className="px-5 py-3 border-b border-slate-800/80 bg-[#121A2B]/40 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5">
          <h1 className="text-base font-bold text-white font-mono">{exercise.title}</h1>
          {exercise.is_foundation && <FoundationBadge size="md" />}
          <Badge
            variant={
              exercise.difficulty === 'Easy'
                ? 'easy'
                : exercise.difficulty === 'Medium'
                ? 'medium'
                : 'hard'
            }
          >
            {exercise.difficulty}
          </Badge>
        </div>

        <div className="flex items-center space-x-2.5 text-xs font-mono text-slate-400">
          <div className="flex items-center space-x-1 bg-slate-900/60 px-2 py-1 rounded border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Time: {exercise.time_complexity_target}</span>
          </div>
          <div className="flex items-center space-x-1 bg-slate-900/60 px-2 py-1 rounded border border-slate-800">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>Space: {exercise.space_complexity_target}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHintsOpen(true)}
            className="h-6 px-2 text-xs border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 cursor-pointer"
          >
            <Lightbulb className="w-3.5 h-3.5 mr-1 text-amber-400" />
            <span>Hints</span>
          </Button>
          <a
            href={exercise.reference_url || "https://roadmap.sh/datastructures-and-algorithms"}
            target="_blank"
            rel="noopener noreferrer"
            title="View concept guide on roadmap.sh"
            className="flex items-center space-x-1 bg-slate-900/60 hover:bg-slate-800/80 px-2 py-1 rounded border border-slate-800 hover:border-indigo-500/50 text-slate-400 hover:text-indigo-400 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
            <span>roadmap.sh</span>
          </a>
        </div>
      </div>

      {/* Local Editing Banner */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-5 py-2 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-2 truncate">
          <FileCode2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-slate-500">Local Starter File:</span>
          <code className="text-emerald-300 font-mono font-medium truncate">
            {exercise.solution_relpath}
          </code>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyPath}
          className="h-6 px-2 text-[11px] text-slate-400 hover:text-white"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
          {copied ? 'Copied' : 'Copy Path'}
        </Button>
      </div>

      {/* Main Problem Markdown View */}
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-3xl">
          <div
            className="problem-markdown text-sm leading-relaxed text-slate-300"
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
        </div>
      </ScrollArea>

      {/* Progressive Hint Drawer */}
      <ProgressiveHintDrawer
        topicId={exercise.topic_id}
        exerciseId={exercise.id}
        isOpen={hintsOpen}
        onClose={() => setHintsOpen(false)}
      />
    </div>
  );
}
