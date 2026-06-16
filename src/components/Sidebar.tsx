import { Star, Mountain, Inbox, BarChart2, ChevronRight } from 'lucide-react'

export type SidebarStep = 'vision' | 'milestone' | 'inbox' | 'dashboard'

interface SidebarProps {
  activeStep: SidebarStep
  onStepChange: (step: SidebarStep) => void
  counts: { visions: number; milestones: number; inbox: number }
}

const steps: { id: SidebarStep; Icon: React.FC<{ className?: string }>; label: string; sub: string }[] = [
  { id: 'vision',    Icon: Star,     label: '长期愿景',   sub: '北极星目标' },
  { id: 'milestone', Icon: Mountain, label: '中期里程碑', sub: '季度 / 月度锚点' },
  { id: 'inbox',     Icon: Inbox,    label: '今日收集箱', sub: '原始待办清单' },
]

import React from 'react'

export function Sidebar({ activeStep, onStepChange, counts }: SidebarProps) {
  return (
    <aside className="w-60 shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col py-6 px-3 gap-1">
      <div className="px-3 mb-4">
        <p className="text-xs font-mono font-semibold text-zinc-600 uppercase tracking-widest">对齐工作流</p>
      </div>

      {steps.map((step, idx) => {
        const count = [counts.visions, counts.milestones, counts.inbox][idx]
        const isActive = activeStep === step.id
        return (
          <button
            key={step.id}
            onClick={() => onStepChange(step.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 text-left w-full
              ${isActive ? 'bg-zinc-800 border border-zinc-700' : 'hover:bg-zinc-800/50 border border-transparent'}`}
          >
            <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0
              ${isActive ? 'bg-zinc-700' : 'bg-zinc-800/50'}`}>
              <step.Icon className={`w-3.5 h-3.5 ${isActive ? 'text-zinc-200' : 'text-zinc-500'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm font-medium truncate ${isActive ? 'text-zinc-100' : 'text-zinc-400'}`}>
                  {step.label}
                </span>
                {count > 0 && <span className="text-xs font-mono text-zinc-600 shrink-0">{count}</span>}
              </div>
              <p className="text-xs text-zinc-600 truncate mt-0.5">{step.sub}</p>
            </div>
          </button>
        )
      })}

      <div className="my-3 mx-3 border-t border-zinc-800" />

      <button
        onClick={() => onStepChange('dashboard')}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all text-left w-full
          ${activeStep === 'dashboard' ? 'bg-zinc-800 border border-zinc-700' : 'hover:bg-zinc-800/50 border border-transparent'}`}
      >
        <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0
          ${activeStep === 'dashboard' ? 'bg-zinc-700' : 'bg-zinc-800/50'}`}>
          <BarChart2 className={`w-3.5 h-3.5 ${activeStep === 'dashboard' ? 'text-zinc-200' : 'text-zinc-500'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium ${activeStep === 'dashboard' ? 'text-zinc-100' : 'text-zinc-400'}`}>
            历史看板
          </span>
          <p className="text-xs text-zinc-600 mt-0.5">数据洞察 & AI 诊断</p>
        </div>
      </button>

      <div className="flex-1" />

      {/* Step indicators */}
      <div className="px-3 space-y-1">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${activeStep === step.id ? 'bg-zinc-300' : 'bg-zinc-700'}`} />
            <span className="text-xs text-zinc-600 font-mono">Step {idx + 1}</span>
            {activeStep === step.id && <ChevronRight className="w-3 h-3 text-zinc-600 ml-auto" />}
          </div>
        ))}
      </div>
    </aside>
  )
}
