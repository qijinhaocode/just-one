import Dexie, { type Table } from 'dexie';

export interface Vision {
  id?: string;
  content: string;
  target_year: number;
  isActive: number;
  createdAt: Date;
}

export interface Milestone {
  id?: string;
  visionId?: string;
  title: string;
  timeFrame: string;
  status: 'pending' | 'completed' | 'archived';
  createdAt: Date;
}

export interface Task {
  id?: string;
  milestoneId?: string;
  title: string;
  description?: string;
  priorityType: 'inbox' | 'must' | 'should' | 'could';
  status: 'pending' | 'completed' | 'dropped';
  targetDate?: string;
  streakCount: number;
  createdAt: Date;
}

export interface DailyReview {
  id?: string;
  date: string;
  mustCompleted: number;
  reflectionQ1: string;
  reflectionQ2: string;
  aiInsight?: string;
  focusScore: number;
  createdAt: Date;
}

class JustOneDatabase extends Dexie {
  visions!: Table<Vision>;
  milestones!: Table<Milestone>;
  tasks!: Table<Task>;
  dailyReviews!: Table<DailyReview>;

  constructor() {
    super('JustOneDatabase');
    this.version(1).stores({
      visions: 'id, target_year, isActive',
      milestones: 'id, visionId, status, timeFrame',
      tasks: 'id, milestoneId, priorityType, status, targetDate',
      dailyReviews: 'id, date, mustCompleted',
    });
  }
}

export const db = new JustOneDatabase();

export async function clearAllLocalData() {
  await db.transaction('rw', [db.visions, db.milestones, db.tasks, db.dailyReviews], async () => {
    await db.visions.clear();
    await db.milestones.clear();
    await db.tasks.clear();
    await db.dailyReviews.clear();
  });
}
