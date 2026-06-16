/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const templates = new Collection({
    name: "task_templates",
    type: "base",
    fields: [
      { name: "title",       type: "text", required: true },
      { name: "description", type: "text", required: false },
      { name: "why",         type: "text", required: false },
      { name: "category",    type: "text", required: false }, // e.g. "工作", "生活"
      { name: "useCount",    type: "number", required: false }, // how many times used
    ],
  });
  app.save(templates);
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId('task_templates')); } catch(_) {}
});
