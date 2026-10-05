import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useTerminal, type DebugOutputStream } from './useTerminal';
import { RotateCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TerminalDrawerProps {
  active: boolean;
  /** Registers the debug-output writer so the debugger can reach the terminal. */
  onDebugWriterReady?: (writer: ((stream: DebugOutputStream, text: string) => void) | null) => void;
}

/** Theme colours are the project's design tokens (SC-003, FR-021). */
const DEBUG_STREAM_PREFIX: Record<DebugOutputStream, string> = {
  console: '\x1b[90m[debugger]\x1b[0m ',
  stderr: '\x1b[31m[stderr]\x1b[0m ',
  target: '\x1b[32m[program]\x1b[0m ',
};

export function TerminalDrawer({ active, onDebugWriterReady }: TerminalDrawerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const onDebugWriterReadyRef = useRef(onDebugWriterReady);

  useEffect(() => {
    onDebugWriterReadyRef.current = onDebugWriterReady;
  }, [onDebugWriterReady]);

  const { isConnected, connect, sendInput, sendResize, killSession, writeDebugOutput } = useTerminal({
    active,
    onData: (data) => {
      if (termRef.current) {
        termRef.current.write(data);
      }
    },
    onExit: (code) => {
      if (termRef.current) {
        termRef.current.writeln(`\r\n\x1b[33m[Process completed with exit code ${code}]\x1b[0m\r\n`);
      }
    },
    onDebug: (stream, text) => {
      // Direct buffer write. Never routed through sendInput: that would type the
      // text into the learner's live shell (research.md Decision 8).
      const term = termRef.current;
      if (!term) return;
      const prefixed = text
        .split('\n')
        .filter((line) => line.length > 0)
        .map((line) => DEBUG_STREAM_PREFIX[stream] + line)
        .join('\r\n');
      if (prefixed) term.writeln(prefixed);
    },
  });

  // Hand the writer up once the terminal exists, and release it on unmount.
  useEffect(() => {
    onDebugWriterReadyRef.current?.(writeDebugOutput);
    return () => onDebugWriterReadyRef.current?.(null);
  }, [writeDebugOutput, active]);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'JetBrains Mono, Menlo, monospace',
      // xterm reads literal colour values and cannot resolve CSS custom
      // properties, so these are the design tokens spelled out. They must stay
      // in step with the `:root` values in globals.css; `tests/test_debug_theme.py`
      // asserts they match.
      theme: {
        background: '#0F172A',   // --color-background
        foreground: '#F8FAFC',   // --color-foreground
        cursor: '#22C55E',       // --color-accent
        selectionBackground: '#334155', // --color-border
        black: '#1B2336',        // --color-card
        red: '#EF4444',          // --color-destructive
        green: '#22C55E',        // --color-accent
        yellow: '#F8FAFC',       // --color-foreground
        blue: '#334155',         // --color-border
        magenta: '#22C55E',      // --color-accent
        cyan: '#94A3B8',         // --color-muted-foreground
        white: '#F8FAFC',        // --color-foreground
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    term.onData((data) => {
      sendInput(data);
    });

    // Notify backend of initial geometry
    sendResize(term.cols, term.rows);

    const resizeObserver = new ResizeObserver(() => {
      if (active && fitAddonRef.current && termRef.current) {
        try {
          fitAddonRef.current.fit();
          sendResize(termRef.current.cols, termRef.current.rows);
        } catch (e) {
          // ignore transient resize errors
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, [active, sendInput, sendResize]);

  // Re-fit when becoming active
  useEffect(() => {
    if (active && fitAddonRef.current && termRef.current) {
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
          if (termRef.current) {
            sendResize(termRef.current.cols, termRef.current.rows);
          }
        } catch (e) {
          // ignore
        }
      }, 50);
    }
  }, [active, sendResize]);

  return (
    <div className="debug-surface h-full flex flex-col">
      {/* Terminal Toolbar */}
      <div className="debug-pane-header px-3 py-1.5 border-b flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-foreground">Host Terminal Session</span>
          <span
            className={`w-2 h-2 rounded-full ${isConnected ? 'bg-accent' : 'bg-destructive'}`}
            title={isConnected ? 'Connected' : 'Disconnected'}
          />
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={connect}
            className="debug-focusable h-6 px-2 text-[11px]"
            title="Reconnect terminal"
          >
            <RotateCw className="w-3 h-3 mr-1" aria-hidden="true" /> Reconnect
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={killSession}
            className="debug-focusable h-6 px-2 text-[11px] text-destructive hover:text-destructive"
            title="Kill running shell"
          >
            <XCircle className="w-3 h-3 mr-1" aria-hidden="true" /> Kill
          </Button>
        </div>
      </div>

      {/* Xterm DOM mounting container */}
      <div ref={containerRef} className="flex-1 p-2 overflow-hidden" />
    </div>
  );
}
