import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useTerminal } from './useTerminal';
import { RotateCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TerminalDrawerProps {
  active: boolean;
}

export function TerminalDrawer({ active }: TerminalDrawerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const { isConnected, connect, sendInput, sendResize, killSession } = useTerminal({
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
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'JetBrains Mono, Menlo, monospace',
      theme: {
        background: '#0B1220',
        foreground: '#F8FAFC',
        cursor: '#38BDF8',
        selectionBackground: '#334155',
        black: '#0F172A',
        red: '#EF4444',
        green: '#22C55E',
        yellow: '#F59E0B',
        blue: '#3B82F6',
        magenta: '#EC4899',
        cyan: '#06B6D4',
        white: '#F8FAFC',
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
    <div className="h-full flex flex-col bg-[#0B1220]">
      {/* Terminal Toolbar */}
      <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-slate-300">Host Terminal Session</span>
          <span
            className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-400'}`}
            title={isConnected ? 'Connected' : 'Disconnected'}
          />
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={connect}
            className="h-6 px-2 text-[11px] text-slate-400 hover:text-white"
            title="Reconnect terminal"
          >
            <RotateCw className="w-3 h-3 mr-1" /> Reconnect
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={killSession}
            className="h-6 px-2 text-[11px] text-rose-400 hover:text-rose-300"
            title="Kill running shell"
          >
            <XCircle className="w-3 h-3 mr-1" /> Kill
          </Button>
        </div>
      </div>

      {/* Xterm DOM mounting container */}
      <div ref={containerRef} className="flex-1 p-2 overflow-hidden" />
    </div>
  );
}
