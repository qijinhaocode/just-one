/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // ── visions ──────────────────────────────────────────────────────────────
  const visions = new Collection({
    name: "visions",
    type: "base",
    fields: [
      { name: "content",     type: "text",   required: true },
      { name: "target_year", type: "number", required: true },
      { name: "isActive",    type: "bool",   required: false },
    ],
  });
  app.save(visions);

  // ── milestones ────────────────────────────────────────────────────────────
  const milestones = new Collection({
    name: "milestones",
    type: "base",
    fields: [
      { name: "visionId",  type: "text", required: false },
      { name: "title",     type: "text", required: true },
      { name: "timeFrame", type: "text", required: true },
      {
        name: "status", type: "select", required: true,
        values: ["pending", "completed", "archived"],
        maxSelect: 1,
      },
    ],
  });
  app.save(milestones);

  // ── tasks ─────────────────────────────────────────────────────────────────
  const tasks = new Collection({
    name: "tasks",
    type: "base",
    fields: [
      { name: "milestoneId",  type: "text",   required: false },
      { name: "title",        type: "text",   required: true },
      { name: "description",  type: "text",   required: false },
      {
        name: "priorityType", type: "select", required: true,
        values: ["inbox", "must", "should", "could"],
        maxSelect: 1,
      },
      {
        name: "status", type: "select", required: true,
        values: ["pending", "completed", "dropped"],
        maxSelect: 1,
      },
      { name: "targetDate",  type: "text",   required: false },
      { name: "streakCount", type: "number", required: false },
    ],
  });
  app.save(tasks);

  // ── daily_reviews ─────────────────────────────────────────────────────────
  const daily_reviews = new Collection({
    name: "daily_reviews",
    type: "base",
    fields: [
      { name: "date",          type: "text",   required: true },
      { name: "mustCompleted", type: "bool",   required: false },
      { name: "reflectionQ1",  type: "text",   required: false },
      { name: "reflectionQ2",  type: "text",   required: false },
      { name: "aiInsight",     type: "text",   required: false },
      { name: "focusScore",    type: "number", required: false },
    ],
  });
  app.save(daily_reviews);
}, (app) => {
  // rollback
  for (const name of ["visions", "milestones", "tasks", "daily_reviews"]) {
    try { app.delete(app.findCollectionByNameOrId(name)); } catch(_) {}
  }
});
