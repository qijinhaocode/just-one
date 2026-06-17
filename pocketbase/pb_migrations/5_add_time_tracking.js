/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const tasks = app.findCollectionByNameOrId('tasks');
  tasks.fields.add(new Field({
    name: "estimatedMinutes",
    type: "number",
    required: false,
  }));
  tasks.fields.add(new Field({
    name: "actualMinutes",
    type: "number",
    required: false,
  }));
  app.save(tasks);
}, (app) => {
  const tasks = app.findCollectionByNameOrId('tasks');
  tasks.fields.removeByName('estimatedMinutes');
  tasks.fields.removeByName('actualMinutes');
  app.save(tasks);
});
