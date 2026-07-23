'use client';
import { MosyAlertCard, MosyNotify, closeMosyModal } from '../../../MosyUtils/ActionModals';
import { deleteUrlParam } from '../../../MosyUtils/hiveUtils';

// interpretEntityRowEvent — generic stand-in for what used to be three
// separate per-table functions (InteprateTasksEvent, popDeleteDialog,
// DeleteTasks in TasksRequestHandler.jsx). MosySmartDropdownActions'
// handleEdit/handleDelete both just package up an event object and hand
// it to whatever callBack you give them — this is that callBack, written
// once, driven by the schema-aware controller instead of a hardcoded
// table name and a hand-written DELETE call.
//
// Covers the two action shapes MosySmartDropdownActions actually
// produces: `select_<entity>` (View more) and `delete_<entity>` (Delete).
// It does NOT handle cross-entity drill-down links (Client Details, Deal
// Details, etc. from schema.rowLinks) — those still bubble up raw via
// onChildDataOut for a parent to interpret, since dispatching into a
// DIFFERENT entity's own list/profile is a bigger master-detail decision
// than "refactor this dropdown" covers. Ask if you want that built out
// too — it would follow the same registry pattern as rowLinksRegistry.js.
//
// Usage (wired as EntityRowOptions' onChildDataOut, typically from
// TestGrid so every grid gets working Edit/Delete for free):
//   interpretEntityRowEvent(data, g)   // g = useEntityGridController(...) result
export function interpretEntityRowEvent(data, controller) {
  if (!data?.actionType) return; // rowLinks clicks resolve their own payload shape — not ours to interpret

  if (data.actionType === 'select') {
    // MosySmartDropdownActions always builds a merged URL (data.url) and
    // hands you data.router — soft-navigate there. (The old code branched
    // on whether a profileUrl was set to decide reload-vs-soft-nav; both
    // branches ended up calling the same callBack shape, so there's
    // nothing to branch on here — just navigate.)

    console.log('select inentotyyy ___ ', data);
    if (data.router && data.url) {
      data.router.push(data.url, { scroll: false });
    }
    return;
  }

  if (data.actionType === 'delete') {
    // Dynamic — driven entirely by whichever schema this dropdown/grid
    // was wired up with. No per-entity copy of this file needed, and no
    // more leftover strings from whatever module this was cloned from.
    const entityLabel = controller.schema?.label || controller.schema?.entity || 'record';
    const entityLabelLower = entityLabel.toLowerCase();

    MosyAlertCard({
      icon: 'trash',
      message: `Are you sure you want to delete this record?`,
      autoDismissOnClick: false,
      onYes: async () => {
        // Dismiss the confirm dialog immediately, then let the notify
        // below carry the "in progress" feedback while the request runs.
        closeMosyModal('modal1');
        MosyNotify({ message: `Sending delete request...`, icon: 'send', addTimer: false });

        try {
          // controller.remove() (EntityDataEngine) resolves to
          // { ok, message } — never { status: 'success' }. Checking
          // response.status here meant this branch NEVER matched, so
          // every delete — even ones that succeeded server-side — fell
          // through to the error branch below.
          const response = await controller.remove(data.token);

          if (response?.ok) {
            MosyNotify({
              message: response.message || `Record deleted successfully`,
              icon: 'check-circle',
              iconColor: 'text-success',
            });
            return response;
          }

          console.error(`Error deleting ${controller.schema?.entity || 'record'}:`, response?.message);
          MosyNotify({
            message: response?.message || `Failed to delete ${entityLabelLower}`,
            icon: 'times-circle',
            iconColor: 'text-danger',
          });
          return response;
        } catch (err) {
          console.error('Error:', err);
          MosyNotify({
            message: err.message || `Failed to delete ${entityLabelLower}`,
            icon: 'times-circle',
            iconColor: 'text-danger',
          });
          return null;
        }
      },
      onNo: () => {
        closeMosyModal('modal1');
        deleteUrlParam(`${controller.schema?.entity}_delete`);
      },
    });
  }
}