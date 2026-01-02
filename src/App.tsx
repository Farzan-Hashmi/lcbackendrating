import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useEffect } from "react";

type SortBy = "id" | "rating" | null;
type SortOrder = "asc" | "desc";

// Helper function to read URL params
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    keyword: params.get("keyword") || "",
    contestNumber: params.get("contestNumber") || "",
    ratingMin: params.get("ratingMin")
      ? Number(params.get("ratingMin"))
      : undefined,
    ratingMax: params.get("ratingMax")
      ? Number(params.get("ratingMax"))
      : undefined,
    sortBy: (params.get("sortBy") as SortBy) || null,
    sortOrder: (params.get("sortOrder") as SortOrder) || "desc",
  };
}

// Helper function to update URL params
function updateUrlParams(
  keyword: string,
  contestNumber: string,
  ratingMin: number | undefined,
  ratingMax: number | undefined,
  sortBy: SortBy,
  sortOrder: SortOrder,
) {
  const params = new URLSearchParams();
  if (keyword) params.set("keyword", keyword);
  if (contestNumber) params.set("contestNumber", contestNumber);
  if (ratingMin !== undefined) params.set("ratingMin", ratingMin.toString());
  if (ratingMax !== undefined) params.set("ratingMax", ratingMax.toString());
  if (sortBy) params.set("sortBy", sortBy);
  if (sortOrder !== "desc") params.set("sortOrder", sortOrder);

  const newUrl =
    window.location.pathname +
    (params.toString() ? `?${params.toString()}` : "");
  window.history.replaceState({}, "", newUrl);
}

export default function App() {
  // Initialize state from URL params
  const urlParams = getUrlParams();
  const [keyword, setKeyword] = useState(urlParams.keyword);
  const [contestNumber, setContestNumber] = useState(urlParams.contestNumber);
  const [ratingMin, setRatingMin] = useState<number | undefined>(
    urlParams.ratingMin,
  );
  const [ratingMax, setRatingMax] = useState<number | undefined>(
    urlParams.ratingMax,
  );
  const [sortBy, setSortBy] = useState<SortBy>(urlParams.sortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(urlParams.sortOrder);

  // Update URL when filters change
  useEffect(() => {
    updateUrlParams(
      keyword,
      contestNumber,
      ratingMin,
      ratingMax,
      sortBy,
      sortOrder,
    );
  }, [keyword, contestNumber, ratingMin, ratingMax, sortBy, sortOrder]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = getUrlParams();
      setKeyword(params.keyword);
      setContestNumber(params.contestNumber);
      setRatingMin(params.ratingMin);
      setRatingMax(params.ratingMax);
      setSortBy(params.sortBy);
      setSortOrder(params.sortOrder);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const questions = useQuery(api.myFunctions.getFilteredQuestions, {
    keyword: keyword.trim() || undefined,
    contestNumber: contestNumber.trim() || undefined,
    ratingMin,
    ratingMax,
    sortBy: sortBy || undefined,
    sortOrder,
  });

  const handleSort = (column: "id" | "rating") => {
    if (sortBy === column) {
      // Toggle sort order if clicking the same column
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new sort column with default descending order
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const handleReset = () => {
    setKeyword("");
    setContestNumber("");
    setRatingMin(undefined);
    setRatingMax(undefined);
    setSortBy(null);
    setSortOrder("desc");
    // URL will be updated by useEffect
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="container mx-auto p-6">
        {/* Filter Bar */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Keyword
              </label>
              <input
                type="text"
                placeholder="type a keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Contest number
              </label>
              <input
                type="text"
                placeholder=""
                value={contestNumber}
                onChange={(e) => setContestNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Rating interval
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder=""
                  value={ratingMin || ""}
                  onChange={(e) =>
                    setRatingMin(
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-500 dark:text-gray-400">-</span>
                <input
                  type="number"
                  placeholder=""
                  value={ratingMax || ""}
                  onChange={(e) =>
                    setRatingMax(
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <button
                onClick={handleReset}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort("id")}
                  >
                    <div className="flex items-center gap-2">
                      ID
                      {sortBy === "id" && (
                        <span className="text-gray-400">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                      {sortBy !== "id" && (
                        <span className="text-gray-300 dark:text-gray-600">
                          ↕
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Contest
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    #
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort("rating")}
                  >
                    <div className="flex items-center gap-2">
                      Rating
                      {sortBy === "rating" && (
                        <span className="text-gray-400">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                      {sortBy !== "rating" && (
                        <span className="text-gray-300 dark:text-gray-600">
                          ↕
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Solved
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {questions === undefined ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      Loading questions...
                    </td>
                  </tr>
                ) : questions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      No questions found
                    </td>
                  </tr>
                ) : (
                  questions.map((q) => (
                    <tr
                      key={q.question_id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {q.question_id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                        <a
                          href={q.leetcode_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {q.question_title}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {q.contest_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {q.question_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {q.question_rating.toFixed(0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            q.solved
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {q.solved ? "Solved" : "Not Solved"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Floating Action Button */}
        <button
          className="fixed bottom-6 right-6 w-14 h-14 bg-black hover:bg-gray-800 text-yellow-400 rounded-lg shadow-lg flex items-center justify-center text-2xl transition-colors z-50"
          aria-label="Action button"
        >
          *
        </button>
      </div>
    </div>
  );
}
