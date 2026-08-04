'use client';

export default function AccessDenied({ moduleName = "", reason = "" }) 
{
  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-light">

      <div className="row justify-content-center w-100">
        <div className="col-md-6 col-lg-5 border_set border-bottom">

          <div className="card border-0 rounded-4 text-center bg-light p-5 position-relative">

            <div className="mb-4">
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle"
                style={{
                  width: "90px",
                  height: "90px",
                  backgroundColor: "#f8f9fa",
                  boxShadow: "inset 0 4px 10px rgba(0,0,0,0.05)"
                }}
              >
                <i
                  className="fa fa-lock text-danger"
                  style={{
                    fontSize: "36px",
                  }}
                ></i>
              </div>
            </div>

            <h4 className="fw-semibold text-dark mb-3">
              {moduleName} Access Denied
            </h4>

            <p className="text-muted mb-4">
              {reason || "Please contact your system administrator for assistance."}
            </p>

            <div className="col-md-12">
              <button
                className="btn d-none medium_btn rounded-pill px-4"
                onClick={() => window.history.back()}
              >
                <i className="fa fa-arrow-left mr-2"></i>
                Go Back
              </button>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}