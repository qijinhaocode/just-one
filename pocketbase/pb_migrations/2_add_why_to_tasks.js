/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Add 'why' field to tasks collection
  const tasks = app.findCollectionByNameOrId('tasks');
  tasks.fields.add(new Field({
    name: "why",
    type: "text",
    required: false,
  }));
  app.save(tasks);
}, (app) => {
  const tasks = app.findCollectionByNameOrId('tasks');
  tasks.fields.removeByName('why');
  app.save(tasks);
});
