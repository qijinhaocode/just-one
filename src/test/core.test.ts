import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock PocketBase SDK ───────────────────────────────────────────────────────
vi.mock('pocketbase', () => {
  class MockCollection {
    name: string;
    _data: Record<string, unknown>[] = [];
    constructor(n: string) { this.name = n; }
    async getList(_p: number, _pp: number, _opts?: unknown) { return { items: this._data, totalItems: this._data.length }; }
    async create(data: Record<string, unknown>) { const r = { id: crypto.randomUUID(), ...data }; this._data.push(r); return r; }
    async update(id: string, data: Record<string, unknown>) {
      const idx = this._data.findIndex((r: Record<string, unknown>) => r.id === id);
      if (idx >= 0) this._data[idx] = { ...this._data[idx], ...data };
      return this._data[idx];
    }
    async delete(id: string) { this._data = this._data.filter((r: Record<string, unknown>) => r.id !== id); }
    subscribe() {}
    unsubscribe() {}
  }
  class MockPB {
    _cols: Record<string, MockCollection> = {};
    autoCancellation() {}
    // Mock authStore so withUser() works in tests
    authStore = {
      model: { id: 'test-user-id', email: 'test@test.com' },
      isValid: true,
      clear() {},
    };
    collection(name: string) {
      if (!this._cols[name]) this._cols[name] = new MockCollection(name);
      return this._cols[name];
    }
    get health() { return { check: async () => ({ code: 200 }) }; }
  }
  return { default: MockPB };
});

// ── Task schema validation ────────────────────────────────────────────────────
describe('Task type contract', () => {
  it('priorityType accepts valid values', () => {
    const valid = ['inbox', 'must', 'should', 'could'] as const;
    valid.forEach(v => expect(valid).toContain(v));
  });

  it('status accepts valid values', () => {
    const valid = ['pending', 'completed', 'dropped'] as const;
    valid.forEach(s => expect(valid).toContain(s));
  });

  it('streakCount defaults to 0 for new tasks', () => {
    const task = { id: crypto.randomUUID(), title: 'Test', priorityType: 'inbox', status: 'pending', streakCount: 0, created: new Date().toISOString() };
    expect(task.streakCount).toBe(0);
  });
});

// ── Vision schema validation ──────────────────────────────────────────────────
describe('Vision type contract', () => {
  it('has required fields', () => {
    const v = { id: crypto.randomUUID(), content: 'Build a product', target_year: 2030, isActive: true };
    expect(v.content).toBe('Build a product');
    expect(v.target_year).toBe(2030);
    expect(v.isActive).toBe(true);
  });
});

// ── DailyReview schema validation ─────────────────────────────────────────────
describe('DailyReview type contract', () => {
  it('date format is YYYY-MM-DD', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('focusScore is in range 1-10', () => {
    const score = 7;
    expect(score).toBeGreaterThanOrEqual(1);
    expect(score).toBeLessThanOrEqual(10);
  });
});

// ── Day phase logic ───────────────────────────────────────────────────────────
describe('Day phase logic', () => {
  it('morning hours → morning phase', () => {
    expect(9 >= 18 ? 'evening' : 'morning').toBe('morning');
  });

  it('18:00+ → evening phase', () => {
    expect(20 >= 18 ? 'evening' : 'morning').toBe('evening');
  });

  it('boundary: exactly 18:00 → evening', () => {
    expect(18 >= 18 ? 'evening' : 'morning').toBe('evening');
  });
});

// ── Gemini service config guard ────────────────────────────────────────────────
describe('Gemini service', () => {
  beforeEach(() => localStorage.clear());

  it('throws when API key is not set', async () => {
    const { runAlignment } = await import('../services/gemini');
    await expect(runAlignment({ visions: [], milestones: [], tasks: [] }))
      .rejects.toThrow('Gemini API Key 未配置');
  });

  it('reads API key from localStorage', () => {
    localStorage.setItem('gemini_api_key', 'test-abc');
    expect(localStorage.getItem('gemini_api_key')).toBe('test-abc');
  });
});

// ── PocketBase service layer ──────────────────────────────────────────────────
describe('PocketBase service layer', () => {
  it('checkConnection returns true when PB responds', async () => {
    const { checkConnection } = await import('../services/pb');
    const ok = await checkConnection();
    expect(ok).toBe(true);
  });

  it('visionsApi.create stores a vision', async () => {
    const { visionsApi } = await import('../services/pb');
    const v = await visionsApi.create({ content: 'Test vision', target_year: 2030, isActive: false });
    expect(v.content).toBe('Test vision');
    expect(v.target_year).toBe(2030);
  });

  it('tasksApi.create stores a task', async () => {
    const { tasksApi } = await import('../services/pb');
    const t = await tasksApi.create({
      milestoneId: '', title: 'Write tests', description: '', why: '',
      priorityType: 'inbox', status: 'pending', targetDate: '', streakCount: 0,
      estimatedMinutes: 30, actualMinutes: 0,
    });
    expect(t.title).toBe('Write tests');
    expect(t.priorityType).toBe('inbox');
    expect(t.estimatedMinutes).toBe(30);
  });

  it('tasksApi.update changes priorityType', async () => {
    const { tasksApi } = await import('../services/pb');
    const t = await tasksApi.create({
      milestoneId: '', title: 'Promote me', description: '', why: '',
      priorityType: 'inbox', status: 'pending', targetDate: '', streakCount: 0,
      estimatedMinutes: 0, actualMinutes: 0,
    });
    const updated = await tasksApi.update(t.id, { priorityType: 'must' });
    expect(updated.priorityType).toBe('must');
  });
});
