'use client';
import { useEntityGridController } from '../dataControl/useEntityGridController';
import EntityPaginationUi from './EntityPaginationUi';

// EntityCardGrid — same hook, different skin. Renders rows as cards
// instead of table rows. Search/refresh/export/print/pagination are
// identical to TestGrid because they come from the same
// useEntityGridController call — nothing to re-derive here.
export default function EntityCardGrid({ schema, fixedQuery = {}, title, description }) {
  const g = useEntityGridController(schema, { fixedQuery, title, description });

  return (
    <>
      <div className="d-flex justify-content-between align-items-start flex-wrap mb-3">
        <div>
          <h4 className="font-weight-bold text-dark mb-1">{g.title}</h4>
          {g.description && <p className="text-muted small mb-0">{g.description}</p>}
        </div>
        <div className="d-flex align-items-center">
          <input
            type="text"
            className="form-control mr-2"
            placeholder="Search..."
            value={g.searchInput}
            onChange={(e) => g.handleSearchChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') g.submitSearch(); }}
          />
          <button type="button" className="btn btn-sm btn-outline-secondary mr-2" onClick={g.submitSearch}>
            <i className="fa fa-search"></i>
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={g.handleRefresh}>
            <i className="fa fa-refresh"></i>
          </button>
        </div>
      </div>

      {g.loading ? (
        <p className="text-muted text-center py-4">Loading...</p>
      ) : g.error ? (
        <p className="text-danger text-center py-4">{g.error}</p>
      ) : g.rows.length === 0 ? (
        <p className="text-muted text-center py-4">No results found.</p>
      ) : (
        <div className="row" id={g.printCardId}>
          {g.rows.map((item) => (
            <div className="col-md-4 mb-3" key={item.record_id ?? item.primkey}>
              <div className="card h-100">
                <div className="card-body">
                  {g.visibleFields.map((f) => (
                    <div key={f.key} className="mb-1">
                      <small className="text-muted">{f.label}</small>
                      <div>{item[f.key]}</div>
                    </div>
                  ))}
                  {g.rowAction && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary mt-2"
                      onClick={() => g.runAction(g.rowAction.key)}
                    >
                      {g.rowAction.label}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <EntityPaginationUi
        page={g.page}
        pageCount={g.pageCount}
        onPageChange={g.setPage}
        pageSize={g.pageSize}
        onPageSizeChange={g.setPageSize}
      />
    </>
  );
}