import { useState } from "react";

function LinkedContactRow({ row, values, setValue }) {
    const [options, setOptions] = useState([]);
  
    useEffect(() => {
      fetch(row.endpoint || '/api/assetguard/contacts')
        .then(r => r.json())
        .then(d => setOptions(d.data || d || []));
    }, [row.endpoint]);
  
    const handleSelect = (e) => {
      const contactId = e.target.value;
      const match = options.find(o => String(o.id) === contactId);
      setValue(row.nameField, contactId);
      setValue(row.phoneField, match?.phone ?? '');
      setValue(row.emailField, match?.email ?? '');
    };
  
    return (
      <div className="row mb-3">
        <div className="col-md-4">
          <label>{row.label}{row.required && ' *'}</label>
          <select className="form-control" value={values[row.nameField] || ''} onChange={handleSelect}>
            <option value="">Select name</option>
            {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div className="col-md-4">
          <label className="text-muted">Phone (auto-filled)</label>
          <input className="form-control" value={values[row.phoneField] || ''} readOnly />
        </div>
        <div className="col-md-4">
          <label className="text-muted">Email (auto-filled)</label>
          <input className="form-control" value={values[row.emailField] || ''} readOnly />
        </div>
      </div>
    );
  }