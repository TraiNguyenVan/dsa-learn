import { Trophy, CheckCircle2 } from 'lucide-react';
import { TopicSummary, ExerciseSummary } from '@/lib/types';

interface ProgressOverviewProps {
  topics: TopicSummary[];
  exercises: ExerciseSummary[];
}

export function ProgressOverview({ topics, exercises }: ProgressOverviewProps) {
  const total = exercises.length;
  const completed = exercises.filter((e) => e.status === 'COMPLETED').length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="p-3 border-t border-slate-800 bg-[#0E1524] select-none">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>Mastery</span>
        </div>
        <span className="text-xs font-mono font-bold text-emerald-400">
          {completed}/{total} ({percent}%)
        </span>
      </div>

      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="space-y-1.5">
        {topics.map((t) => {
          const tEx = exercises.filter((e) => e.topic_id === t.id);
          const tComp = tEx.filter((e) => e.status === 'COMPLETED').length;
          const tPercent = tEx.length > 0 ? Math.round((tComp / tEx.length) * 100) : 0;

          return (
            <div key={t.id} className="text-[11px] flex items-center justify-between text-slate-400">
              <span className="truncate pr-2">{t.title}</span>
              <div className="flex items-center space-x-1 font-mono shrink-0">
                <span className={tPercent === 100 ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                  {tComp}/{tEx.length}
                </span>
                {tPercent === 100 && <CheckCircle2 className="w-3 h-3 text-emerald-400 inline" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
