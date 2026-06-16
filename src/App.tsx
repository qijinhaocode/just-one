import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Navbar } from './components/Navbar';
import { Sidebar, type SidebarStep } from './components/Sidebar';
import { VisionPanel } from './components/VisionPanel';
import { MilestonePanel } from './components/MilestonePanel';
import { InboxPanel } from './components/InboxPanel';
import { FocusBoard } from './components/FocusBoard';
import { EveningReview } from './components/EveningReview';
import { db, type DailyReview } from './db';

// Determine day phase
function getDayPhase(): 'morning' | 'evening' {
  const hour = new Date().getHours();
  return hour >= 18 ? 'evening' : 'morning';
}

export default function App() {
  const [activeStep, setActiveStep] = useState<SidebarStep>('inbox');
  const [dayPhase] = useState<'morning' | 'evening'>(getDayPhase);
  const [notToDoRules, setNotToDoRules] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [analysisSummary, setAnalysisSummary] = useState<string | null>(null);
  const [apiVersion, setApiVersion] = useState(0);

  const visionCount = useLiveQuery(() => db.visions.count(), []) ?? 0;
  const milestoneCount = useLiveQuery(() => db.milestones.where('status').equals('pending').count(), []) ?? 0;
  const inboxCount = useLiveQuery(
    () => db.tasks.where('priorityType').equals('inbox').filter(t => t.status !== 'dropped').count(),
    []
  ) ?? 0;

  async function handleRunAI() {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      setAiError('请先配置 Gemini API Key（右上角 API 配置按钮）');
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      const { runAlignment } = await import('./services/gemini');
      const [visions, milestones, tasks] = await Promise.all([
        db.visions.where('isActive').equals(1).toArray(),
        db.milestones.where('status').equals('pending').toArray(),
        db.tasks.where('priorityType').equals('inbox').filter(t => t.status !== 'dropped').toArray(),
      ]);

      if (tasks.length === 0) {
        setAiError('收集箱为空，无需分析');
        return;
      }

      const result = await runAlignment({ visions, milestones, tasks });
      setAnalysisSummary(result.ai_analysis_summary);
      setNotToDoRules(result.not_to_do_rules);

      // Batch update tasks in a transaction
      const today = new Date().toISOString().split('T')[0];
      await db.transaction('rw', db.tasks, async () => {
        if (result.must_do_task_id) {
          await db.tasks.update(result.must_do_task_id, {
            priorityType: 'must',
            targetDate: today,
          });
        }
        for (const id of result.should_do_task_ids) {
          await db.tasks.update(id, { priorityType: 'should', targetDate: today });
        }
        for (const id of result.could_do_task_ids) {
          await db.tasks.update(id, { priorityType: 'could', targetDate: today });
        }
      });
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AI 分析失败，请重试');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleGenerateInsight(
    reviewData: Omit<DailyReview, 'id' | 'aiInsight' | 'createdAt'>
  ): Promise<string> {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) throw new Error('请先配置 Gemini API Key');

    const { generateDailyInsight } = await import('./services/gemini');
    const today = reviewData.date;
    const [mustTasks, shouldTasks, couldTasks] = await Promise.all([
      db.tasks.where('priorityType').equals('must').filter(t => !t.targetDate || t.targetDate === today).toArray(),
      db.tasks.where('priorityType').equals('should').filter(t => !t.targetDate || t.targetDate === today).toArray(),
      db.tasks.where('priorityType').equals('could').filter(t => !t.targetDate || t.targetDate === today).toArray(),
    ]);

    return generateDailyInsight({
      review: reviewData,
      mustTasks,
      shouldTasks,
      couldTasks,
    });
  }

  const rightPanel = () => {
    if (activeStep === 'vision') return <VisionPanel />;
    if (activeStep === 'milestone') return <MilestonePanel />;
    if (activeStep === 'inbox') return <InboxPanel />;
    if (activeStep === 'dashboard') {
      return <DashboardLazy />;
    }
    return null;
  };

  return (
    <div className="h-screen flex flex-col bg-zinc-950 overflow-hidden">
      <Navbar onApiConfigSaved={() => setApiVersion(v => v + 1)} />
      <div className="flex flex-1 overflow-hidden" key={apiVersion}>
        <Sidebar
          activeStep={activeStep}
          onStepChange={setActiveStep}
          counts={{ visions: visionCount, milestones: milestoneCount, inbox: inboxCount }}
        />

        {/* Main content: left = workflow panel, right = focus board */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Step panel */}
          <div className="w-[420px] xl:w-[480px] shrink-0 border-r border-zinc-800 overflow-y-auto p-6">
            {rightPanel()}
          </div>

          {/* Right: Focus board or Evening review */}
          <div className="flex-1 overflow-y-auto p-6">
            {dayPhase === 'evening' ? (
              <EveningReview onGenerateInsight={handleGenerateInsight} />
            ) : (
              <FocusBoard
                notToDoRules={notToDoRules}
                onRunAI={handleRunAI}
                aiLoading={aiLoading}
                aiError={aiError}
                analysisSummary={analysisSummary}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Lazy loaded Dashboard to avoid circular deps
function DashboardLazy() {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [loaded, setLoaded] = useState(false);

  if (!loaded) {
    import('./components/Dashboard').then(m => {
      setComponent(() => m.Dashboard);
      setLoaded(true);
    });
    return (
      <div className="flex items-center justify-center h-40 text-zinc-600 text-sm">
        加载看板...
      </div>
    );
  }

  return Component ? <Component /> : null;
}
