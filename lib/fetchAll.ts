// Supabase/PostgREST returns at most 1,000 rows per request (the project's "max rows" setting).
// This reads page by page until a short page comes back, so callers get every row.
export const PAGE = 1000;

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

export async function fetchAll<T>(page: (from: number, to: number) => PageResult<T>, limit = 100_000): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < limit; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const got = data ?? [];
    rows.push(...got);
    if (got.length < PAGE) break;
  }
  return rows;
}
