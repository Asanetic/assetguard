'use client';

// EntityPaginationUi — always renders (nav + page-size selector), even
// with 0 or 1 pages. Nav buttons disable themselves when there's nowhere
// to go; the page-size dropdown stays interactive regardless, since
// that's often exactly how you'd get from 1 page to more rows visible.
//
// Usage: <EntityPaginationUi page={c.page} pageCount={c.pageCount} onPageChange={c.setPage}
//          pageSize={c.pageSize} onPageSizeChange={c.setPageSize} />

export default function EntityPaginationUi({
  page = 1,
  pageCount = 1,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [2, 5, 10, 20, 50, 100, 250, 500,1000, 2000],
}) {
  const safePageCount = Math.max(pageCount || 1, 1);
  const safePage = Math.min(Math.max(page || 1, 1), safePageCount);

  const renderPageNumbers = () => {
    const pageNumbersSet = new Set();

    [1, 2, 3, 4].filter((p) => p <= safePageCount).forEach((p) => pageNumbersSet.add(p));
    [safePageCount - 3, safePageCount - 2, safePageCount - 1, safePageCount]
      .filter((p) => p >= 1 && p > 4)
      .forEach((p) => pageNumbersSet.add(p));
    [2, 1].forEach((offset) => {
      const p = safePage - offset;
      if (p > 0 && p <= safePageCount) pageNumbersSet.add(p);
    });
    if (safePage > 0 && safePage <= safePageCount) pageNumbersSet.add(safePage);
    [1, 2].forEach((offset) => {
      const p = safePage + offset;
      if (p > 0 && p <= safePageCount) pageNumbersSet.add(p);
    });

    const sorted = Array.from(pageNumbersSet).sort((a, b) => a - b);
    const withEllipses = [];
    sorted.forEach((n, i) => {
      if (i > 0 && n - sorted[i - 1] > 1) withEllipses.push('...');
      withEllipses.push(n);
    });

    return withEllipses.map((item, index) =>
      item === '...' ? (
        <li key={`ellipsis-${index}`} className="page-item disabled">
          <span className="page-link">...</span>
        </li>
      ) : (
        <li key={item} className={`page-item ${item === safePage ? 'active' : ''}`}>
          <button
            type="button"
            className="page-link"
            disabled={item === safePage}
            onClick={() => onPageChange?.(item)}
          >
            {item}
          </button>
        </li>
      )
    );
  };

  return (
    <div className="mt-4 mb-3 row justify-content-center col-md-12 m-0 p-0 border-top border_set pt-2">
      <nav aria-label="Page navigation" className="col-md-8">
        <div className="row justify-content-center">
          <div className="pagination-wrapper w-100">
            <ul className="pagination justify-content-center flex-nowrap" style={{ minWidth: 'max-content' }}>
              <li className={`page-item ${safePage === 1 ? 'disabled' : ''}`}>
                <button type="button" className="page-link" disabled={safePage === 1} onClick={() => onPageChange?.(1)}>
                  First
                </button>
              </li>
              <li className={`page-item ${safePage === 1 ? 'disabled' : ''}`}>
                <button type="button" className="page-link" disabled={safePage === 1} onClick={() => onPageChange?.(safePage - 1)}>
                  Prev
                </button>
              </li>

              {renderPageNumbers()}

              <li className={`page-item ${safePage === safePageCount ? 'disabled' : ''}`}>
                <button type="button" className="page-link" disabled={safePage === safePageCount} onClick={() => onPageChange?.(safePage + 1)}>
                  Next
                </button>
              </li>
              <li className={`page-item ${safePage === safePageCount ? 'disabled' : ''}`}>
                <button type="button" className="page-link" disabled={safePage === safePageCount} onClick={() => onPageChange?.(safePageCount)}>
                  Last
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {onPageSizeChange && (
        <div className="col-md-4 p-2">
          <label className="badge">
            {pageSize >= 10000000000 ? 'Showing all rows' : `Show ${pageSize ?? '—'} rows per page`} | Change
          </label>
          <select
            className="rows_per_record"
            value={pageSize ?? ''}
            onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}