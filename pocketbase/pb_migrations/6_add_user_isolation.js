/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Helper: add user relation field + set list/view/create/update/delete rules
  function addUserIsolation(collectionName) {
    const col = app.findCollectionByNameOrId(collectionName);

    // Add user relation field (points to _superusers-excluded users collection)
    col.fields.add(new Field({
      name: "user",
      type: "relation",
      required: true,
      collectionId: app.findCollectionByNameOrId("users").id,
      cascadeDelete: true,  // delete records when user is deleted
      maxSelect: 1,
    }));

    // Access rules: users can only see/modify their own records
    col.listRule   = '@request.auth.id != "" && user = @request.auth.id';
    col.viewRule   = '@request.auth.id != "" && user = @request.auth.id';
    col.createRule = '@request.auth.id != ""';
    col.updateRule = '@request.auth.id != "" && user = @request.auth.id';
    col.deleteRule = '@request.auth.id != "" && user = @request.auth.id';

    app.save(col);
  }

  addUserIsolation('visions');
  addUserIsolation('milestones');
  addUserIsolation('tasks');
  addUserIsolation('daily_reviews');
  addUserIsolation('task_templates');

}, (app) => {
  // Rollback: remove user field and reset rules
  function removeUserIsolation(collectionName) {
    const col = app.findCollectionByNameOrId(collectionName);
    col.fields.removeByName('user');
    col.listRule   = '';
    col.viewRule   = '';
    col.createRule = '';
    col.updateRule = '';
    col.deleteRule = '';
    app.save(col);
  }

  removeUserIsolation('visions');
  removeUserIsolation('milestones');
  removeUserIsolation('tasks');
  removeUserIsolation('daily_reviews');
  removeUserIsolation('task_templates');
});
