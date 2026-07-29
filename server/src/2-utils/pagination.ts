/** פרמטרים אחידים לדפדוף ברשימות API */

export type PaginationParams = {
  skip: number;
  take: number;
  page: number;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  skip: number;
  take: number;
};

/**
 * קורא skip/take או page מ־query.
 * ברירת מחדל: take=10, מקסימום 50.
 */
export function parsePagination(
  query: { skip?: unknown; take?: unknown; page?: unknown },
  options?: { defaultTake?: number; maxTake?: number }
): PaginationParams {
  const defaultTake = options?.defaultTake ?? 10;
  const maxTake = options?.maxTake ?? 50;

  let take = Number(query.take ?? defaultTake);
  if (!Number.isFinite(take) || take < 1) take = defaultTake;
  take = Math.min(Math.floor(take), maxTake);

  const pageRaw = Number(query.page);
  let skip: number;
  if (Number.isFinite(pageRaw) && pageRaw >= 1) {
    skip = (Math.floor(pageRaw) - 1) * take;
  } else {
    skip = Number(query.skip ?? 0);
    if (!Number.isFinite(skip) || skip < 0) skip = 0;
    else skip = Math.floor(skip);
  }

  return {
    skip,
    take,
    page: Math.floor(skip / take) + 1,
  };
}
