import { useState, useEffect, useCallback, useRef } from 'react';

export interface UsePlaybackProps {
  totalSteps: number;
  initialSpeed?: number;
  onStepChange?: (step: number) => void;
}

export function usePlayback({ totalSteps, initialSpeed = 1.0, onStepChange }: UsePlaybackProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(initialSpeed);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const jumpToStep = useCallback(
    (step: number) => {
      const clamped = Math.max(0, Math.min(totalSteps - 1, step));
      setCurrentStep(clamped);
      onStepChange?.(clamped);
    },
    [totalSteps, onStepChange]
  );

  const stepNext = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev >= totalSteps - 1) {
        setIsPlaying(false);
        return prev;
      }
      const next = prev + 1;
      onStepChange?.(next);
      return next;
    });
  }, [totalSteps, onStepChange]);

  const stepPrev = useCallback(() => {
    setCurrentStep((prev) => {
      const next = Math.max(0, prev - 1);
      onStepChange?.(next);
      return next;
    });
  }, [onStepChange]);

  const reset = useCallback(() => {
    clearTimer();
    setIsPlaying(false);
    setCurrentStep(0);
    onStepChange?.(0);
  }, [clearTimer, onStepChange]);

  const play = useCallback(() => {
    if (currentStep >= totalSteps - 1) {
      setCurrentStep(0);
    }
    setIsPlaying(true);
  }, [currentStep, totalSteps]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // Interval timer for auto-play
  useEffect(() => {
    if (!isPlaying) {
      clearTimer();
      return;
    }

    const intervalMs = Math.round(1000 / speedMultiplier);
    timerRef.current = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= totalSteps - 1) {
          setIsPlaying(false);
          return prev;
        }
        const next = prev + 1;
        onStepChange?.(next);
        return next;
      });
    }, intervalMs);

    return () => clearTimer();
  }, [isPlaying, speedMultiplier, totalSteps, clearTimer, onStepChange]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        stepNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        stepPrev();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        reset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, stepNext, stepPrev, reset]);

  return {
    currentStep,
    totalSteps,
    isPlaying,
    speedMultiplier,
    play,
    pause,
    togglePlay,
    stepNext,
    stepPrev,
    jumpToStep,
    reset,
    setSpeedMultiplier,
  };
}
