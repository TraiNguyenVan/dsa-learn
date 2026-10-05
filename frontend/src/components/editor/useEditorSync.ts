import { useState, useEffect, useRef, useCallback } from 'react';
import { saveExerciseCode } from '@/lib/api';

export type SaveStatus = 'saved' | 'saving' | 'dirty' | 'error';

interface UseEditorSyncOptions {
  exerciseId: string | null;
  initialCode: string;
  debounceMs?: number;
  onSaved?: (code: string) => void;
}

export function useEditorSync({
  exerciseId,
  initialCode,
  debounceMs = 500,
  onSaved,
}: UseEditorSyncOptions) {
  const [code, setCode] = useState<string>(initialCode);
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const codeRef = useRef<string>(code);
  codeRef.current = code;

  const currentExerciseRef = useRef<string | null>(exerciseId);
  currentExerciseRef.current = exerciseId;

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync initialCode when exerciseId changes
  useEffect(() => {
    setCode(initialCode);
    setStatus('saved');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, [exerciseId, initialCode]);

  // Save current code to disk
  const saveNow = useCallback(async () => {
    const activeId = currentExerciseRef.current;
    if (!activeId) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    setStatus('saving');
    try {
      await saveExerciseCode(activeId, codeRef.current);
      setStatus('saved');
      setLastSavedAt(new Date());
      if (onSaved) onSaved(codeRef.current);
    } catch (err) {
      console.error('Failed to save code:', err);
      setStatus('error');
    }
  }, [onSaved]);

  // Handle user edits
  const handleCodeChange = useCallback(
    (newCode: string | undefined) => {
      const updated = newCode ?? '';
      setCode(updated);
      setStatus('dirty');

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        saveNow();
      }, debounceMs);
    },
    [debounceMs, saveNow]
  );

  return {
    code,
    status,
    lastSavedAt,
    handleCodeChange,
    saveNow,
  };
}
