"use client";

export default function CoordinatePicker({ values, setValue }) {
  const lat = values.latitude ?? '';
  const lng = values.longitude ?? '';
  const coordinates = values.coordinates ?? '';

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue('latitude', position.coords.latitude.toFixed(6));
        setValue('longitude', position.coords.longitude.toFixed(6));
        setValue('coordinates', `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
      },
      () => alert("Unable to retrieve your location.")
    );
  };

  return (
    <div className="container-fluid p-0">
      <div className="mb-2">
        <label className="form-label fw-semibold">
          Coordinates <span className="text-danger">*</span>{" "}
          <small className="text-muted">(latitude, longitude)</small>
        </label>

        <div className="row g-2">
          <div className="col-md">
            <label className="visually-hidden">Latitude</label>
            <input
              type="text"
              className="form-control rounded-3"
              value={lat}
              onChange={(e) => setValue('latitude', e.target.value)}
              placeholder="-1.2921"
            />
          </div>
          <div className="col-md">
            <label className="visually-hidden">Longitude</label>
            <input
              type="text"
              className="form-control rounded-3"
              value={lng}
              onChange={(e) => setValue('longitude', e.target.value)}
              placeholder="36.8219"
            />
          </div>
          <div className="col-md d-none">
            <input
              type="hidden"
              className="form-control rounded-3"
              value={coordinates}
              onChange={(e) => setValue('coordinates', e.target.value)}
              placeholder="36.8219"
            />
          </div>          
          <div className="col-md pt-1 ">

            <button type="button" className="mt-4 btn btn-light border rounded-3 px-4 w-100 h-100" onClick={handleUseLocation}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" className="bi bi-crosshair me-2 text-primary" viewBox="0 0 16 16">
                <path d="M8 0a.5.5 0 0 1 .5.5V2a6 6 0 0 1 5.5 5.5H15.5a.5.5 0 0 1 0 1H14A6 6 0 0 1 8.5 14v1.5a.5.5 0 0 1-1 0V14A6 6 0 0 1 2 8.5H.5a.5.5 0 0 1 0-1H2A6 6 0 0 1 7.5 2V.5A.5.5 0 0 1 8 0Zm0 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3Zm0 2.5A2.5 2.5 0 1 1 8 10.5 2.5 2.5 0 0 1 8 5.5Z" />
              </svg>
              <span className="fw-semibold text-primary">Use my location</span>
            </button>
          </div>
        </div>
      </div>

      <div className="alert alert-warning py-2 px-3 mb-0 rounded-3 d-flex align-items-center" role="alert">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" className="bi bi-exclamation-circle-fill me-2 flex-shrink-0" viewBox="0 0 16 16">
          <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM7.002 4a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm.93 2.481a.5.5 0 0 0-.858.514l.35 3.5a.5.5 0 0 0 .996 0l.35-3.5a.5.5 0 0 0-.838-.514z" />
        </svg>
        <small>Stand at the centre of the site, outdoors, before picking your location.</small>
      </div>
    </div>
  );
}