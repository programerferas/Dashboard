// Tables ask for one page at a time; the API answers with the rows plus enough
// information for the pager to render.
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export const readPagination = (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const requested = Number(query.pageSize) || DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, requested));

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
};

export const paginated = (items, total, { page, pageSize }) => ({
  items,
  pagination: {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  },
});
