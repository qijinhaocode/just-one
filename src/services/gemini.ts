import type { Vision, Milestone, Task, DailyReview } from '../db';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AIAlignmentResponse {
  ai_analysis_summary: string;
  must_do_task_id: string;
  should_do_task_ids: string[];
  could_do_task_ids: string[];
  not_to_do_rules: string[];
}

interface AlignmentInput {
  visions: Vision[];
  milestones: Milestone[];
  tasks: Task[];
}

interface DailyInsightInput {
  review: Omit<DailyReview, 'id' | 'aiInsight' | 'createdAt'>;
  mustTasks: Task[];
  shouldTasks: Task[];
  couldTasks: Task[];
}

// ─── API helpers ──────────────────────────────────────────────────────────────

function getApiConfig() {
  const apiKey = localStorage.getItem('gemini_api_key')?.trim();
  const endpoint =
    localStorage.getItem('gemini_endpoint')?.trim() ||
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent';

  if (!apiKey) throw new Error('Gemini API Key 未配置，请在右上角"API 配置"中设置。');
  return { apiKey, endpoint };
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callGeminiWithRetry(
  body: object,
  maxRetries = 5
): Promise<unknown> {
  const { apiKey, endpoint } = getApiConfig();
  const url = `${endpoint}?key=${apiKey}`;
  const delays = [1000, 2000, 4000, 8000, 16000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        if (attempt < maxRetries) {
          await sleep(delays[attempt] ?? 16000);
          continue;
        }
        throw new Error('API 请求频率超限（429），请稍后重试。');
      }

      if (res.status === 401 || res.status === 403) {
        throw new Error('API Key 无效或权限不足，请检查配置。');
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`API 请求失败 (${res.status})：${errText.slice(0, 200)}`);
      }

      return await res.json();
    } catch (e) {
      if (e instanceof TypeError && e.message.includes('fetch')) {
        if (attempt < maxRetries) {
          await sleep(delays[attempt] ?? 16000);
          continue;
        }
        throw new Error('网络连接失败，请检查网络后重试。');
      }
      // Non-retryable errors bubble up immediately
      if (attempt === maxRetries || !(e instanceof Error && e.message.includes('429'))) {
        throw e;
      }
    }
  }
  throw new Error('超过最大重试次数，请稍后重试。');
}

function extractTextFromResponse(responseJson: unknown): string {
  const r = responseJson as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
    error?: { message?: string };
  };

  if (r.error?.message) {
    throw new Error(`Gemini API 错误：${r.error.message}`);
  }

  const text = r.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('AI 返回内容为空，请重试。');
  }
  return text;
}

function safeParseJSON<T>(text: string): T {
  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`AI 返回的 JSON 格式不合法：${cleaned.slice(0, 300)}`);
  }
}

// ─── Alignment Schema ─────────────────────────────────────────────────────────

const ALIGNMENT_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    ai_analysis_summary: { type: 'string' },
    must_do_task_id: { type: 'string' },
    should_do_task_ids: { type: 'array', items: { type: 'string' } },
    could_do_task_ids: { type: 'array', items: { type: 'string' } },
    not_to_do_rules: { type: 'array', items: { type: 'string' } },
  },
  required: ['ai_analysis_summary', 'must_do_task_id', 'should_do_task_ids', 'could_do_task_ids', 'not_to_do_rules'],
};

// ─── Core Alignment ───────────────────────────────────────────────────────────

export async function runAlignment(input: AlignmentInput): Promise<AIAlignmentResponse> {
  const { visions, milestones, tasks } = input;

  const activeVision = visions[0];
  const visionText = activeVision
    ? `长期愿景（目标年份 ${activeVision.target_year}）：${activeVision.content}`
    : '用户尚未设定长期愿景。';

  const milestonesText = milestones.length > 0
    ? milestones.map(m => `- [${m.timeFrame}] ${m.title}`).join('\n')
    : '暂无中期里程碑。';

  const tasksText = tasks.map(t => {
    const parts = [
      `ID: ${t.id}`,
      `标题: ${t.title}`,
    ];
    if (t.description) parts.push(`备注: ${t.description}`);
    if (t.streakCount > 0) parts.push(`拖延天数: ${t.streakCount}`);
    if (t.milestoneId) parts.push(`关联里程碑ID: ${t.milestoneId}`);
    return parts.join(' | ');
  }).join('\n');

  const systemPrompt = `你是一位世界顶级的"人生商业教练"与"时间对齐大师"。你的任务是帮助用户从大量日常待办中，精准筛选出与其中长期目标最对齐的核心任务，严格执行 1-3-5 优先级法则。

## 对齐评估算法
对每个任务计算对齐分数 S：
S = 0.5 × A_vision + 0.3 × A_milestone - 0.2 × T_drag

其中：
- A_vision（0~1）：任务是否直接服务于用户的长期愿景
- A_milestone（0~1）：任务是否是当前里程碑的关键瓶颈
- T_drag（0~1）：拖延惩罚系数 = min(streakCount / 7, 1)，拖延越久惩罚越大

## 核心规则
1. must_do_task_id：只能选 1 个，必须是战略意义最高的任务
2. should_do_task_ids：最多 3 个
3. could_do_task_ids：最多 5 个
4. 已被 must/should/could 选中的任务 ID 不得重复出现
5. not_to_do_rules：3 条今天绝对不应该碰的诱惑/杂务规则（根据用户目标推导，不是具体任务 ID）
6. 剔除那些看似紧急但与中长期愿景无关的杂务

## 用户目标上下文
${visionText}

## 当前中期里程碑
${milestonesText}

## 待分析的收集箱任务
${tasksText}

请严格按照 JSON Schema 输出，ai_analysis_summary 控制在 200 字以内。`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: '请对我今天的收集箱任务进行对齐分析，输出 1-3-5 优先级排布。' }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: ALIGNMENT_RESPONSE_SCHEMA,
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  const responseJson = await callGeminiWithRetry(body);
  const text = extractTextFromResponse(responseJson);
  const result = safeParseJSON<AIAlignmentResponse>(text);

  // Validate required fields
  if (!result.must_do_task_id) {
    throw new Error('AI 未能识别出核心任务，请检查收集箱内容后重试。');
  }

  return result;
}

// ─── Daily Insight ────────────────────────────────────────────────────────────

export async function generateDailyInsight(input: DailyInsightInput): Promise<string> {
  const { review, mustTasks, shouldTasks, couldTasks } = input;

  const mustInfo = mustTasks[0]
    ? `核心大事：「${mustTasks[0].title}」— ${mustTasks[0].status === 'completed' ? '✅ 已完成' : '❌ 未完成'}`
    : '今日未设定 Must-Do';

  const shouldInfo = shouldTasks.length > 0
    ? shouldTasks.map(t => `- ${t.title}（${t.status === 'completed' ? '已完成' : '未完成'}）`).join('\n')
    : '无应该做任务';

  const couldInfo = couldTasks.length > 0
    ? couldTasks.map(t => `- ${t.title}（${t.status === 'completed' ? '已完成' : '未完成'}）`).join('\n')
    : '无顺便做任务';

  const prompt = `你是一位充满洞察力的"AI Coach"，擅长根据用户的一天执行数据，给出精炼、有温度、有深度的个人成长诊断。

## 今日数据
日期：${review.date}
专注度自评：${review.focusScore}/10
${mustInfo}

应该做（3件）：
${shouldInfo}

顺便做（5件）：
${couldInfo}

用户反思：
Q1 今天完成了什么：${review.reflectionQ1}
Q2 遇到了什么阻碍：${review.reflectionQ2}

## 你的任务
1. 指出其专注度失焦或聚焦的核心原因（2~3句）
2. 根据任务完成情况，给出一个具体的、可操作的明天微调建议
3. 以鼓励的语气结尾，但不要空洞

字数控制在 150~250 字。直接输出诊断内容，不需要 JSON，不需要标题。`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 1024,
    },
  };

  const responseJson = await callGeminiWithRetry(body);
  return extractTextFromResponse(responseJson);
}
