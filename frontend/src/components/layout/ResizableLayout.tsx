import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

interface ResizableLayoutProps {
  sidebar: React.ReactNode;
  problemView: React.ReactNode;
  runnerView: React.ReactNode;
}

export function ResizableLayout({ sidebar, problemView, runnerView }: ResizableLayoutProps) {
  return (
    <div className="h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-[#0F172A]">
      <PanelGroup direction="horizontal" autoSaveId="dsa-learn-horizontal">
        {/* Left: Curriculum Sidebar */}
        <Panel defaultSize={22} minSize={15} maxSize={35} className="bg-[#121A2B] border-r border-slate-800">
          {sidebar}
        </Panel>

        <PanelResizeHandle className="w-1 bg-slate-800/80 hover:bg-emerald-500/80 transition-colors cursor-col-resize select-none" />

        {/* Right / Center: Problem and Test Runner */}
        <Panel defaultSize={78} minSize={50}>
          <PanelGroup direction="vertical" autoSaveId="dsa-learn-vertical">
            {/* Top: Problem Description View */}
            <Panel defaultSize={55} minSize={30} className="bg-[#0F172A] overflow-hidden">
              {problemView}
            </Panel>

            <PanelResizeHandle className="h-1 bg-slate-800/80 hover:bg-emerald-500/80 transition-colors cursor-row-resize select-none" />

            {/* Bottom: Live Test Runner Drawer */}
            <Panel defaultSize={45} minSize={25} className="bg-[#0B1220] border-t border-slate-800/60 overflow-hidden">
              {runnerView}
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
}
