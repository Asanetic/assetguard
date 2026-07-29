"use client";

import { useState } from "react";
import {
  X,
  Volume2,
} from "lucide-react";

export default function RegisterCompany({
  onClose,
  onSubmit,
}) {
  const purposes = [
    "Response",
    "NOC",
    "Client",
    "Installer",
    "Reseller",
    "Partner",
  ];

  const [formData, setFormData] = useState({
    companyName: "",
    purposes: [],
    email: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const togglePurpose = (purpose) => {
    setFormData((prev) => {
      const exists = prev.purposes.includes(purpose);

      return {
        ...prev,
        purposes: exists
          ? prev.purposes.filter((item) => item !== purpose)
          : [...prev.purposes, purpose],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.companyName.trim()) {
      alert("Enter company name");
      return;
    }

    if (formData.purposes.length === 0) {
      alert("Select at least one company purpose");
      return;
    }

    if (!formData.email.trim()) {
      alert("Enter contact email");
      return;
    }

    if (!formData.phone.trim()) {
      alert("Enter phone number");
      return;
    }

    try {
      setLoading(true);

      // Toggle state stays an array internally (simplest for the
      // .includes()/filter logic above) — converted to a CSV string only
      // here, at the submission boundary, to match the storage
      // convention the rest of the schema-driven form uses (comma-
      // separated in a plain text column, same as MainPurposePills.jsx).
      const payload = {
        ...formData,
        purposes: formData.purposes.join(','),
      };

      if (onSubmit) {
        await onSubmit(payload);
      } else {
        console.log("Register company:", payload);
      }
    } catch (error) {
      console.error("Company registration failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="register-company-page">
        {/* Header */}
        <div className="register-company-header">
          <h1>Register company</h1>

          <button
            type="button"
            className="header-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form
          className="register-company-form"
          onSubmit={handleSubmit}
        >
          {/* Company Name */}
          <div className="mb-3">
            <label
              htmlFor="companyName"
              className="company-form-label"
            >
              COMPANY NAME
            </label>

            <input
              id="companyName"
              name="companyName"
              type="text"
              className="form-control company-input"
              placeholder="e.g. Acme Security Ltd"
              value={formData.companyName}
              onChange={handleChange}
            />
          </div>

          {/* Purpose */}
          <div className="mb-3">
            <label className="company-form-label">
              MAIN PURPOSE{" "}
              <span className="text-lowercase">
                (select one or more)
              </span>
            </label>

            <div className="d-flex flex-wrap gap-2">
              {purposes.map((purpose) => {
                const selected =
                  formData.purposes.includes(purpose);

                return (
                  <button
                    key={purpose}
                    type="button"
                    className={`purpose-chip ${
                      selected
                        ? "purpose-chip-active"
                        : ""
                    }`}
                    onClick={() =>
                      togglePurpose(purpose)
                    }
                  >
                    {purpose}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Email */}
          <div className="mb-3">
            <label
              htmlFor="email"
              className="company-form-label"
            >
              CONTACT EMAIL
            </label>

            <input
              id="email"
              name="email"
              type="email"
              className="form-control company-input"
              placeholder="ops@company.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          {/* Phone */}
          <div className="mb-3">
            <label
              htmlFor="phone"
              className="company-form-label"
            >
              PHONE NUMBER
            </label>

            <input
              id="phone"
              name="phone"
              type="tel"
              className="form-control company-input"
              placeholder="+254 ..."
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn register-company-btn w-100"
            disabled={loading}
          >
            {loading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                />

                Registering...
              </>
            ) : (
              "Register company"
            )}
          </button>
        </form>
      </div>

      <style jsx>{`
        .register-company-page {
          width: 100%;
          min-height: 100vh;
          background: #ffffff;
          position: relative;
          color: #183967;
        }

        /* ================================
           HEADER
        ================================= */

        .register-company-header {
          height: 52px;
          background: #183967;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 14px;
        }

        .register-company-header h1 {
          margin: 0;
          padding: 0;
          color: #ffffff;
          font-size: 15px;
          font-weight: 700;
          line-height: 1;
        }

        .header-close-btn {
          width: 32px;
          height: 32px;
          padding: 0;
          border: none;
          outline: none;
          background: transparent;
          color: #c8d8ee;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: 0.2s ease;
        }

        .header-close-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.08);
        }

        /* ================================
           FORM
        ================================= */

        .register-company-form {
          padding: 28px 14px 90px;
        }

        .company-form-label {
          text-align: left;
          display: block;
          margin-bottom: 5px;
          color: #49678f;
          font-size: 10px;
          line-height: 1.2;
          font-weight: 800;
          letter-spacing: 0.15px;
        }

        .company-input {
          height: 38px;
          border: 1px solid #dbe3ee;
          border-radius: 10px;
          padding: 0 12px;
          color: #233c5e;
          font-size: 12px;
          box-shadow: none;
          background: #ffffff;
        }

        .company-input::placeholder {
          color: #6f7e91;
          opacity: 1;
        }

        .company-input:focus {
          border-color: #3772f6;
          box-shadow: 0 0 0 3px rgba(55, 114, 246, 0.1);
        }

        /* ================================
           PURPOSE CHIPS
        ================================= */

        .purpose-chip {
          min-height: 29px;
          padding: 5px 12px;
          border: 1px solid #dbe3ee;
          border-radius: 20px;
          background: #ffffff;
          color: #183967;
          font-size: 11px;
          font-weight: 600;
          line-height: 1;
          transition: all 0.15s ease;
        }

        .purpose-chip:hover {
          border-color: #3772f6;
          background: #f5f8ff;
        }

        .purpose-chip-active {
          border-color: #3772f6;
          background: #3772f6;
          color: #ffffff;
        }

        .purpose-chip-active:hover {
          background: #2862e6;
          color: #ffffff;
        }

        /* ================================
           SUBMIT BUTTON
        ================================= */

        .register-company-btn {
          height: 44px;
          margin-top: 4px;
          border: none;
          border-radius: 10px;
          background: #316cf4;
          color: #ffffff;
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .register-company-btn:hover {
          background: #2861df;
          color: #ffffff;
        }

        .register-company-btn:active {
          transform: scale(0.99);
        }

        .register-company-btn:disabled {
          background: #7398ef;
          cursor: not-allowed;
        }

        /* ================================
           FLOATING AUDIO BUTTON
        ================================= */

        .sound-floating-btn {
          position: fixed;
          right: 10px;
          bottom: 20px;
          width: 44px;
          height: 44px;
          padding: 0;
          border: 1px solid #ffb9b9;
          border-radius: 50%;
          background: #ffffff;
          color: #ff4141;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
          z-index: 100;
          transition: all 0.15s ease;
        }

        .sound-floating-btn:hover {
          background: #fff7f7;
          transform: scale(1.04);
        }

        /* ================================
           MOBILE
        ================================= */

        @media (max-width: 576px) {
          .register-company-form {
            padding-left: 14px;
            padding-right: 14px;
          }
        }
      `}</style>
    </>
  );
}