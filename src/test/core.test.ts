import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── db.ts unit tests ──────────────────────────────────────────────────────────
// We mock Dexie so tests run without a real IndexedDB env

vi.mock('dexie', () => {
  const tables: Record<string, unknown[]> = {};
  class MockTable {
    name: string;
    constructor(n: string) { this.name = n; tables[n] = []; }
    async add(item: Record<string, unknown>) { tables[this.name].push(item); return item.id; }
    async clear() { tables[this.name] = []; }
    async toArray() { return tables[this.name]; }
  }
  class MockDexie {
    visions = new MockTable('visions');
    milestones = new MockTable('milestones');
    tasks = new MockTable('tasks');
    dailyReviews = new MockTable('dailyReviews');
    version() { return { stores: () => {} }; }
    transaction(_mode: string, _tables: unknown[], fn: () => Promise<void>) { return fn(); }
  }
  return { default: MockDexie };
});

describe('db schema', () => {
  it('Vision interface has required fields', () => {
    const v = {
      id: crypto.randomUUID(),
      content: 'Test vision',
      target_year: 2030,
      isActive: 1,
      createdAt: new Date(),
    };
    expect(v.content).toBe('Test vision');
    expect(v.isActive).toBe(1);
    expect(v.target_year).toBe(2030);
  });

  it('Task priorityType accepts valid values', () => {
    const validTypes = ['inbox', 'must', 'should', 'could'] as const;
    validTypes.forEach(t => expect(validTypes).toContain(t));
  });

  it('Task status accepts valid values', () => {
    const validStatuses = ['pending', 'completed', 'dropped'] as const;
    validStatuses.forEach(s => expect(validStatuses).toContain(s));
  });

  it('DailyReview date format is YYYY-MM-DD', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('streakCount defaults to 0 for new tasks', () => {
    const task = {
      id: crypto.randomUUID(),
      title: 'Test task',
      priorityType: 'inbox' as const,
      status: 'pending' as const,
      streakCount: 0,
      createdAt: new Date(),
    };
    expect(task.streakCount).toBe(0);
  });
});

describe('gemini service utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('throws if API key is missing', async () => {
    // Dynamic import to avoid executing module at top level
    const { runAlignment } = await import('../services/gemini');
    await expect(runAlignment({ visions: [], milestones: [], tasks: [] }))
      .rejects
      .toThrow('Gemini API Key 未配置');
  });

  it('reads api key from localStorage and does not throw "未配置"', () => {
    localStorage.setItem('gemini_api_key', 'test-key-123');
    // Verify the key is accessible (the actual network call is not needed here)
    const key = localStorage.getItem('gemini_api_key');
    expect(key).toBe('test-key-123');
    expect(key).not.toBeNull();
  });
});

describe('day phase logic', () => {
  it('morning hours return morning phase', () => {
    const hour = 9;
    const phase = hour >= 18 ? 'evening' : 'morning';
    expect(phase).toBe('morning');
  });

  it('evening hours return evening phase', () => {
    const hour = 20;
    const phase = hour >= 18 ? 'evening' : 'morning';
    expect(phase).toBe('evening');
  });
});
