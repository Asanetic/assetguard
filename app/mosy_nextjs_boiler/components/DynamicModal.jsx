"use client";

import React, { useEffect, useRef, useState } from "react";
import { registerModal } from "./MosyCard";

function DynamicModal({
  id = "smartmodaldefaultId",
  zIndex,
}) {
  const [modalProps, setModalProps] = useState(null);
  const modalRef = useRef(null);

  /*
  |--------------------------------------------------------------------------
  | REGISTER MODAL
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    registerModal(
      (props) => {
        try {
          setModalProps(props);
        } catch (err) {
          console.error("Error setting modal props:", err, props);
        }
      },

      () => {
        setModalProps(null);
      },

      id
    );
  }, [id]);

  /*
  |--------------------------------------------------------------------------
  | LOCK PAGE SCROLLING
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!modalProps) {
      document.body.classList.remove("modal-open");
      return;
    }

    document.body.classList.add("modal-open");

    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [modalProps]);

  /*
  |--------------------------------------------------------------------------
  | ESCAPE KEY
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!modalProps) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setModalProps(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [modalProps]);

  /*
  |--------------------------------------------------------------------------
  | OUTSIDE CLICK
  |--------------------------------------------------------------------------
  */

  const handleOutsideClick = (event) => {
    if (
      modalProps?.dismissOnOutsideClick &&
      modalRef.current &&
      !modalRef.current.contains(event.target)
    ) {
      setModalProps(null);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | CLOSE
  |--------------------------------------------------------------------------
  */

  const closeModal = () => {
    setModalProps(null);
  };

  /*
  |--------------------------------------------------------------------------
  | NOT OPEN
  |--------------------------------------------------------------------------
  */

  if (!modalProps) {
    return null;
  }

  const currentZIndex =
    modalProps?.zIndex ||
    zIndex ||
    1055;

  return (
    <>
      {/* ================================================================
          BACKDROP
      ================================================================= */}

      <div
        className="modal-backdrop fade show dm-backdrop"
        style={{
          zIndex: currentZIndex - 10,
        }}
      />

      {/* ================================================================
          MODAL
      ================================================================= */}

      <div
        className="modal fade show dm-modal"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        style={{
          display: "block",
          zIndex: currentZIndex,
        }}
        onMouseDown={handleOutsideClick}
      >
        <div
          className={`
            modal-dialog
            dm-dialog
            ${modalProps?.modalClass || ""}
          `}
          role="document"
        >
          <div
            ref={modalRef}
            className="modal-content dm-content"
          >
            {/* ========================================================
                HEADER
            ========================================================= */}

            {(modalProps?.title || !modalProps?.hideClose) && (
              <div className="modal-header dm-header">

                <div className="dm-heading">

                  {modalProps?.title && (
                    <h5 className="modal-title dm-title">
                      {modalProps.title}
                    </h5>
                  )}

                  {modalProps?.subtitle && (
                    <p className="dm-subtitle">
                      {modalProps.subtitle}
                    </p>
                  )}

                </div>

                {!modalProps?.hideClose && (
                  <button
                    type="button"
                    className="dm-close-btn"
                    onClick={closeModal}
                    aria-label="Close modal"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                )}

              </div>
            )}

            {/* ========================================================
                BODY
            ========================================================= */}

            <div className="modal-body dm-body">
              {modalProps.body}
            </div>

          </div>
        </div>
      </div>

      <style jsx global>{`

        /*
        |--------------------------------------------------------------------------
        | BACKDROP
        |--------------------------------------------------------------------------
        */

        .dm-backdrop {
          background: rgba(15, 23, 42, 0.42) !important;

          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
        }


        /*
        |--------------------------------------------------------------------------
        | MODAL VIEWPORT
        |--------------------------------------------------------------------------
        |
        | This element owns the viewport.
        | It is allowed to scroll if absolutely necessary.
        |
        */

        .dm-modal {
          position: fixed !important;

          top: 0;
          left: 0;

          width: 100%;
          height: 100%;

          padding: 24px !important;

          overflow-x: hidden;
          overflow-y: auto;

          overscroll-behavior: contain;
        }


        /*
        |--------------------------------------------------------------------------
        | DIALOG
        |--------------------------------------------------------------------------
        |
        | margin:auto vertically centers small modals.
        |
        | min-height makes auto margin work correctly while still allowing
        | large modals to remain inside the viewport.
        |
        */

        .dm-dialog {
          width: calc(100% - 32px);
          max-width: 520px;

          min-height: calc(100% - 48px);

          margin: 0 auto !important;

          display: flex;

          align-items: center;
          justify-content: center;

          pointer-events: none;

          animation:
            dmModalFadeIn 180ms ease-out,
            dmModalScaleIn 240ms cubic-bezier(
              0.16,
              1,
              0.3,
              1
            );
        }


        /*
        |--------------------------------------------------------------------------
        | CONTENT
        |--------------------------------------------------------------------------
        */

        .dm-content {
          width: 100%;

          /*
           * Critical:
           * modal cannot become taller than viewport.
           */

          max-height: calc(100vh - 48px);

          display: flex !important;
          flex-direction: column !important;

          pointer-events: auto;

          overflow: hidden;

          background: #ffffff;

          border:
            1px solid
            rgba(15, 23, 42, 0.08) !important;

          border-radius: 16px !important;

          box-shadow:
            0 1px 2px rgba(0, 0, 0, 0.03),
            0 8px 24px rgba(15, 23, 42, 0.08),
            0 24px 64px rgba(15, 23, 42, 0.16) !important;
        }


        /*
        |--------------------------------------------------------------------------
        | HEADER
        |--------------------------------------------------------------------------
        |
        | flex-shrink: 0 is important.
        |
        | Body gets smaller and scrolls.
        | Header NEVER gets pushed off screen.
        |
        */

        .dm-header {
          width: 100%;

          flex: 0 0 auto !important;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 12px;

          min-height: 46px;

          padding:
            8px
            12px
            8px
            16px !important;

          margin: 0 !important;

          background: #ffffff !important;

          border-bottom:
            1px solid
            rgba(15, 23, 42, 0.06) !important;
        }


        /*
        |--------------------------------------------------------------------------
        | HEADING
        |--------------------------------------------------------------------------
        */

        .dm-heading {
          min-width: 0;
          flex: 1;
        }

        .dm-title {
          margin: 0 !important;

          color: #0f172a;

          font-size: 14px;
          font-weight: 600;

          line-height: 1.25;

          letter-spacing: -0.01em;
        }

        .dm-subtitle {
          margin: 2px 0 0;

          color: #64748b;

          font-size: 12px;

          line-height: 1.3;
        }


        /*
        |--------------------------------------------------------------------------
        | CLOSE BUTTON
        |--------------------------------------------------------------------------
        */

        .dm-close-btn {
          width: 28px;
          height: 28px;

          flex-shrink: 0;

          display: inline-flex;

          align-items: center;
          justify-content: center;

          padding: 0;

          border: none;

          border-radius: 7px;

          background: transparent;

          color: #94a3b8;

          cursor: pointer;

          outline: none;

          transition:
            color 150ms ease,
            background 150ms ease,
            transform 120ms ease;
        }

        .dm-close-btn svg {
          width: 16px;
          height: 16px;
        }

        .dm-close-btn:hover {
          color: #0f172a;

          background: #f1f5f9;
        }

        .dm-close-btn:active {
          transform: scale(0.92);
        }

        .dm-close-btn:focus-visible {
          outline:
            3px solid
            rgba(59, 130, 246, 0.15);
        }


        /*
        |--------------------------------------------------------------------------
        | SCROLLABLE BODY
        |--------------------------------------------------------------------------
        |
        | THIS IS THE IMPORTANT PART.
        |
        | min-height: 0 allows a flex child to shrink.
        | Without it, overflowing children often expand the modal instead
        | of allowing overflow-y:auto to kick in.
        |
        */

        .dm-body {
          width: 100%;

          flex: 1 1 auto;

          min-height: 0;

          padding: 0 !important;

          margin: 0 !important;

          overflow-x: hidden;
          overflow-y: auto;

          -webkit-overflow-scrolling: touch;

          overscroll-behavior: contain;

          background: #ffffff;

          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }


        /*
        |--------------------------------------------------------------------------
        | SCROLLBAR
        |--------------------------------------------------------------------------
        */

        .dm-body::-webkit-scrollbar {
          width: 6px;
        }

        .dm-body::-webkit-scrollbar-track {
          background: transparent;
        }

        .dm-body::-webkit-scrollbar-thumb {
          background: #cbd5e1;

          border-radius: 999px;
        }

        .dm-body::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }


        /*
        |--------------------------------------------------------------------------
        | ANIMATION
        |--------------------------------------------------------------------------
        */

        @keyframes dmModalFadeIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes dmModalScaleIn {
          from {
            transform:
              translateY(10px)
              scale(0.98);
          }

          to {
            transform:
              translateY(0)
              scale(1);
          }
        }


        /*
        |--------------------------------------------------------------------------
        | MOBILE
        |--------------------------------------------------------------------------
        */

        @media (max-width: 576px) {

          .dm-modal {
            padding: 12px !important;
          }

          .dm-dialog {
            width: 100%;

            min-height: calc(100% - 24px);
          }

          .dm-content {
            max-height: calc(100vh - 24px);

            border-radius: 14px !important;
          }

          .dm-header {
            min-height: 44px;

            padding:
              7px
              10px
              7px
              14px !important;
          }

          .dm-title {
            font-size: 13.5px;
          }

        }


        /*
        |--------------------------------------------------------------------------
        | REDUCED MOTION
        |--------------------------------------------------------------------------
        */

        @media (
          prefers-reduced-motion:
          reduce
        ) {

          .dm-dialog {
            animation: none !important;
          }

        }

      `}</style>
    </>
  );
}

export default DynamicModal;