import { useState, useEffect, lazy, Suspense } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, type SidebarStep } from './components/Sidebar';
import { VisionPanel } from './components/VisionPanel';
import { MilestonePanel } from './components/MilestonePanel';
import { InboxPanel } from './components/InboxPanel';
import { FocusBoard } from './components/FocusBoard';
import { EveningReview } from './components/EveningReview';
import { MorningRitual } from './components/MorningRitual';
import { WeeklyReport } from './components/WeeklyReport';
import { usePB } from './hooks/usePB';
import { visionsApi, milestonesApi, tasksApi, type DailyReviewPayload } from './services/pb';
import { computeStreak, type StreakData } from './services/streak';

// ── Dashboard lazy load (OUTSIDE App to keep stable component identity) ───────
const DashboardComponent = lazy(() =>
  import('./components/Dashboard').then(m => ({ default: m.Dashboard }))
);

// ── Day phase helpers ──────────────────────────────────────────────────────────
function getDayPhase(): 'morning' | 'evening' {
  return new Date().getHours() >= 18 ? 'evening' : 'morning';
}

// ── App ────────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeStep, setActiveStep] = useState<SidebarStep>('inbox');
  const [dayPhase, setDayPhase] = useState<'morning' | 'evening'>(getDayPhase);
  const [notToDoRules, setNotToDoRules] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [analysisSummary, setAnalysisSummary] = useState<string | null>(null);
  const [apiVersion, setApiVersion] = useState(0);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [showRitual, setShowRitual] = useState(false);
  const [showWeekly, setShowWeekly] = useState(false);

  // ── Re-evaluate day phase every minute ──────────────────────────────────────
  useEffect(() => {
    const tick = () => setDayPhase(getDayPhase());
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // ── Increment streakCount for stale tasks (once per day on mount) ────────────
  useEffect(() => {
    const lastRun = localStorage.getItem('streak_check_date');
    const today = new Date().toISOString().split('T')[0];
    if (lastRun !== today) {
      tasksApi.incrementStaleStreaks().then(() => {
        localStorage.setItem('streak_check_date', today);
      });
    }
  }, []);

  // ── Load streak data + show morning ritual once per day ──────────────────────
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const lastRitual = localStorage.getItem('last_ritual_date');

    computeStreak().then(data => {
      setStreak(data);
      // Show morning ritual once per day, only in morning phase
      if (lastRitual !== today && getDayPhase() === 'morning') {
        setShowRitual(true);
      }
    });

    // Auto-prompt weekly report on Friday evenings, once per week
    const isFriday = new Date().getDay() === 5;
    const lastWeeklyPrompt = localStorage.getItem('last_weekly_prompt');
    const thisWeekKey = (() => {
      const d = new Date();
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const mon = new Date(d);
      mon.setDate(d.getDate() + diff);
      return mon.toISOString().split('T')[0];
    })();
    if (isFriday && lastWeeklyPrompt !== thisWeekKey && getDayPhase() === 'evening') {
      localStorage.setItem('last_weekly_prompt', thisWeekKey);
      setShowWeekly(true);
    }
  }, []);

  // Re-compute streak whenever daily_reviews changes (e.g. after evening review)
  const { data: _reviewTrigger } = usePB<number>(
    () => computeStreak().then(data => { setStreak(data); return 0; }),
    [], 'daily_reviews'
  );
  void _reviewTrigger;

  // ── Live counts for sidebar badges ──────────────────────────────────────────
  const { data: visionCount } = usePB<number>(
    () => visionsApi.list().then(r => r.length), [], 'visions'
  );
  const { data: milestoneCount } = usePB<number>(
    () => milestonesApi.list('pending').then(r => r.length), [], 'milestones'
  );
  const { data: inboxCount } = usePB<number>(
    () => tasksApi.list('priorityType = "inbox" && status != "dropped"').then(r => r.length),
    [], 'tasks'
  );

  // ── AI alignment ─────────────────────────────────────────────────────────────
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
        visionsApi.list().then(r => r.filter(v => v.isActive)),
        milestonesApi.list('pending'),
        tasksApi.list('priorityType = "inbox" && status != "dropped"'),
      ]);

      if (tasks.length === 0) {
        setAiError('收集箱为空，无需分析');
        return;
      }

      // Convert PB records to the shape gemini.ts expects
      const geminiVisions = visions.map(v => ({
        id: v.id, content: v.content, target_year: v.target_year,
        isActive: v.isActive ? 1 : 0, createdAt: new Date(v.created),
      }));
      const geminiMilestones = milestones.map(m => ({
        id: m.id, visionId: m.visionId, title: m.title,
        timeFrame: m.timeFrame, status: m.status, createdAt: new Date(m.created),
      }));
      const geminiTasks = tasks.map(t => ({
        id: t.id, milestoneId: t.milestoneId, title: t.title,
        description: t.description, priorityType: t.priorityType as 'inbox',
        status: t.status as 'pending', targetDate: t.targetDate,
        streakCount: t.streakCount, createdAt: new Date(t.created),
      }));

      const result = await runAlignment({
        visions: geminiVisions,
        milestones: geminiMilestones,
        tasks: geminiTasks,
      });

      setAnalysisSummary(result.ai_analysis_summary);
      setNotToDoRules(result.not_to_do_rules);

      // Demote existing must/should/could back to inbox first
      await tasksApi.resetPriorityToInbox();

      // Batch promote new assignments
      const today = new Date().toISOString().split('T')[0];
      const updates: Promise<unknown>[] = [];
      if (result.must_do_task_id) {
        updates.push(tasksApi.update(result.must_do_task_id, { priorityType: 'must', targetDate: today }));
      }
      result.should_do_task_ids.forEach(id =>
        updates.push(tasksApi.update(id, { priorityType: 'should', targetDate: today }))
      );
      result.could_do_task_ids.forEach(id =>
        updates.push(tasksApi.update(id, { priorityType: 'could', targetDate: today }))
      );
      await Promise.all(updates);

    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AI 分析失败，请重试');
    } finally {
      setAiLoading(false);
    }
  }

  // ── Evening review AI insight ─────────────────────────────────────────────
  async function handleGenerateInsight(
    reviewData: DailyReviewPayload
  ): Promise<string> {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) throw new Error('请先配置 Gemini API Key');

    const { generateDailyInsight } = await import('./services/gemini');
    const today = reviewData.date;

    const [mustTasks, shouldTasks, couldTasks] = await Promise.all([
      tasksApi.list(`priorityType = "must" && (targetDate = "${today}" || targetDate = "")`),
      tasksApi.list(`priorityType = "should" && (targetDate = "${today}" || targetDate = "")`),
      tasksApi.list(`priorityType = "could" && (targetDate = "${today}" || targetDate = "")`),
    ]);

    // Convert to the shape gemini.ts expects
    const toGemini = (t: typeof mustTasks[0]) => ({
      id: t.id, title: t.title, description: t.description,
      priorityType: t.priorityType as 'must', status: t.status as 'pending',
      targetDate: t.targetDate, streakCount: t.streakCount,
      milestoneId: t.milestoneId, createdAt: new Date(t.created),
    });

    return generateDailyInsight({
      review: {
        date: reviewData.date,
        mustCompleted: reviewData.mustCompleted ? 1 : 0,
        reflectionQ1: reviewData.reflectionQ1,
        reflectionQ2: reviewData.reflectionQ2,
        focusScore: reviewData.focusScore,
      },
      mustTasks: mustTasks.map(toGemini),
      shouldTasks: shouldTasks.map(toGemini),
      couldTasks: couldTasks.map(toGemini),
    });
  }

  // ── Right panel content ──────────────────────────────────────────────────────
  function renderRightPanel() {
    if (dayPhase === 'evening') {
      return <EveningReview onGenerateInsight={handleGenerateInsight} />;
    }
    return (
      <FocusBoard
        notToDoRules={notToDoRules}
        onRunAI={handleRunAI}
        aiLoading={aiLoading}
        aiError={aiError}
        analysisSummary={analysisSummary}
        streak={streak}
      />
    );
  }

  function dismissRitual() {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('last_ritual_date', today);
    setShowRitual(false);
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-950 overflow-hidden">
      {/* Morning ritual overlay */}
      {showRitual && (
        <MorningRitual streak={streak} onDismiss={dismissRitual} />
      )}
      {/* Weekly report overlay (auto on Friday evening) */}
      {showWeekly && (
        <WeeklyReport onClose={() => setShowWeekly(false)} />
      )}
      <Navbar onApiConfigSaved={() => setApiVersion(v => v + 1)} />
      <div className="flex flex-1 overflow-hidden" key={apiVersion}>
        <Sidebar
          activeStep={activeStep}
          onStepChange={setActiveStep}
          counts={{
            visions: visionCount ?? 0,
            milestones: milestoneCount ?? 0,
            inbox: inboxCount ?? 0,
          }}
        />

        <div className="flex flex-1 overflow-hidden">
          {/* Left: workflow step panel */}
          <div className="w-[420px] xl:w-[480px] shrink-0 border-r border-zinc-800 overflow-y-auto p-6">
            {activeStep === 'vision'    && <VisionPanel />}
            {activeStep === 'milestone' && <MilestonePanel />}
            {activeStep === 'inbox'     && <InboxPanel />}
            {activeStep === 'dashboard' && (
              <Suspense fallback={<div className="flex items-center justify-center h-40 text-zinc-600 text-sm">加载看板...</div>}>
                <DashboardComponent />
              </Suspense>
            )}
          </div>

          {/* Right: focus board or evening review */}
          <div className="flex-1 overflow-y-auto p-6">
            {renderRightPanel()}
          </div>
        </div>
      </div>
    </div>
  );
}
