// Builds pagination meta + next/prev links for a paginated collection response.
function buildPagination(req, total, page, limit) {
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const base = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
  const query = { ...req.query };

  const linkFor = (p) => {
    query.page = p;
    const qs = new URLSearchParams(query).toString();
    return `${base}?${qs}`;
  };

  return {
    total,
    page,
    limit,
    totalPages,
    next: page < totalPages ? linkFor(page + 1) : null,
    prev: page > 1 ? linkFor(page - 1) : null
  };
}

function parsePagination(req, defaultLimit = 50, maxLimit = 500) {
  let page = parseInt(req.query.page, 10);
  let limit = parseInt(req.query.limit, 10);
  if (!Number.isInteger(page) || page < 1) page = 1;
  if (!Number.isInteger(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;
  return { page, limit, skip: (page - 1) * limit };
}

module.exports = { buildPagination, parsePagination };
