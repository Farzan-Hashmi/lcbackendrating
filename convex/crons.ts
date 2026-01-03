import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "updateQuestionBank",
  { hours: 24 * 7 },
  api.myFunctions.updateQuestionBank,
);

crons.interval(
  "updateMochiTable",
  { minutes: 5 },
  api.myFunctions.updateMochiTable,
  {},
);

export default crons;
