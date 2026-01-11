import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "updateQuestionBank",
  { hours: 24 * 7 },
  api.myFunctions.updateQuestionBank,
);

// Daily fallback sync - use GET/POST to /syncMochi for instant updates!
crons.interval(
  "updateMochiTable",
  { hours: 24 },
  api.myFunctions.updateMochiTable,
  {},
);

export default crons;
