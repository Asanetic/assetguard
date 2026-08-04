'use client';
import Link from 'next/link';
import { useEntityGridController } from '../dataControl/useEntityGridController';
import EntityPaginationUi from './EntityPaginationUi';
import EntityRowOptions from './Entityrowoptions';
import { MosyImageViewer } from '../../UiControl/componentControl';
import { MosyUIGuard } from '../../UiControl/MosyUiGuard';
import defaultLogoAsset from '../../../img/logo/logo.png';
const defaultLogo = defaultLogoAsset.src || defaultLogoAsset;

// CardListGrid — the SAME "Cards list items UI" from Dribbble, wired to
// the SAME useEntityGridController hook SmartGrid.jsx uses. Nothing below
// touches search debouncing, pagination math, the registry, MosyNotify,
// URL filter scoping, or checkbox selection — it's all still owned by the
// hook. This file is proof of the claim: swap the template, keep the
// `const g = useEntityGridController(...)` line, get every capability
// for free.
//
// FIELD ROLES — a card has no "columns" the way a table does, so this
// derives which schema field plays which visual role from flags your
// schema already has:
//   avatar   -> the field with type: 'image'
//   title    -> the field flagged title: true (falls back to the first
//               visible field if none is flagged)
//   subtitle -> the first textarea-type field (falls back to the first
//               field that isn't the avatar/title)
//   meta     -> the field with type: 'datetime' (e.g. "posted 2h ago")
// No schema changes needed — this reads the exact same showInList/fields
// SmartGrid already reads, just picks different fields for different
// visual slots.

export default function CardListGrid({
  moduleActions,
  schema,
  fixedQuery = {},
  title,
  description,
  customProfilePath = './profile',
  dataOut = {},
}) {
  // Identical call to SmartGrid.jsx's — same search/refresh/pagination/
  // toolbar-actions/row-actions/URL-filter-scoping, zero re-implementation.
  const g = useEntityGridController(schema, { fixedQuery, title, description, moduleActions, dataOut });

  if (g.accessDenied) {
    return <MosyUIGuard moduleName={schema?.label || schema?.entity} reason={`You don't have the "${schema.moduleRole}" role required to view this.`} />;
  }

  const avatarField = g.visibleFields.find((f) => f.type === 'image');
  const titleField = g.visibleFields.find((f) => f.title) || g.visibleFields[0];
  const subtitleField =
    g.visibleFields.find((f) => f.type === 'textarea' && f.key !== titleField?.key) ||
    g.visibleFields.find((f) => f.key !== avatarField?.key && f.key !== titleField?.key);
  const metaField = g.visibleFields.find((f) => f.type === 'datetime');

  return (
    <div className="clu-card-list row justify-content-center col-md-12 p-0 m-0">
      <h4 className="clu-heading text-center mb-4 col-md-12 ">{g.title}</h4>

      {/* Same search box, same g.searchInput/handleSearchChange/submitSearch
          the table template uses — no re-implementation. */}
      <div className="clu-search-wrap mb-3">
        <input
          type="text"
          className="clu-search-input"
          placeholder="Search..."
          value={g.searchInput}
          onChange={(e) => g.handleSearchChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && g.submitSearch()}
        />
        <button type="button" className="clu-search-btn" onClick={g.submitSearch}>
          <i className="fa fa-search"></i>
        </button>
      </div>

      {g.loading ? (
        <div className="clu-state text-center text-muted py-4">
          <i className="fa fa-spinner fa-spin mr-2"></i> Loading...
        </div>
      ) : g.error ? (
        <div className="clu-state text-center text-danger py-4">{g.error}</div>
      ) : g.rows.length === 0 ? (
        <div className="clu-state text-center text-muted py-4">No results found.</div>
      ) : (
        <div className="clu-list">
          {g.rows.map((item, idx) => {
            const rowId = g.getRowId(item) ?? `row-${idx}`;
            const token = typeof window !== 'undefined' ? window.btoa(String(rowId)) : String(rowId);
            const seeMoreHref = `${customProfilePath}?${schema.entity}_dataNode=${token}`;

            // "Follow" is a real mutation, same as any other row action —
            // routes through g.handleRunAction, the SAME dispatcher
            // EntityRowOptions calls elsewhere, which itself funnels
            // through actionsRegistry.js. Register a `toggle_follow` key
            // there for whatever "follow" means in this module; swap the
            // key/label logic for your own domain (e.g. row.status
            // instead of row.is_following).
            const isFollowing = !!item.is_following;

            return (
              <div key={rowId} className="clu-card">
                {avatarField && (
                  <MosyImageViewer
                    media={`/api/mediaroom?media=${btoa(item[avatarField.key] || '')}`}
                    mediaRoot=""
                    defaultLogo={avatarField.defaultLogo || defaultLogo}
                    imageClass="clu-avatar"
                  />
                )}

                <div className="clu-card-body">
                  {titleField && <div className="clu-card-title">{item[titleField.key]}</div>}
                  {subtitleField && <div className="clu-card-subtitle">{item[subtitleField.key]}</div>}
                  {metaField && <div className="clu-card-meta">{item[metaField.key]}</div>}
                </div>

                <div className="clu-card-actions">
                  <Link href={seeMoreHref} className="clu-see-more">
                    See More
                  </Link>
                  <button
                    type="button"
                    className={`clu-follow-btn ${isFollowing ? 'clu-following' : ''}`}
                    onClick={() => g.handleRunAction('toggle_follow', item)}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                  {/* Same dropdown SmartGrid's row_count column renders —
                      resolves EVERY schema.profileActions entry flagged
                      rowAction: true (Delete, Clone, View, anything else
                      this schema defines), not just See More/Follow. Wired
                      to the exact same g.handleRowEvent/g.handleRunAction
                      the table template uses — no separate delete-confirm
                      logic written here. */}
                  <EntityRowOptions
                    schema={schema}
                    row={item}
                    profilePath={customProfilePath}
                    onChildDataOut={g.handleRowEvent}
                    onRunAction={g.handleRunAction}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="clu-pagination-wrap">
        <EntityPaginationUi
          page={g.page}
          pageCount={g.pageCount}
          onPageChange={g.setPage}
          pageSize={g.pageSize}
          onPageSizeChange={g.setPageSize}
        />
      </div>
    </div>
  );
}