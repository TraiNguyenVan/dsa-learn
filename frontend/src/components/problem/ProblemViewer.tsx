import { useState } from 'react';
import { Clock, Cpu, FileCode2, Copy, Check, ExternalLink } from 'lucide-react';
import { ExerciseDetail } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface ProblemViewerProps {
  exercise: ExerciseDetail | null;
  loading: boolean;
}

export function ProblemViewer({ exercise, loading }: ProblemViewerProps) {
  const [copied, setCopied] = useState(false);

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
    <div className="h-full flex flex-col overflow-hidden text-slate-200">
      {/* Top Meta Bar */}
      <div className="px-5 py-3 border-b border-slate-800/80 bg-[#121A2B]/40 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-3">
          <h1 className="text-base font-bold text-white font-mono">{exercise.title}</h1>
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

        <div className="flex items-center space-x-3 text-xs font-mono text-slate-400">
          <div className="flex items-center space-x-1 bg-slate-900/60 px-2 py-1 rounded border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Time: {exercise.time_complexity_target}</span>
          </div>
          <div className="flex items-center space-x-1 bg-slate-900/60 px-2 py-1 rounded border border-slate-800">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>Space: {exercise.space_complexity_target}</span>
          </div>
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
        <div className="max-w-3xl space-y-6 text-sm leading-relaxed text-slate-300">
          {/* Simple clean markdown render */}
          <div className="prose prose-invert prose-emerald max-w-none">
            {exercise.problem_markdown.split('\n\n').map((paragraph, idx) => {
              if (paragraph.startsWith('# ')) {
                return (
                  <h1 key={idx} className="text-xl font-bold text-white mb-4">
                    {paragraph.replace('# ', '')}
                  </h1>
                );
              }
              if (paragraph.startsWith('## ')) {
                return (
                  <h2 key={idx} className="text-sm font-semibold text-slate-200 mt-6 mb-2 uppercase tracking-wider font-mono border-b border-slate-800 pb-1">
                    {paragraph.replace('## ', '')}
                  </h2>
                );
              }
              if (paragraph.startsWith('### ')) {
                return (
                  <h3 key={idx} className="text-xs font-semibold text-slate-300 mt-4 mb-2 font-mono">
                    {paragraph.replace('### ', '')}
                  </h3>
                );
              }
              if (paragraph.startsWith('```')) {
                const codeContent = paragraph.replace(/```[a-z]*\n?/g, '').trim();
                return (
                  <pre
                    key={idx}
                    className="p-3 bg-slate-950/80 rounded-md border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto my-3"
                  >
                    <code>{codeContent}</code>
                  </pre>
                );
              }
              if (paragraph.startsWith('- ')) {
                const items = paragraph.split('\n').map((li) => li.replace(/^- /, ''));
                return (
                  <ul key={idx} className="list-disc list-inside space-y-1 my-2 text-slate-300">
                    {items.map((it, i) => (
                      <li key={i}>{it}</li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={idx} className="my-2">
                  {paragraph}
                </p>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
