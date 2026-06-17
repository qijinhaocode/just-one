/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const reviews = app.findCollectionByNameOrId('daily_reviews');
  reviews.fields.add(new Field({
    name: "ai_analyzed_at",
    type: "text",   // ISO datetime string, empty = not yet analyzed today
    required: false,
  }));
  app.save(reviews);
}, (app) => {
  const reviews = app.findCollectionByNameOrId('daily_reviews');
  reviews.fields.removeByName('ai_analyzed_at');
  app.save(reviews);
});
