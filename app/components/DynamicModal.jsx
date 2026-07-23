"use client";
import React, { useState, useEffect, useRef } from 'react';
import { registerModal } from './MosyCard';

function DynamicModal({ id = "smartmodaldefaultId", zIndex }) {

  const [modalProps, setModalProps] = useState(null);
  const modalRef = useRef();

  //console.log(`DynamicModal `, id , modalProps)

  useEffect(() => {
    registerModal(
      (props) => {
        try {
          setModalProps(props);
        } catch (err) {
          console.error("Error setting modal props:", err, props);
        }
      },
      () => setModalProps(null),
      id
    );
  }, [id]);
  

  useEffect(() => {
    if (modalProps) document.body.classList.add('modal-open');
    else document.body.classList.remove('modal-open');
  }, [modalProps]);

  const handleOutsideClick = (e) => {
    if (
      modalProps?.dismissOnOutsideClick &&
      modalRef.current &&
      !modalRef.current.contains(e.target)
    ) {
      setModalProps(null);
    }
  };

  if (!modalProps) return null;

  return (
    <>
      <div className="modal-backdrop fade show dm-backdrop"
        style={{ zIndex: (modalProps?.zIndex || zIndex || 1055) - 10 }}
      ></div>
      <div
        className="modal fade show dm-modal"
        tabIndex="-1"
        role="dialog"
        style={{ display: 'block', zIndex: modalProps?.zIndex || zIndex || 1055 }}
        onMouseDown={handleOutsideClick}
      >

        <div
          className={`modal-dialog modal-dialog-centered mosycard_scrollable dm-dialog ${modalProps?.modalClass || ""}`}
          role="document"
        >
          <div className="modal-content dm-content" ref={modalRef}>
            <span className="dm-accent-bar" aria-hidden="true"></span>

            <div className="modal-header dm-header">
              <h6 className="modal-title dm-title">
                {modalProps.title}
              </h6>
              <button
                type="button"
                className="dm-close-btn"
                onClick={() => setModalProps(null)}
                aria-label="Close"
              >
                <i className="fa fa-times"></i>
              </button>
            </div>
            <div className="modal-body dm-body">
              {modalProps.body}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .dm-backdrop {
          background: rgba(15, 18, 26, 0.5);
          -webkit-backdrop-filter: blur(4px);
          backdrop-filter: blur(4px);
        }

        .dm-dialog {
          animation: dm-pop 0.18s ease-out;
        }

        @keyframes dm-pop {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .dm-content {
          position: relative;
          border: none;
          border-radius: 14px;
          overflow: hidden;
          background: #ffffff;
          box-shadow:
            0 20px 40px -12px rgba(0, 0, 0, 0.18),
            0 0 0 1px rgba(0, 0, 0, 0.04);
        }

        /* accent strip — swap this color per modal type if useful */
        .dm-accent-bar {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: #4f46e5;
        }

        .dm-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 1rem 1.25rem 1rem 1.6rem;
          background: #fafafa;
          border-bottom: 1px solid #ececee;
        }

        .dm-title {
          margin: 0;
          font-weight: 600;
          font-size: 1rem;
          letter-spacing: -0.01em;
          color: #16181d;
          line-height: 1.3;
        }

        .dm-close-btn {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          padding: 0;
          border: 1px solid #e4e4e7;
          border-radius: 999px;
          background: #ffffff;
          color: #6b7280;
          font-size: 0.8rem;
          line-height: 1;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
        }

        .dm-close-btn i {
          display: block;
        }

        .dm-close-btn:hover {
          background: #f4f4f5;
          border-color: #d4d4d8;
          color: #16181d;
        }

        .dm-close-btn:active {
          transform: scale(0.92);
        }

        .dm-body {
          padding: 1.4rem 1.6rem;
          margin: 0;
          max-height: 78vh;
          overflow-y: auto;
          background: #fff;
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
        }

        .dm-body:hover {
          scrollbar-color: #d4d4d8 transparent;
        }

        .dm-body::-webkit-scrollbar {
          width: 6px;
        }

        .dm-body::-webkit-scrollbar-track {
          background: transparent;
        }

        .dm-body::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 999px;
        }

        .dm-body:hover::-webkit-scrollbar-thumb {
          background: #d4d4d8;
        }
      `}</style>
    </>
  );
}

export default DynamicModal;