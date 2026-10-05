import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

interface ResizableLayoutProps {
  sidebar: React.ReactNode;
  problemView: React.ReactNode;
  editorView?: React.ReactNode;
  bottomView: React.ReactNode;
}

export function ResizableLayout({
  sidebar,
  problemView,
  editorView,
  bottomView,
}: ResizableLayoutProps) {
  return (
    <div className="flex-1 h-full w-full overflow-hidden bg-[#0F172A]">
      <PanelGroup direction="horizontal" autoSaveId="dsa-learn-h-main">
        {/* Left: Curriculum Sidebar */}
        <Panel defaultSize={20} minSize={15} maxSize={30} className="bg-[#121A2B] border-r border-slate-800">
          {sidebar}
        </Panel>

        <PanelResizeHandle className="w-1 bg-slate-800/80 hover:bg-emerald-500/80 transition-colors cursor-col-resize select-none" />

        {/* Center & Right: Problem/Editor on Top, Bottom Drawer below */}
        <Panel defaultSize={80} minSize={60}>
          <PanelGroup direction="vertical" autoSaveId="dsa-learn-v-main">
            {/* Top Workspace: Problem View + Code Editor */}
            <Panel defaultSize={62} minSize={30} className="overflow-hidden">
              {editorView ? (
                <PanelGroup direction="horizontal" autoSaveId="dsa-learn-h-editor">
                  {/* Problem Description */}
                  <Panel defaultSize={42} minSize={25} className="bg-[#0F172A] border-r border-slate-800/60 overflow-hidden">
                    {problemView}
                  </Panel>

                  <PanelResizeHandle className="w-1 bg-slate-800/80 hover:bg-emerald-500/80 transition-colors cursor-col-resize select-none" />

                  {/* Monaco Code Editor */}
                  <Panel defaultSize={58} minSize={30} className="bg-[#0D1525] overflow-hidden">
                    {editorView}
                  </Panel>
                </PanelGroup>
              ) : (
                <div className="h-full w-full overflow-hidden bg-[#0F172A]">
                  {problemView}
                </div>
              )}
            </Panel>

            <PanelResizeHandle className="h-1 bg-slate-800/80 hover:bg-emerald-500/80 transition-colors cursor-row-resize select-none" />

            {/* Bottom: Tabs for Test Runner, Terminal, Debugger, Compiler */}
            <Panel defaultSize={38} minSize={20} className="bg-[#0B1220] border-t border-slate-800/60 overflow-hidden">
              {bottomView}
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
}
