import { useState, useRef, useEffect } from 'react';

// ─── Trigger dimensions ───────────────────────────────────────────────────────

const DIMENSIONS = [
  {
    id: 'work',
    icon: '💼',
    title: '工作 / 项目',
    color: 'blue',
    triggers: [
      '有没有承诺过别人但还没做的事？',
      '有没有等别人回复、但你一直没有跟进的事？',
      '有没有「我一直想做但还没开始」的项目或任务？',
    ],
    placeholder: '例如：给 A 发方案、跟进 B 项目进度...',
  },
  {
    id: 'communication',
    icon: '💬',
    title: '沟通 / 回复',
    color: 'violet',
    triggers: [
      '有没有该回复的消息、邮件、电话？',
      '有没有该主动联系、但一直拖着没联系的人？',
      '有没有需要开但还没开的会议或对话？',
    ],
    placeholder: '例如：回张总微信、约客户见面...',
  },
  {
    id: 'finance',
    icon: '💰',
    title: '财务 / 事务',
    color: 'amber',
    triggers: [
      '有没有该付的账单、该报的费用、该追的款？',
      '有没有需要办理但拖着没办的手续、证件、合同？',
      '有没有要订的机票酒店、要买的票？',
    ],
    placeholder: '例如：报上个月差旅费、续签合同...',
  },
  {
    id: 'growth',
    icon: '📚',
    title: '学习 / 成长',
    color: 'emerald',
    triggers: [
      '有没有买了但没读的书、没看的课程？',
      '有没有想学但一直没开始的技能？',
      '有没有想研究但从没动手的方向？',
    ],
    placeholder: '例如：看完《深度工作》、学 Figma 原型...',
  },
  {
    id: 'life',
    icon: '🏠',
    title: '生活 / 健康',
    color: 'rose',
    triggers: [
      '家里有没有坏掉要修、要换的东西？',
      '有没有拖了很久没去的检查、没预约的医生？',
      '有没有要买的东西一直在脑子里转但没买？',
    ],
    placeholder: '例如：换客厅灯泡、预约牙科、买跑鞋...',
  },
  {
    id: 'brain',
    icon: '🧠',
    title: '大脑碎片',
    color: 'zinc',
    triggers: [
      '有没有反复在脑子里冒出来、但从没记下来的念头？',
      '有没有「我应该做但一直没做」说不清楚是什么的感觉？',
      '如果你能在不受打扰的一天完成任何事，你会做什么？',
    ],
    placeholder: '随便写，不用完整，脑子里有什么就写什么...',
  },
] as const;

type DimensionId = typeof DIMENSIONS[number]['id'];

interface CapturedItem {
  text: string;
  dimensionId: DimensionId;
}

interface GuidedCaptureProps {
  onComplete: (items: CapturedItem[]) => Promise<void>;
  onClose: () => void;
}

const COLOR_MAP = {
  blue:    { bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   text: 'text-blue-400',   dot: 'bg-blue-400' },
  violet:  { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', dot: 'bg-violet-400' },
  amber:   { bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  text: 'text-amber-400',  dot: 'bg-amber-400' },
  emerald: { bg: 'bg-emerald-500/10',border: 'border-emerald-500/20',text: 'text-emerald-400',dot: 'bg-emerald-400' },
  rose:    { bg: 'bg-rose-500/10',   border: 'border-rose-500/20',   text: 'text-rose-400',   dot: 'bg-rose-400' },
  zinc:    { bg: 'bg-zinc-800/60',   border: 'border-zinc-700',      text: 'text-zinc-400',   dot: 'bg-zinc-400' },
};

export function GuidedCapture({ onComplete, onClose }: GuidedCaptureProps) {
  const [step, setStep] = useState(0); // 0..5 = dimensions, 6 = summary
  const [itemsByDimension, setItemsByDimension] = useState<Record<DimensionId, string[]>>({
    work: [], communication: [], finance: [], growth: [], life: [], brain: [],
  });
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLastDimension = step === DIMENSIONS.length - 1;
  const isSummary = step === DIMENSIONS.length;
  const currentDim = isSummary ? null : DIMENSIONS[step];
  const colors = currentDim ? COLOR_MAP[currentDim.color] : COLOR_MAP.zinc;

  const totalCaptured = Object.values(itemsByDimension).reduce((s, a) => s + a.length, 0);

  // Focus input whenever step changes
  useEffect(() => {
    if (!isSummary) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [step, isSummary]);

  function addItem() {
    const text = inputValue.trim();
    if (!text || !currentDim) return;
    setItemsByDimension(prev => ({
      ...prev,
      [currentDim.id]: [...prev[currentDim.id], text],
    }));
    setInputValue('');
  }

  function removeItem(dimId: DimensionId, idx: number) {
    setItemsByDimension(prev => ({
      ...prev,
      [dimId]: prev[dimId].filter((_, i) => i !== idx),
    }));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  }

  function nextStep() {
    if (inputValue.trim()) addItem();
    setInputValue('');
    setStep(s => s + 1);
  }

  function prevStep() {
    setInputValue('');
    setStep(s => Math.max(0, s - 1));
  }

  async function handleComplete() {
    setSaving(true);
    const items: CapturedItem[] = DIMENSIONS.flatMap(dim =>
      itemsByDimension[dim.id].map(text => ({ text, dimensionId: dim.id }))
    );
    await onComplete(items);
    setSaving(false);
  }

  // ── Progress bar ─────────────────────────────────────────────────────────────
  const progress = isSummary ? 100 : Math.round((step / DIMENSIONS.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up"
        style={{ maxHeight: '90vh' }}>

        {/* Progress bar */}
        <div className="h-0.5 bg-zinc-800">
          <div
            className="h-full bg-zinc-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            {!isSummary && (
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl ${colors.bg} border ${colors.border}`}>
                {currentDim!.icon}
              </div>
            )}
            {isSummary && (
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl">
                ✅
              </div>
            )}
            <div>
              <h2 className="text-base font-semibold text-zinc-100">
                {isSummary ? '采集完成' : currentDim!.title}
              </h2>
              <p className="text-xs text-zinc-600 font-mono">
                {isSummary
                  ? `共采集 ${totalCaptured} 条任务`
                  : `维度 ${step + 1} / ${DIMENSIONS.length}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-300 w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-800 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-5 min-h-0">

          {/* ── Dimension step ─────────────────────────────────────────────── */}
          {!isSummary && currentDim && (
            <>
              {/* Trigger questions */}
              <div className={`rounded-xl p-4 space-y-2 ${colors.bg} border ${colors.border}`}>
                {currentDim.triggers.map((q, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${colors.dot}`} />
                    <p className="text-sm text-zinc-300 leading-relaxed">{q}</p>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    className="input-field flex-1"
                    placeholder={currentDim.placeholder}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    onClick={addItem}
                    disabled={!inputValue.trim()}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
                    title="Enter 键快速添加"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-zinc-600">按 Enter 快速添加，可以一条一条输入</p>
              </div>

              {/* Captured items for this dimension */}
              {itemsByDimension[currentDim.id].length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                    已记录 {itemsByDimension[currentDim.id].length} 条
                  </p>
                  <div className="space-y-1">
                    {itemsByDimension[currentDim.id].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 group">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />
                        <span className="text-sm text-zinc-300 flex-1">{item}</span>
                        <button
                          onClick={() => removeItem(currentDim.id, i)}
                          className="text-zinc-700 hover:text-red-400 w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skip hint */}
              {itemsByDimension[currentDim.id].length === 0 && (
                <p className="text-xs text-zinc-700 text-center">这个维度没有想到的话，直接跳过也没关系</p>
              )}
            </>
          )}

          {/* ── Summary step ──────────────────────────────────────────────── */}
          {isSummary && (
            <div className="space-y-4">
              {totalCaptured === 0 ? (
                <div className="text-center py-6 text-zinc-600 text-sm">
                  没有采集到任务，可以关闭窗口。
                </div>
              ) : (
                <>
                  <p className="text-sm text-zinc-400">以下任务将全部加入收集箱，之后可以通过 AI 对齐分析来排优先级。</p>
                  <div className="space-y-3">
                    {DIMENSIONS.map(dim => {
                      const items = itemsByDimension[dim.id];
                      if (items.length === 0) return null;
                      const c = COLOR_MAP[dim.color];
                      return (
                        <div key={dim.id}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-sm">{dim.icon}</span>
                            <span className={`text-xs font-mono font-semibold ${c.text}`}>{dim.title}</span>
                            <span className="text-xs text-zinc-600">({items.length})</span>
                          </div>
                          <div className="space-y-1 pl-5">
                            {items.map((item, i) => (
                              <div key={i} className="flex items-center gap-2 group">
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
                                <span className="text-sm text-zinc-300 flex-1">{item}</span>
                                <button
                                  onClick={() => removeItem(dim.id, i)}
                                  className="text-zinc-700 hover:text-red-400 w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between gap-3">
          <button
            onClick={step === 0 ? onClose : prevStep}
            className="btn-ghost text-sm"
          >
            {step === 0 ? '取消' : '← 上一步'}
          </button>

          <div className="flex items-center gap-1.5">
            {DIMENSIONS.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i < step ? 'w-4 bg-zinc-500' :
                  i === step && !isSummary ? 'w-4 bg-zinc-300' :
                  'w-2 bg-zinc-700'
                }`}
              />
            ))}
          </div>

          {!isSummary ? (
            <button onClick={nextStep} className="btn-primary text-sm">
              {isLastDimension ? '查看汇总 →' : '下一维度 →'}
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={totalCaptured === 0 || saving}
              className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  保存中...
                </>
              ) : (
                `全部加入收集箱 (${totalCaptured})`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
