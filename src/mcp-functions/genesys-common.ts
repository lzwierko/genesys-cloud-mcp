type PagingParams = { pageSize: number; pageNumber: number };

export async function getPagedResponse<T, P extends object>(
  apiMethod: (params: P & PagingParams) => Promise<{ entities?: T[] }>,
  initialParams?: P & PagingParams,
): Promise<T[]> {
  const pageSize = initialParams?.pageSize ?? 100;
  let pageNumber = initialParams?.pageNumber ?? 1;

  if (!initialParams) {
    initialParams = {} as P & PagingParams;
  }

  const allResults: T[] = [];
  while (true) {
    const response = await apiMethod({ ...initialParams, pageSize, pageNumber });
    if (!Array.isArray(response.entities)) {
      throw new Error('Genesys Cloud paged response is missing its entities array.');
    }
    allResults.push(...response.entities);
    if (response.entities.length < pageSize) break;
    pageNumber++;
  }
  return allResults;
}
