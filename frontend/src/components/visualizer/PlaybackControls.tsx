import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Gauge,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PlaybackControlsProps {
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onStepNext: () => void;
  onStepPrev: () => void;
  onReset: () => void;
  onJumpToStep: (step: number) => void;
  onSpeedChange: (speed: number) => void;
  onOpenHelp?: () => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  currentStep,
  totalSteps,
  isPlaying,
  speed,
  onPlay,
  onPause,
  onStepNext,
  onStepPrev,
  onReset,
  onJumpToStep,
  onSpeedChange,
  onOpenHelp,
}) => {
  const [localHelpOpen, setLocalHelpOpen] = React.useState(false);
  const speeds = [0.5, 1.0, 1.5, 2.0, 3.0];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 px-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm select-none">
      {/* Left: Buttons */}
      <div className="flex items-center space-x-1 sm:space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          title="Reset to start (R)"
          className="h-8 w-8 p-0 border-slate-700 text-slate-300 hover:text-white"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onStepPrev}
          disabled={currentStep <= 0}
          title="Step Backward (Left Arrow)"
          className="h-8 w-8 p-0 border-slate-700 text-slate-300 hover:text-white disabled:opacity-40"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </Button>

        <Button
          size="sm"
          onClick={isPlaying ? onPause : onPlay}
          title="Play / Pause (Space)"
          className={`h-8 px-3 text-xs font-semibold flex items-center space-x-1.5 ${
            isPlaying
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onStepNext}
          disabled={currentStep >= totalSteps - 1}
          title="Step Forward (Right Arrow)"
          className="h-8 w-8 p-0 border-slate-700 text-slate-300 hover:text-white disabled:opacity-40"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Center: Scrubber & Step Badge */}
      <div className="flex-1 w-full md:w-auto max-w-md flex items-center space-x-3">
        <span className="text-[11px] font-mono text-slate-400 shrink-0">
          Step <span className="text-white font-bold">{totalSteps > 0 ? currentStep + 1 : 0}</span> / {totalSteps}
        </span>
        <input
          type="range"
          min={0}
          max={Math.max(0, totalSteps - 1)}
          value={currentStep}
          onChange={(e) => onJumpToStep(parseInt(e.target.value, 10))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
        />
      </div>

      {/* Right: Speed & Shortcuts */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1 bg-slate-950 p-0.5 rounded border border-slate-800 text-[11px] font-mono">
          <Gauge className="w-3 h-3 text-slate-500 ml-1" />
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                speed === s
                  ? 'bg-emerald-600/30 text-emerald-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenHelp || (() => setLocalHelpOpen(true))}
          title="Keyboard shortcuts help"
          className="h-8 w-8 p-0 text-slate-500 hover:text-slate-300 cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" />
        </Button>

        {localHelpOpen && !onOpenHelp && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-2">
                  <HelpCircle className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-semibold text-white">Visualizer Shortcuts</h4>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocalHelpOpen(false)}
                  className="h-6 w-6 p-0 text-slate-500 hover:text-white"
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between py-1 border-b border-slate-800/50">
                  <span className="text-slate-400">Play / Pause</span>
                  <span className="px-2 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-200">
                    Space
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/50">
                  <span className="text-slate-400">Step Forward</span>
                  <span className="px-2 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-200">
                    → (Right Arrow)
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/50">
                  <span className="text-slate-400">Step Backward</span>
                  <span className="px-2 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-200">
                    ← (Left Arrow)
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400">Reset</span>
                  <span className="px-2 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-200">
                    R
                  </span>
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => setLocalHelpOpen(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
