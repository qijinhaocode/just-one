export type SidebarStep = 'vision' | 'milestone' | 'inbox' | 'dashboard';

interface SidebarProps {
  activeStep: SidebarStep;
  onStepChange: (step: SidebarStep) => void;
  counts: {
    visions: number;
    milestones: number;
    inbox: number;
  };
}

const steps: { id: SidebarStep; icon: string; label: string; sub: string }[] = [
  { id: 'vision', icon: '🌠', label: '长期愿景', sub: '北极星目标' },
  { id: 'milestone', icon: '🏔️', label: '中期里程碑', sub: '季度 / 月度锚点' },
  { id: 'inbox', icon: '📥', label: '今日收集箱', sub: '原始待办清单' },
];

export function Sidebar({ activeStep, onStepChange, counts }: SidebarProps) {
  return (
    <aside className="w-60 shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col py-6 px-3 gap-1">
      <div className="px-3 mb-4">
        <p className="text-xs font-mono font-semibold text-zinc-500 uppercase tracking-widest">对齐工作流</p>
      </div>

      {steps.map((step, idx) => {
        const count = idx === 0 ? counts.visions : idx === 1 ? counts.milestones : counts.inbox;
        const isActive = activeStep === step.id;
        return (
          <button
            key={step.id}
            onClick={() => onStepChange(step.id)}
            className={`sidebar-step text-left w-full ${isActive ? 'active' : 'inactive'}`}
          >
            <div className={`w-7 h-7 rounded-md flex items-center justify-center text-sm shrink-0
              ${isActive ? 'bg-zinc-700' : 'bg-zinc-800/50'}`}>
              <span>{step.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm font-medium truncate ${isActive ? 'text-zinc-100' : 'text-zinc-400'}`}>
                  {step.label}
                </span>
                {count > 0 && (
                  <span className="text-xs font-mono text-zinc-600 shrink-0">{count}</span>
                )}
              </div>
              <p className="text-xs text-zinc-600 truncate mt-0.5">{step.sub}</p>
            </div>
          </button>
        );
      })}

      <div className="mt-4 mx-3 border-t border-zinc-800" />

      <button
        onClick={() => onStepChange('dashboard')}
        className={`sidebar-step text-left w-full mt-2 ${activeStep === 'dashboard' ? 'active' : 'inactive'}`}
      >
        <div className={`w-7 h-7 rounded-md flex items-center justify-center text-sm shrink-0
          ${activeStep === 'dashboard' ? 'bg-zinc-700' : 'bg-zinc-800/50'}`}>
          <span>📊</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium ${activeStep === 'dashboard' ? 'text-zinc-100' : 'text-zinc-400'}`}>
            历史看板
          </span>
          <p className="text-xs text-zinc-600 mt-0.5">数据洞察 & AI 诊断</p>
        </div>
      </button>

      <div className="flex-1" />

      {/* Step indicator */}
      <div className="px-3 space-y-1">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${activeStep === step.id ? 'bg-zinc-300' : 'bg-zinc-700'}`} />
            <span className="text-xs text-zinc-600 font-mono">Step {idx + 1}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
