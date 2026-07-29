import { MosyCard, closeMosyCard } from "../components/MosyCard";
import React, { useEffect, useState } from "react";

// This should be declared once in a shared scope
let mosyNotifyTimer = null;

function clearMosyTimer() {
  if (mosyNotifyTimer) {
    clearTimeout(mosyNotifyTimer);
    mosyNotifyTimer = null;
  }
}

/**
 * MosyAlertCard
 *
 * Example:
 *
 * MosyAlertCard({
 *   icon: "trash",
 *   iconColor: "text-danger",
 *   message: "Delete this record?",
 *   yesLabel: "Delete",
 *   noLabel: "Cancel",
 *   yesColor: "danger",
 *   noColor: "secondary",
 *   yesOutline: false,
 *   noOutline: true,
 *   onYes: () => {
 *     console.log("Deleted");
 *   }
 * });
 */

export function MosyAlertCard({
  icon = "bell",
  iconColor = "text-danger",

  message = "Are you sure?",

  yesLabel = "Yes",
  noLabel = "No",

  // Button colors
  yesColor = "primary",
  noColor = "secondary",

  // Solid / outline
  yesOutline = false,
  noOutline = true,

  onYes,
  onNo,

  dismissable = true,
  autoDismissOnClick = true,

  id = "smartmodaldefaultId",
}) {
  clearMosyTimer();

  function handleYes() {
    if (typeof onYes === "function") {
      onYes();
    }

    if (autoDismissOnClick) {
      closeMosyCard();
    }
  }

  function handleNo() {
    if (typeof onNo === "function") {
      onNo();
    }

    if (autoDismissOnClick) {
      closeMosyCard();
    }
  }

  const showYes =
    yesLabel &&
    yesLabel.toLowerCase() !== "none";

  const showNo =
    noLabel &&
    noLabel.toLowerCase() !== "none";

  /*
  |--------------------------------------------------------------------------
  | Bootstrap button classes
  |--------------------------------------------------------------------------
  */

  const yesButtonClass = yesOutline
    ? `btn btn-outline-${yesColor}`
    : `btn btn-${yesColor}`;

  const noButtonClass = noOutline
    ? `btn btn-outline-${noColor}`
    : `btn btn-${noColor}`;

  /*
  |--------------------------------------------------------------------------
  | Buttons
  |--------------------------------------------------------------------------
  */

  const buttonRow = (showYes || showNo) ? (
    <div className="row justify-content-center mt-4 border-top border_set pt-3 p-0 mx-0">
  
      {/* YES BUTTON */}
      {showYes && (
        <div className="col-lg-4 col-md-4 col-5 p-0">
          <button
            type="button"
            className={`${yesButtonClass} mosy-alert-btn w-100`}
            onClick={handleYes}
          >
            {yesLabel}
          </button>
        </div>
      )}
  
      {/* SPACING BETWEEN BUTTONS */}
      {showYes && showNo && (
        <div className="col-2  p-0"></div>
      )}
  
      {/* NO BUTTON */}
      {showNo && (
        <div className="col-lg-4 col-md-4 col-5 p-0">
          <button
            type="button"
            className={`${noButtonClass} mosy-alert-btn w-100`}
            onClick={handleNo}
          >
            {noLabel}
          </button>
        </div>
      )}
  
    </div>
  ) : null;

  /*
  |--------------------------------------------------------------------------
  | Render card
  |--------------------------------------------------------------------------
  */

  return MosyCard(
    "",
    <>
      <div className="mosy-alert-card">
        {/* Icon */}

        <div className="mosy-alert-icon-wrapper">
          <div
            className="fancy-gradient-spinner"
            title="Alert"
          >
            <i
              className={`fa fa-${icon} large_icon ${iconColor}`}
            ></i>
          </div>
        </div>

        {/* Message */}

        <div className="mosy-alert-content">
          <p className="mosy-alert-message">
            {message}
          </p>
        </div>

        {/* Buttons */}

        {buttonRow}
      </div>
      <style jsx global>{`
  .mosy-alert-btn {
    min-height: 40px;

    border-radius: 8px;

    font-size: 13.5px;
    font-weight: 600;

    line-height: 1.4;

    transition:
      transform 120ms ease,
      box-shadow 150ms ease,
      background-color 150ms ease,
      border-color 150ms ease;
  }

  .mosy-alert-btn:hover {
    transform: translateY(-1px);
  }

  .mosy-alert-btn:active {
    transform: scale(0.98);
  }

  @media (max-width: 576px) {
    .mosy-alert-btn {
      min-height: 38px;

      padding: 7px 10px;

      font-size: 13px;
    }
  }
`}</style>
      <style jsx global>{`
        /*
        |--------------------------------------------------------------------------
        | ALERT
        |--------------------------------------------------------------------------
        */

        .mosy-alert-card {
          width: 100%;
          padding: 24px 24px 20px;
        }

        /*
        |--------------------------------------------------------------------------
        | ICON
        |--------------------------------------------------------------------------
        */

        .mosy-alert-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;

          width: 100%;
        }

        /*
        |--------------------------------------------------------------------------
        | MESSAGE
        |--------------------------------------------------------------------------
        */

        .mosy-alert-content {
          text-align: center;
        }

        .mosy-alert-message {
          margin: 18px 0 22px;

          color: #334155;

          font-size: 14px;
          font-weight: 400;

          line-height: 1.6;
        }

        /*
        |--------------------------------------------------------------------------
        | ACTIONS
        |--------------------------------------------------------------------------
        */

        .mosy-alert-actions {
          display: flex;

          align-items: center;
          justify-content: center;

          gap: 12px;

          padding-top: 16px;

          border-top:
            1px solid rgba(15, 23, 42, 0.07);
        }

        /*
        |--------------------------------------------------------------------------
        | BUTTON
        |--------------------------------------------------------------------------
        */

        .mosy-alert-btn {
          min-width: 120px;

          border-radius: 8px;

          font-size: 13.5px;

          font-weight: 600;

          line-height: 1.4;

          transition:
            transform 120ms ease,
            box-shadow 150ms ease,
            background-color 150ms ease,
            border-color 150ms ease;
        }

        .mosy-alert-btn:hover {
          transform: translateY(-1px);
        }

        .mosy-alert-btn:active {
          transform: translateY(0) scale(0.98);
        }

        /*
        |--------------------------------------------------------------------------
        | MOBILE
        |--------------------------------------------------------------------------
        */

        @media (max-width: 576px) {
          .mosy-alert-card {
            padding: 20px 18px 18px;
          }

          .mosy-alert-actions {
            gap: 8px;
          }

          .mosy-alert-btn {
            flex: 1;

            min-width: 0;
          }
        }
      `}</style>
    </>,
    dismissable,
    id
  );
}

/*
|--------------------------------------------------------------------------
| NOTIFY
|--------------------------------------------------------------------------
*/

export function MosyNotify({
  message = "Done!",
  icon = "info-circle",
  iconColor = "text-primary",
  duration = 5000,
  addTimer = true,
  id = "smartmodaldefaultId",
}) {
  clearMosyTimer();

  console.log(
    `Notify DynamicModal`,
    id,
    message
  );

  MosyCard(
    "",
    <div className="row col-md-12 justify-content-center">
      <div
        className="fancy-gradient-spinner"
        title="Notice"
      >
        <i
          className={`fa fa-${icon} medium_icon ${iconColor}`}
        ></i>
      </div>

      <div className="text-center col-md-12 p-2">
        <p className="mt-3">
          {message}
        </p>
      </div>
    </div>,
    true,
    id
  );

  if (addTimer) {
    mosyNotifyTimer = setTimeout(() => {
      closeMosyCard();

      mosyNotifyTimer = null;
    }, duration);
  }
}

/*
|--------------------------------------------------------------------------
| CLOSE MODAL
|--------------------------------------------------------------------------
*/

export function closeMosyModal() {
  closeMosyCard();

  clearMosyTimer();
}

/*
|--------------------------------------------------------------------------
| CONFIRM
|--------------------------------------------------------------------------
*/

export function MosyConfirm({
  icon = "warning",
  iconColor = "text-danger",
  message = "Are you sure?",
  yesLabel = "Yes",
  noLabel = "Cancel",

  yesColor = "danger",
  noColor = "secondary",

  onYes = () => {},
  onNo = () => {},
}) {
  MosyCard(
    "",
    <>
      <div className="text-center">
        <i
          className={`fa fa-${icon} ${iconColor} display-4`}
        ></i>

        <p className="mt-3">
          {message}
        </p>
      </div>

      <div className="text-center mt-4">
        <button
          className={`btn btn-${yesColor} mx-2`}
          onClick={() => {
            onYes();
            closeMosyCard();
          }}
        >
          {yesLabel}
        </button>

        <button
          className={`btn btn-${noColor} mx-2`}
          onClick={() => {
            onNo();
            closeMosyCard();
          }}
        >
          {noLabel}
        </button>
      </div>
    </>
  );
}

/*
|--------------------------------------------------------------------------
| SNACK WIDGET
|--------------------------------------------------------------------------
*/

export function MosySnackWidget({
  content = "Snacky Snack!",
  curr_position = "bottom",
  snack_pos = "30px",
  snackId = "mosy_snack_1",
  color = "#fff",
  bg = "#333",
  duration = 3000,
  onClickFun = () => {},
  pushTo = null,
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);

    const timer = setTimeout(() => {
      setShow(false);
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const stylePosition = {
    position: "fixed",

    [curr_position]: snack_pos,

    left: "50%",

    transform: "translateX(-50%)",

    background: bg,

    color: color,

    padding: "16px",

    borderRadius: "4px",

    zIndex: 9999,

    minWidth: "250px",

    textAlign: "center",

    visibility: show
      ? "visible"
      : "hidden",

    animation: show
      ? "fadein 0.5s, fadeout 0.5s ease-in-out 2.5s"
      : "",
  };

  return (
    <>
      <div
        id={snackId}
        style={stylePosition}
        onClick={() => {
          onClickFun();
        }}
      >
        {content}
      </div>

      <style jsx>{`
        @keyframes fadein {
          from {
            ${curr_position}: 0;
            opacity: 0;
          }

          to {
            ${curr_position}: ${snack_pos};
            opacity: 1;
          }
        }

        @keyframes fadeout {
          from {
            ${curr_position}: ${snack_pos};
            opacity: 1;
          }

          to {
            ${curr_position}: 0;
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}