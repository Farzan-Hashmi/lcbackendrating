import { v } from "convex/values";
import { query, mutation, action, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";

// Write your Convex functions in any file inside this directory (`convex`).
// See https://docs.convex.dev/functions for more.

export const addCard = internalMutation({
  args: { cardId: v.string(), cardText: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if card already exists by querying directly
    const existing = await ctx.db
      .query("mochicards")
      .filter((q) => q.eq(q.field("card_id"), args.cardId))
      .first();

    if (existing) {
      return null;
    }

    await ctx.db.insert("mochicards", {
      card_id: args.cardId,
      content: args.cardText,
    });

    return null;
  },
});

export const getAllQuestionTitlesAndIds = query({
  handler: async (ctx) => {
    const data = await ctx.db.query("lcquestionssolved").collect();
    return data.map((item) => ({
      question_id: item.question_id,
      question_title: item.question_title,
    }));
  },
});

export const getAllMochiCards = query({
  handler: async (ctx) => {
    const data = await ctx.db.query("mochicards").collect();
    return data.map((item) => ({
      card_id: item.card_id,
      card_content: item.content,
      card_base_id: item._id,
    }));
  },
});

export const getUnsolvedQuestionTitlesAndIds = query({
  handler: async (ctx) => {
    const data = await ctx.db
      .query("lcquestionssolved")
      .filter((q) => q.eq(q.field("solved"), false))
      .collect();

    console.log("Unsolved questions");
    console.log(data);
    return data.map((item) => ({
      question_id: item.question_id,
      question_title: item.question_title,
    }));
  },
});

export const getQuestionsBetweentDifficulty = query({
  args: {
    lower: v.number(),
    higher: v.number(),
  },
  returns: v.array(
    v.object({
      question_id: v.number(),
      question_title: v.string(),
      contest_name: v.string(),
      question_number: v.string(),
      question_rating: v.number(),
      leetcode_url: v.string(),
      solved: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    // Filter questions where rating is between lower and higher (inclusive)
    const questions = await ctx.db
      .query("lcquestionssolved")
      .filter((q) =>
        q.and(
          q.gte(q.field("question_rating"), args.lower),
          q.lte(q.field("question_rating"), args.higher),
        ),
      )
      .collect();
    return questions;
  },
});

export const getFilteredQuestions = query({
  args: {
    keyword: v.optional(v.string()),
    contestNumber: v.optional(v.string()),
    ratingMin: v.optional(v.number()),
    ratingMax: v.optional(v.number()),
    sortBy: v.optional(v.union(v.literal("id"), v.literal("rating"))),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  returns: v.array(
    v.object({
      _id: v.id("lcquestionssolved"),
      _creationTime: v.number(),
      question_id: v.number(),
      question_title: v.string(),
      contest_name: v.string(),
      question_number: v.string(),
      question_rating: v.number(),
      leetcode_url: v.string(),
      solved: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    let query = ctx.db.query("lcquestionssolved");

    // Apply filters
    const allQuestions = await query.collect();

    let filtered = allQuestions.filter((q) => {
      // Keyword filter (search in title)
      if (args.keyword && args.keyword.trim() !== "") {
        const keywordLower = args.keyword.toLowerCase();
        if (!q.question_title.toLowerCase().includes(keywordLower)) {
          return false;
        }
      }

      // Contest number filter
      if (args.contestNumber && args.contestNumber.trim() !== "") {
        if (!q.contest_name.includes(args.contestNumber)) {
          return false;
        }
      }

      // Rating interval filter
      if (args.ratingMin !== undefined) {
        if (q.question_rating < args.ratingMin) {
          return false;
        }
      }
      if (args.ratingMax !== undefined) {
        if (q.question_rating > args.ratingMax) {
          return false;
        }
      }

      return true;
    });

    // Apply sorting
    const sortBy = args.sortBy || "id";
    const sortOrder = args.sortOrder || "desc";

    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "id") {
        comparison = a.question_id - b.question_id;
      } else if (sortBy === "rating") {
        comparison = a.question_rating - b.question_rating;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  },
});

export const updateMochiTable = action({
  handler: async (ctx, args) => {
    const MOCHI_API_KEY = process.env.MOCHI_API_KEY;
    if (!MOCHI_API_KEY) {
      throw new Error("MOCHI_API_KEY environment variable is not set");
    }

    // Use btoa() for base64 encoding (browser/Convex V8 compatible)
    const auth = btoa(`${MOCHI_API_KEY}:`);
    const response = await fetch(
      "https://app.mochi.cards/api/cards?limit=100",
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Mochi API error: ${response.status} ${response.statusText} - ${text.slice(0, 200)}`,
      );
    }

    const data = await response.json();
    // data.docs is an array, so iterate through it and extract content from each doc
    if (data.docs && Array.isArray(data.docs)) {
      for (const doc of data.docs) {
        if (doc.content) {
          await ctx.scheduler.runAfter(0, internal.myFunctions.addCard, {
            cardId: doc.id,
            cardText: doc.content,
          });
        }
      }
    }

    // After adding cards, schedule the solved status sync
    // Small delay to allow card insertions to complete
    await ctx.scheduler.runAfter(
      30 * 1000,
      internal.myFunctions.updateQuestionSolvedStatus,
      {},
    );
  },
});

/**
 * Sync solved status by extracting bold titles (**title**) from Mochi cards
 * and matching them against LeetCode question titles.
 * No external API calls needed - runs entirely in the database.
 */
export const updateQuestionSolvedStatus = internalMutation({
  args: {},
  returns: v.object({
    matched: v.number(),
    total: v.number(),
  }),
  handler: async (ctx) => {
    // Get all Mochi cards
    const cards = await ctx.db.query("mochicards").collect();

    // Extract bold titles from card content using regex
    // Matches text between ** and **
    // Mochi format is "**{number}. {title}**" so we strip the number prefix
    const solvedTitles = new Set<string>();
    for (const card of cards) {
      const matches = card.content.matchAll(/\*\*(.+?)\*\*/g);
      for (const match of matches) {
        let title = match[1].toLowerCase().trim();
        // Strip number prefix like "3044. " or "227. "
        title = title.replace(/^\d+\.\s*/, "");
        solvedTitles.add(title);
      }
    }

    console.log("Solved titles", solvedTitles);

    // Get all questions and update solved status
    const questions = await ctx.db.query("lcquestionssolved").collect();
    let matchedCount = 0;

    console.log("Questions", questions);

    for (const question of questions) {
      const titleLower = question.question_title.toLowerCase().trim();
      const isSolved = solvedTitles.has(titleLower);

      if (isSolved !== question.solved) {
        await ctx.db.patch(question._id, { solved: isSolved });
      }

      if (isSolved) {
        matchedCount++;
      }
    }

    return {
      matched: matchedCount,
      total: questions.length,
    };
  },
});

export const markAllDoneFalse = internalMutation({
  handler: async (ctx, args) => {
    const question_ids = await ctx.db.query("lcquestionssolved").collect();
    for (const question of question_ids) {
      await ctx.db.patch("lcquestionssolved", question._id, { solved: false });
    }
  },
});

/**
 * Internal mutation to upsert a question into the database
 */
export const upsertQuestion = internalMutation({
  args: {
    question_id: v.number(),
    question_title: v.string(),
    contest_name: v.string(),
    question_number: v.string(),
    question_rating: v.number(),
    question_url: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if question already exists
    const existing = await ctx.db
      .query("lcquestionssolved")
      .filter((q) => q.eq(q.field("question_id"), args.question_id))
      .first();

    if (!existing) {
      // Insert new question
      await ctx.db.insert("lcquestionssolved", {
        question_id: args.question_id,
        question_title: args.question_title,
        contest_name: args.contest_name,
        question_number: args.question_number,
        question_rating: args.question_rating,
        leetcode_url: args.question_url,
        solved: false,
      });
    }
    return null;
  },
});

/**
 * Action to fetch all questions from the LeetCode problem rating API
 * and update the Convex database
 */
export const updateQuestionBank = action({
  args: {},
  returns: v.object({
    totalFetched: v.number(),
  }),
  handler: async (ctx, args) => {
    const URL = "https://zerotrac.github.io/leetcode_problem_rating/data.json";

    // Fetch all questions from the API
    const response = await fetch(URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch questions: ${response.statusText}`);
    }

    const questions: Array<{
      Rating: number;
      ID: number;
      Title: string;
      TitleZH?: string;
      TitleSlug?: string;
      ContestSlug?: string;
      ProblemIndex?: string;
      ContestID_en?: string;
      ContestID_zh?: string;
    }> = await response.json();

    // Get existing question IDs once for efficiency
    const existingQuestions = await ctx.runQuery(
      api.myFunctions.getAllQuestionTitlesAndIds,
    );
    const existingIds = new Set(existingQuestions.map((q) => q.question_id));

    // Process each question
    for (const question of questions) {
      // Use ContestID_en if available, otherwise ContestID_zh, otherwise ContestSlug
      const contestName =
        question.ContestID_en ||
        question.ContestID_zh ||
        question.ContestSlug ||
        "Unknown Contest";

      // Use ProblemIndex if available, otherwise default to empty string
      const problemIndex = question.ProblemIndex || "";

      const isNew = !existingIds.has(question.ID);

      const url =
        "https://leetcode.com/problems/" + question.TitleSlug + "/description/";

      // Upsert the question
      if (isNew) {
        await ctx.scheduler.runAfter(0, internal.myFunctions.upsertQuestion, {
          question_id: question.ID,
          question_title: question.Title,
          contest_name: contestName,
          question_number: problemIndex,
          question_rating: question.Rating,
          question_url: url,
        });
      }
    }

    return {
      totalFetched: questions.length,
    };
  },
});
