import { useRef, useState, useEffect, useCallback } from 'react';
import Editor, { loader, OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useLSP } from './useLSP';
import { STATIC_CPP_COMPLETIONS } from './cppCompletions';

// Configure Monaco to bundle locally for 100% offline usage
loader.config({ monaco });

interface CodeEditorProps {
  exerciseId: string | null;
  value: string;
  onChange: (value: string | undefined) => void;
  onSave?: () => void;
  breakpoints?: number[];
  onToggleBreakpoint?: (lineNumber: number) => void;
  activeDebugLine?: number | null;
}

export function CodeEditor({
  exerciseId,
  value,
  onChange,
  onSave,
  breakpoints = [],
  onToggleBreakpoint,
  activeDebugLine = null,
}: CodeEditorProps) {
  const [editorInstance, setEditorInstance] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [monacoInstance, setMonacoInstance] = useState<typeof monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const onToggleBreakpointRef = useRef(onToggleBreakpoint);
  onToggleBreakpointRef.current = onToggleBreakpoint;

  // Language Server Protocol hook
  const {
    lspStatus,
    notifyChange,
    getCompletions,
    getHover,
    getSignatureHelp,
  } = useLSP({
    exerciseId,
    code: value,
    monaco: monacoInstance,
    editor: editorInstance,
  });

  const handleEditorMount: OnMount = useCallback(
    (editor, m) => {
      setEditorInstance(editor);
      setMonacoInstance(m);

      // Define custom dark theme matching DSA Learn design system
      m.editor.defineTheme('dsa-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '64748B', fontStyle: 'italic' },
          { token: 'keyword', foreground: '38BDF8', fontStyle: 'bold' },
          { token: 'type', foreground: '34D399' },
          { token: 'string', foreground: 'FBBF24' },
          { token: 'number', foreground: 'F472B6' },
        ],
        colors: {
          'editor.background': '#0D1525',
          'editor.foreground': '#F8FAFC',
          'editor.lineHighlightBackground': '#1E293B55',
          'editorLineNumber.foreground': '#475569',
          'editorLineNumber.activeForeground': '#38BDF8',
          'editorGutter.background': '#0D1525',
        },
      });
      m.editor.setTheme('dsa-dark');

      // Gutter click listener for breakpoints
      editor.onMouseDown((e) => {
        if (
          e.target.type === m.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
          e.target.type === m.editor.MouseTargetType.GUTTER_LINE_NUMBERS
        ) {
          const line = e.target.position?.lineNumber;
          if (line && onToggleBreakpointRef.current) {
            onToggleBreakpointRef.current(line);
          }
        }
      });

      // Bind Ctrl+S / Cmd+S for manual save
      editor.addCommand(m.KeyMod.CtrlCmd | m.KeyCode.KeyS, () => {
        if (onSave) onSave();
      });
    },
    [onSave]
  );

  // Register Monaco Language Providers (Completion, Hover, Signature Help) with clean disposal
  useEffect(() => {
    if (!monacoInstance || !editorInstance) return;

    const disposables: monaco.IDisposable[] = [];

    // 1. Completion Provider (LSP with Static Offline Fallback)
    disposables.push(
      monacoInstance.languages.registerCompletionItemProvider('cpp', {
        triggerCharacters: ['.', '>', ':', '/'],
        provideCompletionItems: async (model, position) => {
          // If LSP is active, query clangd
          if (lspStatus === 'active') {
            try {
              const lspResult = await getCompletions(model, position);
              if (lspResult && lspResult.suggestions.length > 0) {
                return lspResult;
              }
            } catch (err) {
              console.error('Error fetching completions from LSP:', err);
            }
          }

          // Fallback: Return curated static C++20 keywords & STL snippets
          const word = model.getWordUntilPosition(position);
          const range: monaco.IRange = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          const fallbackSuggestions: monaco.languages.CompletionItem[] = STATIC_CPP_COMPLETIONS.map((item) => ({
            label: item.label,
            kind:
              item.kind === 'keyword'
                ? monacoInstance.languages.CompletionItemKind.Keyword
                : item.kind === 'function'
                ? monacoInstance.languages.CompletionItemKind.Function
                : item.kind === 'snippet'
                ? monacoInstance.languages.CompletionItemKind.Snippet
                : monacoInstance.languages.CompletionItemKind.Class,
            detail: item.detail,
            documentation: { value: item.documentation },
            insertText: item.insertText,
            insertTextRules: item.isSnippet
              ? monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet
              : undefined,
            range,
          }));

          return {
            suggestions: fallbackSuggestions,
          };
        },
      })
    );

    // 2. Hover Provider (LSP Symbol Inspection)
    disposables.push(
      monacoInstance.languages.registerHoverProvider('cpp', {
        provideHover: async (model, position) => {
          if (lspStatus !== 'active') return null;
          try {
            return await getHover(model, position);
          } catch (err) {
            console.error('Error fetching hover from LSP:', err);
            return null;
          }
        },
      })
    );

    // 3. Signature Help Provider (Parameter Hints)
    disposables.push(
      monacoInstance.languages.registerSignatureHelpProvider('cpp', {
        signatureHelpTriggerCharacters: ['(', ','],
        signatureHelpRetriggerCharacters: [','],
        provideSignatureHelp: async (model, position) => {
          if (lspStatus !== 'active') return null;
          try {
            return await getSignatureHelp(model, position);
          } catch (err) {
            console.error('Error fetching signature help from LSP:', err);
            return null;
          }
        },
      })
    );

    return () => {
      disposables.forEach((d) => d.dispose());
    };
  }, [monacoInstance, editorInstance, getCompletions, getHover, getSignatureHelp, lspStatus]);

  // Update decorations for breakpoints & active debug line
  useEffect(() => {
    if (!editorInstance || !monacoInstance) return;

    const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];

    // Breakpoint markers in glyph margin
    for (const line of breakpoints) {
      newDecorations.push({
        range: new monacoInstance.Range(line, 1, line, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: 'debug-breakpoint-glyph',
          glyphMarginHoverMessage: { value: `Breakpoint at line ${line}` },
        },
      });
    }

    // Active debug stepping line highlight
    if (activeDebugLine) {
      newDecorations.push({
        range: new monacoInstance.Range(activeDebugLine, 1, activeDebugLine, 1),
        options: {
          isWholeLine: true,
          className: 'debug-active-line-highlight',
          glyphMarginClassName: 'debug-active-line-glyph',
        },
      });
    }

    decorationsRef.current = editorInstance.deltaDecorations(decorationsRef.current, newDecorations);
  }, [editorInstance, monacoInstance, breakpoints, activeDebugLine]);

  const handleChange = (val: string | undefined) => {
    onChange(val);
    notifyChange(val ?? '');
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#0D1525]">
      {/* Editor top status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800/80 bg-[#101A2D] text-xs text-slate-400 select-none">
        <div className="flex items-center gap-2">
          <span className="font-mono text-slate-300">solution.cpp</span>
          <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 text-[10px] font-semibold">C++20</span>

          {/* Language Intelligence Status Badge */}
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900/60 border border-slate-800 text-[10px] font-medium"
            title={
              lspStatus === 'active'
                ? 'clangd Language Server connected (full C++20 autocompletion, hover documentation, parameter hints)'
                : lspStatus === 'connecting'
                ? 'Connecting to clangd Language Server...'
                : 'Running in offline fallback mode (static C++20 keywords and core STL snippets)'
            }
          >
            {lspStatus === 'active' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-emerald-400">LSP: C++20 Ready</span>
              </>
            )}
            {lspStatus === 'connecting' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                <span className="text-sky-400">LSP: Connecting...</span>
              </>
            )}
            {lspStatus === 'fallback' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-amber-400">LSP: Offline (Static STL)</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span>Click gutter to set breakpoints</span>
          <span>Ctrl+S to save</span>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 overflow-hidden relative">
        <Editor
          height="100%"
          language="cpp"
          value={value}
          onChange={handleChange}
          onMount={handleEditorMount}
          options={{
            fontSize: 13,
            lineHeight: 20,
            fontFamily: 'JetBrains Mono, Fira Code, Menlo, monospace',
            glyphMargin: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            renderWhitespace: 'selection',
            bracketPairColorization: { enabled: true },
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            padding: { top: 8, bottom: 8 },
            quickSuggestions: {
              other: true,
              comments: false,
              strings: false,
            },
            parameterHints: {
              enabled: true,
              cycle: true,
            },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            tabCompletion: 'on',
            hover: {
              enabled: 'on',
              delay: 200,
            },
          }}
        />
      </div>
    </div>
  );
}
