// systemUsersActions.js
//
// review_account opens ReviewAccountCard through the project's existing
// MosyCard/closeMosyCard util (same one MosyAlertCard/MosyNotify already
// use) instead of window.prompt or a custom modal host. Nothing extra
// needs to be mounted — MosyCard is already rendered globally wherever
// your app already uses MosyNotify/MosyAlertCard.
//
// Same {ok, message, reload} return contract EntityDataEngine's
// runAction/runRowAction already normalize — nothing in
// actionsRegistry.js or the engine needs to change.

import { closeMosyCard, MosyCard } from '../../../components/MosyCard';
import { MosyNotify } from '../../../MosyUtils/ActionModals';
import { mosyPostData, mosyBtoa, mosyGetPrimaryKey } from '../../../MosyUtils/hiveUtils'; // adjust path to match your project
import ReviewAccountCard from './ReviewAccountCard';

const CARD_ID = 'modal1';

// Opens the card via MosyCard and resolves once the person approves,
// rejects, or cancels. renderCard() is called again on submit (busy=true)
// so MosyCard just re-renders the same body with a disabled/"Saving…"
// state — the same pattern MosyNotify uses to swap spinner -> check icon.
function openReviewAccountCard({ row, schema, submitApproval, submitRejection, rejectLabel="Reject Application", approveLabel="Approve Account" }) {
  return new Promise((resolve) => {
    const renderCard = (busy) => {
      MosyCard(
        `Review ${row.name} Account | Current status : ${row.account_status}`,
        <ReviewAccountCard
          row={row}
          busy={busy}
          onApprove={async (payload) => {
            renderCard(true);
            const result = await submitApproval(payload);
            closeMosyCard(CARD_ID);
            MosyNotify({ message: result.message, icon: 'check-circle', iconColor: 'text-success' });

            resolve(result);
          }}
          onReject={async () => {
            renderCard(true);
            const result = await submitRejection();
            closeMosyCard(CARD_ID);
            MosyNotify({ message: result.message, icon: 'times-circle', iconColor: 'text-success' });
            resolve(result);
          }}
          onCancel={() => {
            closeMosyCard(CARD_ID);
            resolve({ ok: true, reload: false });
          }}
          rejectLabel={rejectLabel}
          approveLabel={approveLabel}
        />,
        !busy, // dismissable — lock the backdrop while a submit is in flight
        CARD_ID,
        "mosycard_wide"
      );
    };
    renderCard(false);
  });
}

export async function reviewUserAcc(rows, schema, rejectLabel, approveLabel) {

  const row = rows?.[0];

  if (!row) {
    return {
      ok: false,
      message: "Select an account to review first.",
      reload: false
    };
  }


  const primkeyValue =
    mosyGetPrimaryKey(schema, row);


  if (!primkeyValue) {
    return {
      ok: false,
      message: "Could not resolve this row's primary key.",
      reload: false
    };
  }


  const dataNodeKey =
    `${schema.entity}_dataNode`;


  const dataNode =
    mosyBtoa(String(primkeyValue));


  /*
  |--------------------------------------------------------------------------
  | APPROVE ACCOUNT
  |--------------------------------------------------------------------------
  |
  | ReviewAccountCard returns:
  |
  | {
  |   role_id,
  |   role_name,
  |   regions,
  |   clusters
  | }
  |
  */

  const submitApproval = async ({
    role_id,
    role_name,
    regions,
    clusters
  }) => {

    /*
    |--------------------------------------------------------------------------
    | Validate role
    |--------------------------------------------------------------------------
    */

    if (!role_id) {

      return {
        ok: false,
        message: "Please select a role.",
        reload: false
      };

    }


    /*
    |--------------------------------------------------------------------------
    | Update user
    |--------------------------------------------------------------------------
    */

    const res = await mosyPostData({

      url: schema.apiBase,

      method: "PUT",

      data: {

        [dataNodeKey]:
          dataNode,

        account_status:
          "approved",

        /*
        |--------------------------------------------------------------------------
        | Store role ID + readable role name
        |--------------------------------------------------------------------------
        */

        user_role:
          role_id,

        user_role_name:
          role_name,

          regions:
          regions,
      
        clusters:
          clusters,

      },

    });


    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res?.status === "success"

      ? {
          ok: true,

          message:
            `${row.name || "Account"} approved and assigned ${role_name} role`
        }

      : {
          ok: false,

          message:
            res?.message ||
            "Failed to approve account — try again.",

          reload: false
        };

  };


  /*
  |--------------------------------------------------------------------------
  | REJECT ACCOUNT
  |--------------------------------------------------------------------------
  */

  const submitRejection = async () => {

    const res = await mosyPostData({

      url: schema.apiBase,

      method: "PUT",

      data: {

        [dataNodeKey]:
          dataNode,

        account_status:
          "rejected"

      },

    });


    return res?.status === "success"

      ? {
          ok: true,
          message:
            `${row.name || "Account"} rejected.`
        }

      : {
          ok: false,

          message:
            res?.message ||
            "Failed to reject account — try again.",

          reload: false
        };

  };


  /*
  |--------------------------------------------------------------------------
  | Open review card
  |--------------------------------------------------------------------------
  */

  return openReviewAccountCard({
    row,
    schema,
    submitApproval,
    submitRejection,
    rejectLabel,
    approveLabel  
  });

}