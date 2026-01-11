import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
  lcquestionssolved: defineTable({
    question_id: v.number(),
    question_title: v.string(),
    contest_name: v.string(),
    question_number: v.string(),
    question_rating: v.number(),
    leetcode_url: v.string(),
    solved: v.boolean(),
  })
    .index("by_question_id", ["question_id"])
    .index("by_solved", ["solved"]),

  mochicards: defineTable({
    card_id: v.string(),
    content: v.string(),
  }).index("by_card_id", ["card_id"]),
});
