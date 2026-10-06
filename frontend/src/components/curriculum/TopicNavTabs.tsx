import React from 'react';
import { BookOpen, Sparkles, Code2, Compass, Network } from 'lucide-react';

export type TopicViewMode = 'concept' | 'visualizer' | 'exercises' | 'patterns';

interface TopicNavTabsProps {
  activeMode: TopicViewMode;
  onModeChange: (mode: TopicViewMode) => void;
  topicTitle?: string;
  /** spec 007 US5: toggle the whole-curriculum overview (FR-020). */
  onShowOverview?: () => void;
  showOverviewActive?: boolean;
}

export const TopicNavTabs: React.FC<TopicNavTabsProps> = ({
  activeMode,
  onModeChange,
  topicTitle,
  onShowOverview,
  showOverviewActive = false,
}) => {
  const tabs = [
    {
      id: 'concept' as TopicViewMode,
      label: 'Concept & Theory',
      icon: BookOpen,
      badge: 'Learn',
    },
    {
      id: 'visualizer' as TopicViewMode,
      label: 'Interactive Visualizer',
      icon: Sparkles,
      badge: 'Simulate',
    },
    {
      id: 'exercises' as TopicViewMode,
      label: 'Practice & Code',
      icon: Code2,
      badge: 'Solve',
    },
    {
      id: 'patterns' as TopicViewMode,
      label: 'Patterns & Decision Matrix',
      icon: Compass,
      badge: 'Guide',
    },
  ];

  return (
    <div className="h-10 bg-[#0B132B] border-b border-slate-800 px-4 flex items-center justify-between select-none">
      <div className="flex items-center space-x-1 sm:space-x-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeMode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onModeChange(tab.id)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase tracking-wider ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-slate-800/60 text-slate-500'
                }`}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        {topicTitle && (
          <div className="hidden md:flex items-center space-x-2 text-xs text-slate-400 font-mono">
            <span className="text-slate-500">Active Topic:</span>
            <span className="text-slate-200 font-semibold">{topicTitle}</span>
          </div>
        )}

        {/* spec 007 FR-020: the one place to survey the whole curriculum and
            open any topic's lesson in a single click. */}
        {onShowOverview && (
          <button
            onClick={onShowOverview}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              showOverviewActive
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
            }`}
            title="See every topic and what each one builds on"
          >
            <Network className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Curriculum Map</span>
          </button>
        )}
      </div>
    </div>
  );
};
