/**
 * PocketBase service layer — replaces Dexie/IndexedDB.
 *
 * All data is stored in PocketBase (SQLite) at http://127.0.0.1:8090.
 * The server must be running (`./start-pb.sh`) before using this app.
 *
 * Collections:
 *   visions        – long-term vision records
 *   milestones     – mid-term milestone records
 *   tasks          – all tasks (inbox/must/should/could)
 *   daily_reviews  – evening review + AI insight records
 */

import PocketBase, { type RecordModel } from 'pocketbase';

export const pb = new PocketBase('http://127.0.0.1:8090');

// Disable PocketBase's auto-cancel on duplicate requests (causes issues with React Strict Mode)
pb.autoCancellation(false);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Vision extends RecordModel {
  content: string;
  target_year: number;
  isActive: boolean;
}

export interface Milestone extends RecordModel {
  visionId: string;
  title: string;
  timeFrame: string;
  status: 'pending' | 'completed' | 'archived';
}

export interface Task extends RecordModel {
  milestoneId: string;
  title: string;
  description: string;
  why: string;           // Why this task matters — shown during execution
  priorityType: 'inbox' | 'must' | 'should' | 'could';
  status: 'pending' | 'completed' | 'dropped';
  targetDate: string;
  streakCount: number;
}

export interface DailyReview extends RecordModel {
  date: string;
  mustCompleted: boolean;
  reflectionQ1: string;
  reflectionQ2: string;
  aiInsight: string;
  focusScore: number;
}

/** Plain payload for creating/updating a review — no RecordModel metadata needed */
export interface DailyReviewPayload {
  date: string;
  mustCompleted: boolean;
  reflectionQ1: string;
  reflectionQ2: string;
  aiInsight: string;
  focusScore: number;
}

// ─── Connection check ─────────────────────────────────────────────────────────

export async function checkConnection(): Promise<boolean> {
  try {
    await pb.health.check();
    return true;
  } catch {
    return false;
  }
}

// ─── Visions ─────────────────────────────────────────────────────────────────

export const visionsApi = {
  async list(): Promise<Vision[]> {
    const res = await pb.collection('visions').getList<Vision>(1, 200, {
      sort: 'created',
    });
    return res.items;
  },

  async create(data: { content: string; target_year: number; isActive: boolean }): Promise<Vision> {
    return pb.collection('visions').create<Vision>(data);
  },

  async setActive(id: string): Promise<void> {
    // Deactivate all, then activate the chosen one
    const all = await pb.collection('visions').getList<Vision>(1, 200);
    await Promise.all(
      all.items
        .filter(v => v.isActive)
        .map(v => pb.collection('visions').update(v.id, { isActive: false }))
    );
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

// ─── Milestones ───────────────────────────────────────────────────────────────

export const milestonesApi = {
  async list(statusFilter?: string): Promise<Milestone[]> {
    const filter = statusFilter ? `status = "${statusFilter}"` : '';
    const res = await pb.collection('milestones').getList<Milestone>(1, 500, {
      sort: '-created',
      filter,
    });
    return res.items;
  },

  async create(data: Omit<Milestone, keyof RecordModel>): Promise<Milestone> {
    return pb.collection('milestones').create<Milestone>(data);
  },

  async updateStatus(id: string, status: Milestone['status']): Promise<void> {
    await pb.collection('milestones').update(id, { status });
  },

  async delete(id: string): Promise<void> {
    // Orphan tasks: clear their milestoneId
    const orphans = await pb.collection('tasks').getList<Task>(1, 500, {
      filter: `milestoneId = "${id}"`,
    });
    await Promise.all(
      orphans.items.map(t => pb.collection('tasks').update(t.id, { milestoneId: '' }))
    );
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

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const tasksApi = {
  async list(filter?: string): Promise<Task[]> {
    const res = await pb.collection('tasks').getList<Task>(1, 1000, {
      sort: '-created',
      filter: filter ?? '',
    });
    return res.items;
  },

  async create(data: Omit<Task, keyof RecordModel>): Promise<Task> {
    return pb.collection('tasks').create<Task>(data);
  },

  async update(id: string, data: Partial<Omit<Task, keyof RecordModel>>): Promise<Task> {
    return pb.collection('tasks').update<Task>(id, data);
  },

  async delete(id: string): Promise<void> {
    await pb.collection('tasks').delete(id);
  },

  /** Demote all current must/should/could back to inbox before a new AI run */
  async resetPriorityToInbox(): Promise<void> {
    const promoted = await pb.collection('tasks').getList<Task>(1, 1000, {
      filter: 'priorityType != "inbox" && status != "dropped"',
    });
    await Promise.all(
      promoted.items.map(t =>
        pb.collection('tasks').update(t.id, { priorityType: 'inbox', targetDate: '' })
      )
    );
  },

  /** Increment streakCount for all non-dropped, non-completed inbox/must/should/could tasks
   *  that had a targetDate of yesterday (or earlier). Called once on app startup. */
  async incrementStaleStreaks(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const stale = await pb.collection('tasks').getList<Task>(1, 1000, {
      filter: `status = "pending" && targetDate != "" && targetDate < "${today}"`,
    });
    await Promise.all(
      stale.items.map(t =>
        pb.collection('tasks').update(t.id, { streakCount: (t.streakCount ?? 0) + 1, targetDate: '' })
      )
    );
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

// ─── Daily Reviews ────────────────────────────────────────────────────────────

export const reviewsApi = {
  async list(limit = 30): Promise<DailyReview[]> {
    const res = await pb.collection('daily_reviews').getList<DailyReview>(1, limit, {
      sort: '-date',
    });
    return res.items;
  },

  async getByDate(date: string): Promise<DailyReview | null> {
    try {
      return await pb.collection('daily_reviews').getFirstListItem<DailyReview>(
        `date = "${date}"`
      );
    } catch {
      return null;
    }
  },

  async upsert(data: DailyReviewPayload): Promise<DailyReview> {
    const existing = await this.getByDate(data.date);
    if (existing) {
      return pb.collection('daily_reviews').update<DailyReview>(existing.id, data);
    }
    return pb.collection('daily_reviews').create<DailyReview>(data);
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

// ─── Clear all data ───────────────────────────────────────────────────────────

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

// ─── Export all data ──────────────────────────────────────────────────────────

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
