/**
 * PocketBase service layer — multi-user edition.
 *
 * Auth: PocketBase's built-in users collection.
 * Data isolation: PocketBase Rules enforce "user = @request.auth.id" on every
 * collection. The JS SDK automatically sends the auth token on every request
 * once pb.authStore is populated — no manual header management needed.
 *
 * Collections: visions · milestones · tasks · daily_reviews · task_templates
 */

import PocketBase, { type RecordModel, type AuthModel } from 'pocketbase';

// ── PocketBase instance ───────────────────────────────────────────────────────
// URL can be overridden by users deploying to their own server
const PB_URL = localStorage.getItem('pb_url') || 'http://127.0.0.1:8090';
export const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Vision extends RecordModel {
  content: string;
  target_year: number;
  isActive: boolean;
  user: string;
}

export interface Milestone extends RecordModel {
  visionId: string;
  title: string;
  timeFrame: string;
  status: 'pending' | 'completed' | 'archived';
  user: string;
}

export interface Task extends RecordModel {
  milestoneId: string;
  title: string;
  description: string;
  why: string;
  priorityType: 'inbox' | 'must' | 'should' | 'could';
  status: 'pending' | 'completed' | 'dropped';
  targetDate: string;
  streakCount: number;
  estimatedMinutes: number;
  actualMinutes: number;
  user: string;
}

export interface DailyReview extends RecordModel {
  date: string;
  mustCompleted: boolean;
  reflectionQ1: string;
  reflectionQ2: string;
  aiInsight: string;
  focusScore: number;
  ai_analyzed_at: string;
  user: string;
}

export interface DailyReviewPayload {
  date: string;
  mustCompleted: boolean;
  reflectionQ1: string;
  reflectionQ2: string;
  aiInsight: string;
  focusScore: number;
  ai_analyzed_at?: string;
}

export interface TaskTemplate extends RecordModel {
  title: string;
  description: string;
  why: string;
  category: string;
  useCount: number;
  user: string;
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

/** Returns the current user ID, throws if not authenticated. */
function uid(): string {
  const id = pb.authStore.model?.id;
  if (!id) throw new Error('Not authenticated');
  return id;
}

/** Injects user into a create payload. */
function withUser<T extends object>(data: T): T & { user: string } {
  return { ...data, user: uid() };
}

// ── Auth API ──────────────────────────────────────────────────────────────────

export const authApi = {
  /** Current user record, or null if not logged in. */
  get currentUser(): AuthModel | null {
    return pb.authStore.isValid ? pb.authStore.model : null;
  },

  get isLoggedIn(): boolean {
    return pb.authStore.isValid;
  },

  async register(email: string, password: string, name?: string): Promise<void> {
    await pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
      name: name || email.split('@')[0],
    });
    await this.login(email, password);
  },

  async login(email: string, password: string): Promise<void> {
    await pb.collection('users').authWithPassword(email, password);
  },

  async loginWithOAuth(provider: string): Promise<void> {
    await pb.collection('users').authWithOAuth2({ provider });
  },

  logout(): void {
    pb.authStore.clear();
  },

  /** Re-send the email verification link. */
  async resendVerification(email: string): Promise<void> {
    await pb.collection('users').requestVerification(email);
  },

  /** Refresh the auth token (call on app startup to restore session). */
  async refresh(): Promise<boolean> {
    if (!pb.authStore.isValid) return false;
    try {
      await pb.collection('users').authRefresh();
      return true;
    } catch {
      pb.authStore.clear();
      return false;
    }
  },
};

// ── Connection check ──────────────────────────────────────────────────────────

export async function checkConnection(): Promise<boolean> {
  try {
    await pb.health.check();
    return true;
  } catch {
    return false;
  }
}

// ── Visions ───────────────────────────────────────────────────────────────────

export const visionsApi = {
  async list(): Promise<Vision[]> {
    const res = await pb.collection('visions').getList<Vision>(1, 200, { sort: 'created' });
    return res.items;
  },

  async create(data: { content: string; target_year: number; isActive: boolean }): Promise<Vision> {
    return pb.collection('visions').create<Vision>(withUser(data));
  },

  async setActive(id: string): Promise<void> {
    const all = await pb.collection('visions').getList<Vision>(1, 200);
    await Promise.all(all.items.filter(v => v.isActive).map(v =>
      pb.collection('visions').update(v.id, { isActive: false })
    ));
    await pb.collection('visions').update(id, { isActive: true });
  },

  async delete(id: string): Promise<void> {
    await pb.collection('visions').delete(id);
  },

  subscribe(callback: (items: Vision[]) => void): () => void {
    const refresh = async () => {
      const res = await pb.collection('visions').getList<Vision>(1, 200, { sort: 'created' });
      callback(res.items);
    };
    pb.collection('visions').subscribe('*', () => refresh());
    refresh();
    return () => { pb.collection('visions').unsubscribe('*'); };
  },
};

// ── Milestones ────────────────────────────────────────────────────────────────

export const milestonesApi = {
  async list(statusFilter?: string): Promise<Milestone[]> {
    const filter = statusFilter ? `status = "${statusFilter}"` : '';
    const res = await pb.collection('milestones').getList<Milestone>(1, 500, { sort: '-created', filter });
    return res.items;
  },

  async create(data: Omit<Milestone, keyof RecordModel>): Promise<Milestone> {
    return pb.collection('milestones').create<Milestone>(withUser(data));
  },

  async updateStatus(id: string, status: Milestone['status']): Promise<void> {
    await pb.collection('milestones').update(id, { status });
  },

  async delete(id: string): Promise<void> {
    const orphans = await pb.collection('tasks').getList<Task>(1, 500, {
      filter: `milestoneId = "${id}"`,
    });
    await Promise.all(orphans.items.map(t => pb.collection('tasks').update(t.id, { milestoneId: '' })));
    await pb.collection('milestones').delete(id);
  },

  subscribe(callback: (items: Milestone[]) => void): () => void {
    const refresh = async () => {
      const res = await pb.collection('milestones').getList<Milestone>(1, 500, { sort: '-created' });
      callback(res.items);
    };
    pb.collection('milestones').subscribe('*', () => refresh());
    refresh();
    return () => { pb.collection('milestones').unsubscribe('*'); };
  },
};

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const tasksApi = {
  async list(filter?: string): Promise<Task[]> {
    const res = await pb.collection('tasks').getList<Task>(1, 1000, {
      sort: '-created',
      filter: filter ?? '',
    });
    return res.items;
  },

  async create(data: Omit<Task, keyof RecordModel>): Promise<Task> {
    return pb.collection('tasks').create<Task>(withUser(data));
  },

  async update(id: string, data: Partial<Omit<Task, keyof RecordModel>>): Promise<Task> {
    return pb.collection('tasks').update<Task>(id, data);
  },

  async delete(id: string): Promise<void> {
    await pb.collection('tasks').delete(id);
  },

  async resetPriorityToInbox(): Promise<void> {
    const promoted = await pb.collection('tasks').getList<Task>(1, 1000, {
      filter: 'priorityType != "inbox" && status != "dropped"',
    });
    await Promise.all(promoted.items.map(t =>
      pb.collection('tasks').update(t.id, { priorityType: 'inbox', targetDate: '' })
    ));
  },

  async incrementStaleStreaks(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const stale = await pb.collection('tasks').getList<Task>(1, 1000, {
      filter: `status = "pending" && targetDate != "" && targetDate < "${today}"`,
    });
    await Promise.all(stale.items.map(t =>
      pb.collection('tasks').update(t.id, { streakCount: (t.streakCount ?? 0) + 1, targetDate: '' })
    ));
  },

  async carryOverYesterday(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = (() => {
      const d = new Date(today + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      return d.toISOString().split('T')[0];
    })();

    const stale = await pb.collection('tasks').getList<Task>(1, 200, {
      filter: `status = "pending" && priorityType != "inbox" && targetDate = "${yesterday}"`,
    });
    if (stale.items.length === 0) return 0;

    const todayMust = await pb.collection('tasks').getList<Task>(1, 1, {
      filter: `priorityType = "must" && status != "dropped" && (targetDate = "${today}" || targetDate = "")`,
    });
    const hasTodayMust = todayMust.totalItems > 0;

    await Promise.all(stale.items.map(t => {
      const newPriority = t.priorityType === 'must' && hasTodayMust ? 'should' : t.priorityType;
      return pb.collection('tasks').update(t.id, {
        targetDate: today,
        priorityType: newPriority,
        streakCount: (t.streakCount ?? 0) + 1,
      });
    }));

    return stale.items.length;
  },

  subscribe(callback: (items: Task[]) => void, filter?: string): () => void {
    const refresh = async () => {
      const res = await pb.collection('tasks').getList<Task>(1, 1000, {
        sort: '-created',
        filter: filter ?? '',
      });
      callback(res.items);
    };
    pb.collection('tasks').subscribe('*', () => refresh());
    refresh();
    return () => { pb.collection('tasks').unsubscribe('*'); };
  },
};

// ── Daily Reviews ─────────────────────────────────────────────────────────────

export const reviewsApi = {
  async list(limit = 30): Promise<DailyReview[]> {
    const res = await pb.collection('daily_reviews').getList<DailyReview>(1, limit, { sort: '-date' });
    return res.items;
  },

  async getByDate(date: string): Promise<DailyReview | null> {
    try {
      return await pb.collection('daily_reviews').getFirstListItem<DailyReview>(`date = "${date}"`);
    } catch { return null; }
  },

  async checkTodayAnalyzed(date: string): Promise<string | null> {
    const review = await this.getByDate(date);
    return review?.ai_analyzed_at || null;
  },

  async markTodayAnalyzed(date: string): Promise<void> {
    const now = new Date().toISOString();
    const existing = await this.getByDate(date);
    if (existing) {
      await pb.collection('daily_reviews').update(existing.id, { ai_analyzed_at: now });
    } else {
      await pb.collection('daily_reviews').create(withUser({
        date, mustCompleted: false, reflectionQ1: '', reflectionQ2: '',
        aiInsight: '', focusScore: 0, ai_analyzed_at: now,
      }));
    }
  },

  async upsert(data: DailyReviewPayload): Promise<DailyReview> {
    const existing = await this.getByDate(data.date);
    if (existing) {
      return pb.collection('daily_reviews').update<DailyReview>(existing.id, data);
    }
    return pb.collection('daily_reviews').create<DailyReview>(withUser(data));
  },

  subscribe(callback: (items: DailyReview[]) => void): () => void {
    const refresh = async () => {
      const res = await pb.collection('daily_reviews').getList<DailyReview>(1, 30, { sort: '-date' });
      callback(res.items);
    };
    pb.collection('daily_reviews').subscribe('*', () => refresh());
    refresh();
    return () => { pb.collection('daily_reviews').unsubscribe('*'); };
  },
};

// ── Task Templates ────────────────────────────────────────────────────────────

export const templatesApi = {
  async list(): Promise<TaskTemplate[]> {
    const res = await pb.collection('task_templates').getList<TaskTemplate>(1, 200, {
      sort: '-useCount,-created',
    });
    return res.items;
  },

  async create(data: Omit<TaskTemplate, keyof RecordModel>): Promise<TaskTemplate> {
    return pb.collection('task_templates').create<TaskTemplate>(withUser(data));
  },

  async delete(id: string): Promise<void> {
    await pb.collection('task_templates').delete(id);
  },

  async useTemplate(id: string): Promise<Omit<Task, keyof RecordModel>> {
    const t = await pb.collection('task_templates').getOne<TaskTemplate>(id);
    await pb.collection('task_templates').update(id, { useCount: (t.useCount ?? 0) + 1 });
    return {
      milestoneId: '', title: t.title, description: t.description ?? '',
      why: t.why ?? '', priorityType: 'inbox', status: 'pending',
      targetDate: '', streakCount: 0, estimatedMinutes: 0, actualMinutes: 0,
      user: uid(),
    };
  },

  subscribe(callback: (items: TaskTemplate[]) => void): () => void {
    const refresh = async () => {
      const res = await pb.collection('task_templates').getList<TaskTemplate>(1, 200, {
        sort: '-useCount,-created',
      });
      callback(res.items);
    };
    pb.collection('task_templates').subscribe('*', () => refresh());
    refresh();
    return () => { pb.collection('task_templates').unsubscribe('*'); };
  },
};

// ── Clear all data ────────────────────────────────────────────────────────────

export async function clearAllData(): Promise<void> {
  const [visions, milestones, tasks, reviews] = await Promise.all([
    pb.collection('visions').getList<Vision>(1, 1000),
    pb.collection('milestones').getList<Milestone>(1, 1000),
    pb.collection('tasks').getList<Task>(1, 1000),
    pb.collection('daily_reviews').getList<DailyReview>(1, 1000),
  ]);
  await Promise.all([
    ...visions.items.map(r => pb.collection('visions').delete(r.id)),
    ...milestones.items.map(r => pb.collection('milestones').delete(r.id)),
    ...tasks.items.map(r => pb.collection('tasks').delete(r.id)),
    ...reviews.items.map(r => pb.collection('daily_reviews').delete(r.id)),
  ]);
}

// ── Export all data ───────────────────────────────────────────────────────────

export async function exportAllData(): Promise<string> {
  const [visions, milestones, tasks, reviews] = await Promise.all([
    pb.collection('visions').getList<Vision>(1, 1000, { sort: 'created' }),
    pb.collection('milestones').getList<Milestone>(1, 1000, { sort: 'created' }),
    pb.collection('tasks').getList<Task>(1, 1000, { sort: 'created' }),
    pb.collection('daily_reviews').getList<DailyReview>(1, 1000, { sort: '-date' }),
  ]);
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    visions: visions.items,
    milestones: milestones.items,
    tasks: tasks.items,
    dailyReviews: reviews.items,
  }, null, 2);
}
