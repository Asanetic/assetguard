'use client';

import React, { useEffect, useState , useRef  } from 'react';
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

import {MosyFilterEngine, MosySecureFilterEngine} from "../DataControl/MosyFilterEngine";
import { mosyPostFormData, mosyGetData, mosyUpdateUrlParam, mosyUrlParam, magicRandomStr, mosySetLSData, mosyGetLSData, deleteUrlParam, mosyFormatDateOnly, mosyFormatDateTime, magicTrimText, mosyTogglePassword, mosyFileUrl } from '../../MosyUtils/hiveUtils';

import {MosyCard, closeMosyCard } from "../../components/MosyCard";   

import { mosyInputProps, mosyCellClass } from './formControlEngine';
import { MosyExtendLiveSearch } from './customUI';
import { useBillingAccountStatus } from '../../mosybilling/BillingMonitor';
import { PremiumDataBtn } from '../../mosybilling/PremuimBtn';

import { hiveRoutes } from '../../appConfigs/hiveRoutes';
import { useDropdownNavigation } from '../AppCore/appGlobalUtils';

const DEFAULT_BASE = hiveRoutes.hiveBaseRoute; // default root if none passed

function isComponentEnabled(tblName, actionType = 'cu') {
 // console.log(`isComponet enabledddddddddd ${tblName} --- ${actionType}`)
  const disabledDeleteTables = ["device_list","system_role_bundles", "system_users"];
  
  const [action, table] = tblName.includes(':') ? tblName.split(':') : [actionType, tblName];

  if (action === "delete" && disabledDeleteTables.includes(table)) {
    return false;
  }

  if (actionType === "delete" && disabledDeleteTables.includes(tblName)) {
    return false;
  }

  if (action === "add_new" && disabledDeleteTables.includes(table)) {
    return false;
  }

  if (action === "clone" && disabledDeleteTables.includes(table)) {
    return false;
  }

  if (action === "paginate" && disabledDeleteTables.includes(table)) {
    return false;
  }
  
  //disable edit and delete for DevicelistMainProfilePage table
  if(tblName=="sales_order_payments" && action!="DDdelete"){return false}

  //disable edit and delete for sale_order_payments table
  if(tblName=="sales_order_items" && action!="DDedit"){return false}
  if(tblName=="sales_order_items" && action!="DDdelete"){return false}

  if(tblName=="FarmersMainProfilePage" && action!="DDedit")
  {
    return false
  }

  if(tblName=="SmsmessagesMainProfilePage" && action!="DDedit")
  {
    return false
  }

  if(tblName=="SmsmessagesList" && action==="add_new")
  {
    return false
  }

  return true;
}


export  function DeleteButton({src, tblName, uptoken, stateItemSetters, parentStateSetters, router = null, onDelete}) {
  if (!uptoken) return null;

  const handleClick = () => {
    // You can override delete logic if needed
    if (typeof onDelete === "function") {
      onDelete(uptoken, { childStateSetters: stateItemSetters, parentStateSetters}, router);
    } else {
      // Fallback to global dialog handler
      popDeleteDialog(uptoken, {
        childStateSetters: stateItemSetters,
        parentStateSetters: parentStateSetters,
      });
    }
  };
  const billingStatus = useBillingAccountStatus();
  //  Don't render buttons if billing is not active
  if (billingStatus !== "Active") {
    return <PremiumDataBtn  buttonName='Manage data'/>;
  }

  if(!isComponentEnabled(src,"delete"))
  {
    return null
  }

  return (
    <button
      type="button"
      className="medium_btn border border-danger text-danger p-2 mr-3 ml-1 mb-3 hive_profile_nav_del_btn"
      onClick={handleClick}
    >
      <i className="fa fa-trash"></i> Delete
    </button>
  );
}


export function SubmitButtons({src, tblName, extraClass = '' }) {
  const searchParams = useSearchParams();
  const isUpdate = searchParams.has(`${tblName}_dataNode`);

  function handleCloneClick(e) {
    const actionInput = document.getElementById(`${tblName}_mosy_action`);
    if (actionInput) {
      actionInput.value = `add_${tblName}`;
    }
  }

  const billingStatus = useBillingAccountStatus();
  //  Don't render buttons if billing is not active
  if (billingStatus !== "Active") {
    return <PremiumDataBtn  buttonName='Manage data'/>;
  }

  const isCloneEnabled = isComponentEnabled(src, "clone")
  const isButtontEnabled = isComponentEnabled(src, "submit")

  if(!isButtontEnabled)
  {
    return null
  }

  return (
    <>
      {isUpdate ? (
        <>
          <button
            type="submit"
            id={`mp${tblName}_update_btn`}
            name={`mp${tblName}_update_btn`}
            className="btn btn-primary"
          >
            <i className="fa fa-save"></i> Save Changes
          </button>

         {isCloneEnabled &&(
          <button
            type="submit"
            id={`mp${tblName}_insert_btn`}
            name={`mp${tblName}_insert_btn`}
            className={`ml-lg-3 ${extraClass} mt-lg-0 mt-4 btn border border_set text-dark`}
            onClick={handleCloneClick}
          >
            <i className="fa fa-copy"></i> Clone Record
          </button>
         )}
        </>
      ) : (
        <button
          type="submit"
          id={`mp${tblName}_insert_btn`}
          name={`mp${tblName}_insert_btn`}
          className="btn btn-primary"
        >
          <i className="fa fa-check"></i> Proceed
        </button>
      )}
    </>
  );
}



// Add New Button
export function AddNewButton({src, link, label, icon = 'plus', className = 'medium_btn btn-primary border border_set hive_profile_add_new_btn p-2 ml-1 mr-1 ' }) {

  const billingStatus = useBillingAccountStatus();
  //  Don't render buttons if billing is not active
  if (billingStatus !== "Active") {
    return <PremiumDataBtn  buttonName='Add new'/>;
  }

  if(!isComponentEnabled(src,"add_new"))
    {
      return null
    }  
  return (
    <a href={link} className={className}>
      <i className={`fa fa-${icon}`}></i> {label}
    </a>
  );
}

// File Upload
export function MosyFileUploadButton({ tblName, attribute }) {
  if (!isComponentEnabled(tblName, 'upload')) return null;

  const fileId = `file${tblName}_${attribute}`;
  const fileLabelId = `file_name_${tblName}_${attribute}`;

  return (
    <div className="col-md-12 pt-3 p-0">
      <em id={fileLabelId} className="trim_text badge"></em>
      <label className="text-primary border border_set cpointer medium_btn pr-3 pl-3 bg-white">
        <i className="fa fa-upload mr-2"></i> Choose File
        <input
          type="file"
          id={fileId}
          name={fileId}
          style={{ display: 'none' }}
          onChange={(e) => {
            const val = e.target.value.replace('C:\\fakepath\\', '');
            document.getElementById(fileLabelId).innerText = val;
          }}
        />
      </label>
    </div>
  );
}


export function MosySmartDropdownActions({ tblName, attributes = '', callBack = () => {}, setters={}}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [dataKey, profileUrl = '', skipEdit] = attributes.split(':');
  const token = btoa(dataKey);

  const getMergedUrl = (isDelete = false) => {
    let baseUrl = profileUrl?.trim();

    // Build query string
    const params = new URLSearchParams(
      baseUrl ? '' : searchParams.toString() // Only use current params if profileUrl is blank
    );

    params.set(`${tblName}_dataNode`, token);
    if (isDelete) {
      params.set(`${tblName}_delete`, '0');
    }

    const finalBase = baseUrl || pathname;
    return `${finalBase}?${params.toString()}`;
  };

  const handleEdit = () => {
    const url = getMergedUrl(false);
  
    if (!profileUrl?.trim()) {
      // If profileUrl is null or empty, reload the current page with the new query
      //window.location.href = url; // This forces a full page reload
      callBack({
        qstr:`where primkey='${dataKey}'`,
        actionType: `select`,
        actionName : `select_${tblName}`,
        token: dataKey,
        profile : profileUrl,
        url : url,
        router : router,
        setters : setters
      })

      //router.push(url);
      //router.push(url, { scroll: false });

    } else {
      // If profileUrl is defined, do a soft navigation
      callBack({
        qstr:`where primkey='${dataKey}'`,
        actionType: `select`,
        actionName : `select_${tblName}`,
        token: dataKey,
        profile : profileUrl ,
        url : url,
        router : router,
        setters : setters
       
      })

      ///router.push(url);
      //router.push(url, { scroll: false });
    }
  };

  const handleDelete = () => {
    const url = getMergedUrl(true);
  
    if (!profileUrl?.trim()) {
      //window.location.href = url;
      //mosyUpdateUrlParam()
      callBack({
        qstr:`where primkey='${dataKey}'`,
        actionType: `delete`,
        actionName : `delete_${tblName}`,
        token: dataKey,
        profile : profileUrl ,
        url : url,
        router : router,
        setters : setters
       
      })      
      //router.push(url);
      //router.push(url, { scroll: false });

    } else {
      
      callBack({
        qstr:`where primkey='${dataKey}'`,
        actionType: `delete`,
        actionName : `delete_${tblName}`,
        token: dataKey,
        profile : profileUrl ,
        url : url,
        router : router ,
        setters : setters   
      }) 
      
      //router.push(url);
      //router.push(url, { scroll: false });

    }
  };

  let  deleteBtn =       
  (<a className="mosy_msdn cpointer" onClick={handleDelete}>
    <i className="fa fa-trash"></i> Delete
  </a>)

  let editBtn = (
        <a className="mosy_msdn cpointer" onClick={handleEdit}>
        <i className="fa fa-edit"></i> View more
      </a>)

  
  const enabledStatus = 'Enabled'; // Or your real toggle logic
  if (enabledStatus !== 'Enabled') return null;

  const canEdit = isComponentEnabled(tblName, 'DDedit');
  const canDelete = isComponentEnabled(tblName, 'DDdelete');

  if(!canEdit){
    editBtn =null
  }
  if(!canDelete){
    deleteBtn =null
  }

  return (
    <>
    {editBtn}
    {deleteBtn}

    </>
  );

}

export function MosyGridRowOptions({
  source="",
  label = 'View',
  icon = 'edit',
  action="",
  dataIn = {},   // can be value OR function
  className = '',
  callBack = () => {},
}) {
  const handleClick = () => {
    const value = typeof dataIn === 'function' ? dataIn() : dataIn;
    if (typeof callBack === 'function') {
      callBack(value);
    }
  };
  const renderBtn = isComponentEnabled("action", action);

  if(!renderBtn){

    return null
  }

  return (
    <a className={`mosy_msdn cpointer ${className}`} onClick={handleClick}>
      {icon && <i className={`fa fa-${icon} mr-1`}></i>} {label}
    </a>
  );
}


export function MosyImageViewer({
  media,
  defaultLogo,
  imageClass = "rounded_avatar",
  forceImg = false,
  defaultSize = "",
}) {

  const borderStyle_ = defaultSize ? "" : "border";

  const apiMedia = `${DEFAULT_BASE}${media}`;

  const isMediaAvailable =
    apiMedia &&
    typeof apiMedia === "string" &&
    apiMedia.trim() !== "" &&
    !apiMedia.trim().endsWith("?media=");

  const isQueryPath = isMediaAvailable && media.includes("?media=");

  const finalMediaPath = isQueryPath
    ? apiMedia
    : isMediaAvailable
    ? `/storage/${media}`
    : defaultLogo;

  // 🔥 NEW: metadata state
  const [fileMeta, setFileMeta] = useState({
    name: "",
    ext: "",
    type: "",
    loaded: false,
  });

  // 🚀 Fetch headers ONLY (lightweight)
  useEffect(() => {
    if (!isMediaAvailable) return;

    fetch(finalMediaPath, { method: "HEAD" }) // ⚡ HEAD = no file download
      .then((res) => {
        const name = decodeURIComponent(res.headers.get("X-File-Name") || "");
        const ext = res.headers.get("X-File-Ext") || "";
        const type = res.headers.get("X-File-Type") || "";

        setFileMeta({
          name,
          ext,
          type,
          loaded: true,
        });
      })
      .catch(() => {
        setFileMeta((prev) => ({ ...prev, loaded: true }));
      });
  }, [finalMediaPath]);

  const handleImageClick = (path) => {
    MosyCard("", <MosyImageViewer media={apiMedia} imageClass="product_image" />);
  };

  // 🔥 Derived types (no guessing anymore)
  const isImage = fileMeta.type.startsWith("image/");
  const isPDF = fileMeta.type === "application/pdf";

  // 🖼️ IMAGE
  if (isMediaAvailable && isImage) {
    return (
      <img
        src={finalMediaPath}
        onClick={() => handleImageClick(finalMediaPath)}
        className={`cpointer ${borderStyle_} ${imageClass}`}
        alt={fileMeta.name || "image"}
      />
    );
  }

  // 📄 PDF (inline preview)
  // if (isMediaAvailable && isPDF) {
  //   return (
  //     <iframe
  //       src={finalMediaPath}
  //       style={{ width: "100%", height: "400px", borderRadius: "10px" }}
  //       title={fileMeta.name}
  //     />
  //   );
  // }

  const getIcon = (type) => {
    if (type.includes("pdf")) return "fa-file-text";
    if (type.includes("word")) return "fa-copy";
    if (type.includes("excel")) return "fa-file-text text-success";
    return "fa-paperclip";
  };

  if (isMediaAvailable && fileMeta.loaded && !isImage && !forceImg) {

    const isSmallThumb = imageClass === "small_thumbnail";
  
    //  SMALL THUMBNAIL MODE → ICON ONLY
    if (isSmallThumb) {
      return (
        <div
          className={`d-flex  align-items-center justify-content-center ${borderStyle_} ${imageClass}`}
          style={{
            width: "60px",   // match your image size
            height: "60px",
            borderRadius: "10px",
          }}
          onClick={() => window.open(finalMediaPath, "_blank")}
          title={magicTrimText(fileMeta.name)}
        >
          <i
            className={`fa ${getIcon(fileMeta.type)} cpointer`}
            style={{ fontSize: "22px" }}
          ></i>
        </div>
      );
    }
// 🧾 NORMAL MODE (HIGH VIBE UI)
return defaultSize ? (
  <div
    className="d-flex align-items-center justify-content-center cpointer"
    style={{
      height: "80px",
    }}
    title={magicTrimText(fileMeta.name)}
    onClick={() => window.open(finalMediaPath, "_blank")}
  >
    <i
      className={`fa ${getIcon(fileMeta.type)}`}
      style={{ fontSize: "42px", opacity: 0.85 }}
    ></i>
  </div>
) : (
  <a
    href={finalMediaPath}
    target="_blank"
    rel="noopener noreferrer"
    className="d-block text-center elforge_file_card_v1"
  >
    <div className="elforge_file_inner">
      
      {/* ICON */}
      <div className="elforge_file_icon">
        <i className={`fa ${getIcon(fileMeta.type)}`}></i>
      </div>

      {/* NAME */}
      <div className="elforge_file_name">
        {magicTrimText(fileMeta.name, 70, 70)}
      </div>

      {/* ACTION */}
      <div className="elforge_file_action">
        <i className="fa fa-download"></i> Download
      </div>

    </div>
  </a>
);
  }


  // 🔁 Safe fallback image
  if (forceImg && isMediaAvailable && isImage) {
    return (
      <img
        src={finalMediaPath}
        className={`cpointer ${borderStyle_} ${imageClass}`}
        alt="fallback"
      />
    );
  }

  // 🧱 Default
  return (
    <img
      src={defaultLogo}
      className={`cpointer ${borderStyle_} ${imageClass}`}
      alt="default"
    />
  );
}

export function mosyToCamelCase(str) {
  return str.replace(/_([a-z])/g, function (_, char) {
    return char.toUpperCase();
  });
}


export function SmartDropdown({
  apiEndpoint,
  idField,
  labelField,
  inputName = 'smart_input',
  label = 'Select or type an option',
  onSelect,
  defaultValue = '',
  readOnly = false,
}) {
  const [options, setOptions] = useState([]);
  const [selectedValue, setSelectedValue] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(true);

  const groupByField = mosyToCamelCase(labelField);

  // Tracks the last value THIS component pushed out via onSelect. When a
  // new defaultValue comes in that matches this, it's just our own state
  // bouncing back down through the parent — not a real external change —
  // so the seed effect below skips it instead of resetting mid-type.
  const lastEmitted = useRef(defaultValue);
  const seeded = useRef(false);

  // Fetch options ONCE per endpoint. No longer depends on defaultValue,
  // so typing/selecting never re-triggers a network call.
  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const res = await mosyGetData({
          endpoint: apiEndpoint,
          params: {
            groupBy: btoa(`${groupByField}`),
            src: btoa(`${inputName}`),
          },
        });
        if (cancelled) return;
        if (res.status === 'success') {
          setOptions(res.data || []);
        } else {
          console.error('API Error:', res.message);
        }
      } catch (err) {
        if (!cancelled) console.error('Fetch failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiEndpoint]);

  // Seed/re-seed from an external defaultValue — first mount, or a real
  // change (e.g. async record load resolving after this component
  // already rendered). Skips it entirely if defaultValue === the value we
  // ourselves last emitted, so the user's own typing/selecting never gets
  // overwritten by its own echo.
  useEffect(() => {
    if (defaultValue === lastEmitted.current && seeded.current) return;
    if (!defaultValue) { seeded.current = true; return; }

    const isInOptions = options.some((item) => item[labelField] === defaultValue);
    setSelectedValue(defaultValue);
    setCustomInput(defaultValue);
    setIsCustom(!isInOptions && options.length > 0 ? true : isCustom);
    lastEmitted.current = defaultValue;
    seeded.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValue, options]);

  const handleSelectChange = (e) => {
    const val = e.target.value;
    lastEmitted.current = val;
    setIsCustom(false);
    setSelectedValue(val);
    setCustomInput(val);
    onSelect?.(val);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    lastEmitted.current = val;
    setCustomInput(val);
    onSelect?.(val);
  };

  const toggleCustomInput = () => {
    setIsCustom((prev) => !prev);
  };

  if (readOnly) {
    return (
      <>
        <label className="text-left">{label}</label>
        <div className="form-control dyn-input-static">
          {customInput || selectedValue || '—'}
        </div>
      </>
    );
  }

  return (
    <>
      <label className="cpointer text-left">
        {label}
        <span className="pr-2">{' '}</span> |
        {!isCustom ? (
          <span onClick={toggleCustomInput} className="text-primary ms-2 badge">
            <i className="ml-2 fa fa-plus"></i> Add new
          </span>
        ) : (
          <span onClick={toggleCustomInput} className="text-primary ms-2 badge">
            <i className="ml-2 fa fa-list"></i> Use options
          </span>
        )}
      </label>
      {!isCustom ? (
        <select
          className="form-control"
          name={inputName}
          value={selectedValue}
          onChange={handleSelectChange}
        >
          <option value="">
            {selectedValue ? selectedValue : `-- Select ${label}--`}
          </option>
          {options.map((item) => (
            <option key={item[idField] || item[labelField]} value={item[labelField]}>
              {item[labelField]}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          className="form-control mb-2"
          placeholder={`Type new ${label}`}
          name={inputName}
          value={customInput}
          onChange={handleInputChange}
        />
      )}
    </>
  );
}

function shoutFieldMismatch({ parentTable, hiddenInputName, field, item }) {
  const message =
    `LiveSearchDropdown config error on "${parentTable}.${hiddenInputName}"\n\n` +
    `Field "${field}" was not found on the result object returned by the API.\n\n` +
    `Available keys: ${Object.keys(item || {}).join(', ') || '(none — item was empty)'}\n\n` +
    `Check the schema's valueField/displayField for a typo (stray quote, ` +
    `wrong column name) or confirm the endpoint actually returns that column.`;

  console.log('[LiveSearchDropdown] FIELD MISMATCH', {
    parentTable, hiddenInputName, field, item, availableKeys: Object.keys(item || {}),
    message
  });

  if (typeof window !== 'undefined') {
   // window.alert(message);
  }
}

export function LiveSearchDropdown({
  apiEndpoint,
  tblName = 'q',
  parentTable = "p",
  inputName = 'live_search',
  hiddenInputName = 'selected_id',
  label = 'Search & select an option',
  onSelect,
  onSelectFull,
  displayField = 'name',
  valueField = 'id',
  defaultValue = null,
  onInputChange,
  defaultColSize = "col-md-4",
  cellOverrides = {},
  inputOverrides = {},
  context = {},
  labelClassName = "",
  mosyFilterOptions = {},
  customDisplay = "" }) {

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef(null);
  const shoutedRef = useRef(new Set()); // avoid re-alerting on every render for the same broken config

  const formatCustomDisplay = (template, item) => {
    if (!template) return item[displayField] ?? '';
    return template.replace(/{{(.*?)}}/g, (_, key) => item[key.trim()] ?? '');
  };

  // Set default value on mount — same loud check applies here, since a
  // bad valueField in a saved/seeded record is just as dangerous as a bad
  // one on fresh selection.
  useEffect(() => {
    if (!defaultValue) return;

    const hasValue = Object.prototype.hasOwnProperty.call(defaultValue, valueField);
    if (!hasValue) {
      const shoutKey = `mount:${valueField}`;
      if (!shoutedRef.current.has(shoutKey)) {
        shoutedRef.current.add(shoutKey);
        shoutFieldMismatch({ parentTable, hiddenInputName, field: valueField, item: defaultValue });
      }
      return; // don't seed a broken default — better empty than silently wrong
    }

    if (defaultValue[valueField]) {
      setSelected(defaultValue);
      setQuery(defaultValue[displayField] ?? '');
    }
  }, [defaultValue, valueField, displayField, parentTable, hiddenInputName]);

  // Perform live search
  useEffect(() => {
    setLoading(true);
    setHasSearched(true);

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const encodedQuery = btoa(query);
      const customParams = { [`q${tblName}`]: encodedQuery, ...mosyFilterOptions };
      const queryFilterStr = MosySecureFilterEngine(tblName, customParams);

      try {
        const res = await mosyGetData({
          endpoint: apiEndpoint,
          params: {
            ...queryFilterStr,
            src: btoa(`${parentTable} - ${hiddenInputName}`),
          },
        });

        if (res.status === 'success') {
          setResults(res.data || []);
        } else {
          console.error('API error:', res);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [query, apiEndpoint, tblName]);

  const handleSelect = (item) => {
    const hasValueField = Object.prototype.hasOwnProperty.call(item, valueField);
    const hasDisplayField = Object.prototype.hasOwnProperty.call(item, displayField);

    if (!hasValueField) {
      shoutFieldMismatch({ parentTable, hiddenInputName, field: valueField, item });
      return; // hard stop — do not call onSelect with undefined
    }
    if (!hasDisplayField) {
      shoutFieldMismatch({ parentTable, hiddenInputName, field: displayField, item });
      return;
    }

    const displayValue = item[displayField] ?? '';
    setSelected(item);
    setQuery(displayValue);

    if (onSelect) onSelect(item[valueField]);
    if (onSelectFull) onSelectFull(item);

    if (onInputChange) {
      onInputChange({ target: { name: hiddenInputName, value: item[valueField] } });
      onInputChange({ target: { name: inputName, value: displayValue } });
    }
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setSelected(null);
    if (onInputChange) onInputChange(e);
  };

  const { activeIndex, handleKeyDown } = useDropdownNavigation(
    results,
    (item) => {
      // Keyboard-select path was calling onSelectFull directly, bypassing
      // handleSelect's validation entirely — that's a second silent hole
      // for the exact same bug. Route it through handleSelect instead so
      // Enter/arrow-select gets the same loud guard as a mouse click.
      handleSelect(item);
    }
  );

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setTimeout(() => setIsFocused(false), 150);

  const cellClass = mosyCellClass(parentTable, hiddenInputName, context, cellOverrides);
  const inputProps = mosyInputProps(parentTable, hiddenInputName, context, inputOverrides);
  const createNewCellClass = mosyCellClass(parentTable, `${hiddenInputName}_create_new`, context, cellOverrides);

  return (
    <div className={`form-group ${defaultColSize} text-left p-0 m-0 hive_data_cell ${cellClass}`}>
      <div className="col-md-12 p-0 m-0" id="">
        <div className="form-group position-relative p-0 m-0">
          <label className={`${labelClassName} text-left`}>{label}</label>
          <input
            type="text"
            className="form-control"
            name={inputName}
            id={inputName}
            autoComplete="off"
            value={query}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={`Search ${label}...`}
            onKeyDown={handleKeyDown}
            {...inputProps}
          />

          {isFocused && (
            <ul
              className="list-group position-absolute w-100 bg-white shadow"
              style={{ maxHeight: '220px', overflowY: 'auto', zIndex: 9 }}
            >
              {loading && (
                <li className="list-group-item text-muted">
                  <i className="fa fa-spinner fa-spin me-2"></i> Searching...
                </li>
              )}

              {!loading && results.length > 0 && results.map((item, idx) => (
                <li
                  key={`${item[valueField]}=${magicRandomStr()}`}
                  className={`list-group-item list-group-item-action ${idx === activeIndex ? "active text-white" : ""}`}
                  onClick={() => handleSelect(item)}
                  style={{ cursor: 'pointer' }}
                >
                  {customDisplay ? formatCustomDisplay(customDisplay, item) : item[displayField]}
                </li>
              ))}

              {!loading && results.length === 0 && hasSearched && (
                <li className="list-group-item text-muted p-2">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="d-flex align-items-center badge">
                      <i className="fa fa-info-circle mr-2"></i> No results found
                    </span>
                    <u onClick={() => setIsFocused(false)} style={{ cursor: 'pointer' }} className="text-danger badge pr-2">
                      <i className="fa fa-times-circle me-1"></i> Close
                    </u>
                  </div>
                </li>
              )}

              <li
                className={`list-group-item list-group-item-action text-primary ${createNewCellClass} hide_livesearch_add_new`}
                style={{ cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => {
                  setTimeout(() => setIsFocused(false), 50);
                  MosyExtendLiveSearch({ table: tblName, label, query, context, hiddenInputName, parentTable });
                  setIsFocused(false);
                }}
              >
                <i className="fa fa-plus me-2 text-success"></i>
                <span className="badge">{'Add new'}</span>
              </li>
            </ul>
          )}

          {selected && (
            <input type="hidden" name={hiddenInputName} value={selected[valueField]} onChange={onInputChange} />
          )}
        </div>
      </div>
    </div>
  );
}



export function MosySmartField({
  module,
  field,
  label,
  value = "",
  onChange = () => {},
  context = {},
  inputOverrides = {},
  cellOverrides = {},
  placeholder = "",
  type = "text", // can be 'text', 'textarea', 'email', 'password', etc.
  inputIdPrefix = "",
}) {
  const cellClass = mosyCellClass(module, field, context, cellOverrides);
  const inputProps = mosyInputProps(module, field, context, inputOverrides);
  const inputId = `${inputIdPrefix}${field}`;

  let finalValue = value;

  if (type === "date") {
    finalValue = mosyFormatDateOnly(value);
  }

  if (type === "datetime-local") {
    finalValue = mosyFormatDateTime(value);
  }

  return (
    <div className={`form-group hive_data_cell ${cellClass}`}>
      {label && (
        <label
          htmlFor={inputId}
          id={`label_${module}_${inputId}`}
          name={`label_${module}_${inputId}`}
        >
          {label}
        </label>
      )}

      {type === "textarea" ? (
        <textarea
          className="form-control mosy_text_area"
          id={inputId}
          name={inputId}
          value={finalValue}
          onChange={onChange}
          placeholder={placeholder || label}
          {...inputProps}
        />
      ) : (
        <>
          <input
            className="form-control"
            id={inputId}
            name={inputId}
            value={finalValue}
            onChange={onChange}
            placeholder={placeholder || label}
            type={type}
            {...inputProps}
          />
          {type === "password" && (
            <div className="form-check mt-2">
              <input
                type="checkbox"
                className="form-check-input"
                id={`show_${inputId}`}
                onChange={() => mosyTogglePassword(inputId)}
              />
              <label
                htmlFor={`show_${inputId}`}
                className="form-check-label text-muted"
                style={{ cursor: "pointer", fontSize: "0.9em" }}
              >
                Show Password
              </label>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function MosySmartDataField({
  module,
  field,
  label,
  value = "",
  onChange = () => {},
  context = {},
  inputOverrides = {},
  cellOverrides = {},
  placeholder = "",
  type = "text", // can be 'text', 'textarea', 'email', 'password', etc.
  inputIdPrefix = "",
}) {
  const cellClass = mosyCellClass(module, field, context, cellOverrides);
  const inputProps = mosyInputProps(module, field, context, inputOverrides);
  const inputId = `${inputIdPrefix}${field}`;

  let finalValue = value;

  if (type === "date") {
    finalValue = mosyFormatDateOnly(value);
  }

  if (type === "datetime-local") {
    finalValue = mosyFormatDateTime(value);
  }

  return (
    <div className={`form-group hive_data_cell ${cellClass}`}>
      {label && (
        <label
          htmlFor={inputId}
          id={`label_${module}_${inputId}`}
          name={`label_${module}_${inputId}`}
        >
          {label}
        </label>
      )}

      {type === "textarea" ? (
        <textarea
          className="form-control mosy_text_area"
          id={inputId}
          name={inputId}
          defaultValue={finalValue}
          onChange={onChange}
          placeholder={placeholder || label}
          {...inputProps}
        />
      ) : (
        <>
          <input
            className="form-control"
            id={inputId}
            name={inputId}
            defaultValue={finalValue}
            onChange={onChange}
            placeholder={placeholder || label}
            type={type}
            {...inputProps}
          />
          {type === "password" && (
            <div className="form-check mt-2">
              <input
                type="checkbox"
                className="form-check-input"
                id={`show_${inputId}`}
                onChange={() => mosyTogglePassword(inputId)}
              />
              <label
                htmlFor={`show_${inputId}`}
                className="form-check-label text-muted"
                style={{ cursor: "pointer", fontSize: "0.9em" }}
              >
                Show Password
              </label>
            </div>
          )}
        </>
      )}
    </div>
  );
}


/*
|--------------------------------------------------------------------------
| COMPONENT
|--------------------------------------------------------------------------
*/

export function MosySelectField({

  label = "",
  name = "",
  value = "",
  options = [],
  onChange = null,
  colClass = "col-md-12"

}){

  const [selectedValue,setSelectedValue] =
      useState(value || "");

  /*
  |--------------------------------------------------------------------------
  | SYNC PARENT VALUE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

      setSelectedValue(
          value || ""
      );

  }, [value]);

  return (

      <div
      className={`form-group ${colClass} hive_data_cell`}
      >

          <label>

              {label}

          </label>

          <select
          name={name}
          id={name}
          className="form-control"

          value={selectedValue}

          onChange={(e) => {

              setSelectedValue(
                  e.target.value
              );

              if(onChange){

                  onChange(e);

              }

          }}
          >

              <option value="">

                  {`Select ${label}`}

              </option>

              {options.map(function(option,index){

                  /*
                  |--------------------------------------------------------------------------
                  | STRING MODE
                  |--------------------------------------------------------------------------
                  */

                  if(typeof option === "string"){

                      return (

                          <option
                          key={option}
                          value={option}
                          >

                              {option}

                          </option>

                      );

                  }

                  /*
                  |--------------------------------------------------------------------------
                  | OBJECT MODE
                  |--------------------------------------------------------------------------
                  */

                  return (

                      <option
                      key={option.value}
                      value={option.value}
                      >

                          {option.label}

                      </option>

                  );

              })}

          </select>

      </div>

  );

}


export function MosyPaginationUi({
  src="",
  tblName = "",
  totalPages = 0,
  onPageSwitch = () => {},
  onPageSizeChange = () => {},
  stateItemSetters={},
  pageSizeOptions = [2, 5, 10, 20, 50, 100, 250, 500, 1000, 5000, 10000000000]
}) {

  //console.log(`page setter incc`, stateItemSetters)
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  
  useEffect(() => {
    const pageParam = searchParams.get(`q${tblName}_page`);
    if (pageParam) {
      const parsed = Number(pageParam);
      if (!isNaN(parsed)) {
        setCurrentPage(parsed);
      }
    }
  }, [searchParams, tblName]);

  const [currentPageSize, setCurrentPageSize] = useState(20); // default fallback

useEffect(() => {
  const savedSize = mosyGetLSData("systemDataLimit");
  if (savedSize) {
    setCurrentPageSize(savedSize);
  }
}, []);


  function onPageChange(nextPage) {
    mosyUpdateUrlParam(`q${tblName}_page`, nextPage);
    onPageSwitch(nextPage);
    stateItemSetters.setLocalEventSignature(magicRandomStr())
  }

  function handlePageSizeChange(e) {
    const newSize = parseInt(e.target.value);
    mosySetLSData("systemDataLimit", newSize)
    stateItemSetters.setLocalEventSignature(magicRandomStr())
    setCurrentPageSize(newSize)
    deleteUrlParam(`q${tblName}_page`)

    onPageSizeChange(newSize);
  }

  const renderPageNumbers = () => {
    const pageNumbersSet = new Set();
    const pageNumbers = [];
  
    const firstPages = [1, 2, 3, 4].filter(p => p <= totalPages);
    const lastPages = [totalPages - 3, totalPages - 2, totalPages - 1, totalPages].filter(p => p >= 1 && p > 4);
  
    // Collect first pages
    firstPages.forEach(p => pageNumbersSet.add(p));
  
    // Collect previous 2 pages
    [2, 1].forEach(offset => {
      const page = currentPage - offset;
      if (page > 0 && page <= totalPages) {
        pageNumbersSet.add(page);
      }
    });
  
    // Current page
    if (currentPage > 0 && currentPage <= totalPages) {
      pageNumbersSet.add(currentPage);
    }
  
    // Next 2 pages
    [1, 2].forEach(offset => {
      const page = currentPage + offset;
      if (page > 0 && page <= totalPages) {
        pageNumbersSet.add(page);
      }
    });
  
    // Collect last pages
    lastPages.forEach(p => pageNumbersSet.add(p));
  
    // Sort all numbers
    const sortedNumbers = Array.from(pageNumbersSet).sort((a, b) => a - b);
  
    // Insert ellipses for gaps
    for (let i = 0; i < sortedNumbers.length; i++) {
      const current = sortedNumbers[i];
      const prev = sortedNumbers[i - 1];
      if (i > 0 && current - prev > 1) {
        pageNumbers.push("...");
      }
      pageNumbers.push(current);
    }
  
    // Render logic
    return pageNumbers.map((item, index) => {
      if (item === "...") {
        return (
          <li key={`ellipsis-${index}`} className="page-item disabled">
            <span className="page-link">...</span>
          </li>
        );
      }
  
      return (
        <li key={item} className={`page-item ${item === currentPage ? 'active' : ''}`}>
          <button type="button" className="page-link" onClick={() => onPageChange(item)}>
            {item}
          </button>
        </li>
      );
    });
  };
  
  const billingStatus = useBillingAccountStatus();
  //  Don't render buttons if billing is not active
  if (billingStatus !== "Active") {
    return 
  }
  
  //if(isComponentEnabled(src, "paginate"))

  return (
    <div className="mt-4 mb-3 row justify-content-center col-md-12 m-0 p-0 border-top border_set pt-2">
      <nav aria-label="Page navigation" className="col-md-8">
        <div className="row justify-content-center">
          <div className="pagination-wrapper w-100">
            <ul className="pagination justify-content-center flex-nowrap" style={{ minWidth: 'max-content' }}>

              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => onPageChange(1)}>First</button>
              </li>
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => onPageChange(currentPage - 1)}>Prev</button>
              </li>

              {renderPageNumbers()}

              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => onPageChange(currentPage + 1)}>Next</button>
              </li>
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => onPageChange(totalPages)}>Last</button>
              </li>

            </ul>
          </div>
        </div>
      </nav>

      <div className="col-md-4 p-2">
      <label className="badge">{currentPageSize === 10000000000 ? 'Showing All rows' : `Show ${currentPageSize} rows per page`} | Change</label>
      <select className="rows_per_record" value={currentPageSize} onChange={handlePageSizeChange}>
        {pageSizeOptions.map(size => (
            <option key={size} value={size}>
              {size === 10000000000 ? 'Show All' : `${size}`}
            </option>
          ))}

        </select>
      </div>
    </div>
  );
}


export function MosyDateInputComponent({
  label = "Select Date",
  value,
  onChange,
  name = "date",
  required = false,
  defaultDate = new Date().toISOString().split("T")[0],
}) {
  const handleChange = (e) => {
    onChange(e.target.value);
  };

  let sanitizedDate = mosyFormatDateOnly(value) //value ? new Date(value).toISOString().split("T")[0] : defaultDate;
  
  return (
    <>
      <input
        type="date"
        className="form-control"
        name={name}
        id={name}
        value={sanitizedDate}
        onChange={handleChange}
        required={required}
      />
    </>
  );
}



export function MosyDateTimeInputComponent({
  value,
  onChange,
  name = "datetime",
  required = false,
  defaultDate = new Date().toISOString().slice(0, 16), // Default to current date and time
}) {
  const handleChange = (e) => {
    onChange(e.target.value); // Send updated date/time to the parent component
  };

  // Ensure the `value` is in the correct format (YYYY-MM-DDTHH:MM)
  const formattedValue = value || defaultDate;

  return (
    <>
      <input
        type="datetime-local"
        className="form-control"
        name={name}
        value={formattedValue} // Use formatted value
        onChange={handleChange}
        required={required}
      />
    </>
  );
}

export function MosyConfirm({
  icon = "warning",
  iconColor = "text-danger",
  message = "Are you sure?",
  yesLabel = "Yes",
  noLabel = "Cancel",
  onYes = () => {},
  onNo = () => {}
}) {
  MosyCard(
    <div className="text-center">
      <i className={`fa fa-${icon} ${iconColor} display-4`}></i>
      <p className="mt-3">{message}</p>
    </div>,

    <div className="text-center mt-4">
      <button className="btn btn-danger mx-2" onClick={() => { onYes(); closeMosyCard(); }}>
        {yesLabel}
      </button>
      <button className="btn btn-secondary mx-2" onClick={() => { onNo(); closeMosyCard(); }}>
        {noLabel}
      </button>
    </div>
  );
}


export function MosyTitleTag({ title = '' }) {
  return (
    <div className="elforge_mosy_titletag col-md-12 p-2 mt-4 mb-4 ">
      <h4 className="text-gray-800 text-lg font-semibold mb-2">{title}</h4>
      <div className="bg-dark" style={{ height: '1px' }}></div>
    </div>
  );
}


export function MosySpace({ spaceClass = '', ...rest }) {
  return <div className={`elforge_mosy_space ${spaceClass}`} {...rest}></div>;
}

export function MosyRangeSlider({
  min = 0,
  max = 100,
  step = 1,
  defaultValue = 50,
  onSlide,
  inputName = 'Adjust',
  showValue = true,
  className = '',
}) {
  const [value, setValue] = useState(defaultValue);

  const handleChange = (e) => {
    const val = Number(e.target.value);
    setValue(val);
    if (onSlide) onSlide(val);
  };

  return (
    <div className={`mosy_range_slider ${className}`}>
      <input
        id={inputName}
        name={inputName}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className="border border_set form-control"
      />
      {showValue && <span className="ml-2 font-mono">{value}</span>}
    </div>
  );
}


export function MosyActionButton({
  source = "",
  action="",
  label,
  icon,
  onClick,
  className = ''
}) {

  // master override
  const forceShowAll = true;

  // only show these when forceShowAll = false
  const sourceVisibilityWhitelist = [
    "Connect_client_action_btn",
    "Approve_payment_action_btn",
    "Delete_asset_action_btn",
  ];

  // always hide these
  const sourceVisibilityBlacklist = [
    "_view_acc_renewalsprofile_action_btn",
    "Hidden_admin_action_btn",
  ];

  // blacklist always wins
  if (
    sourceVisibilityBlacklist.includes(action)
  ) {
    return null;
  }

  // whitelist engine
  if (
    !forceShowAll &&
    !sourceVisibilityWhitelist.includes(action)
  ) {
    return null;
  }

  return (
    <a
      className={`medium_btn border border_set btn-white ml-1 mr-1 d-inline-block cpointer ${className}`}
      onClick={onClick}
    >
      {
        icon &&
        <i className={`fa fa-${icon} mr-1`}></i>
      }

      {label}
    </a>
  );
}


export function MosyDateRangeFilter({
  callBack = () => {},
  className = "",
  inputType = "date" // "date" OR "datetime-local"
}) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Formatters
  function formatDate(date) {
    return date.toISOString().split("T")[0]; // YYYY-MM-DD
  }

  function formatDateTimeLocal(date) {
    const pad = (n) => n.toString().padStart(2, "0");
    return (
      date.getFullYear() +
      "-" +
      pad(date.getMonth() + 1) +
      "-" +
      pad(date.getDate()) +
      "T" +
      pad(date.getHours()) +
      ":" +
      pad(date.getMinutes())
    ); // YYYY-MM-DDTHH:MM
  }

  useEffect(() => {
    const now = new Date();

    if (inputType === "datetime-local") {
      const formatted = formatDateTimeLocal(now);
      setStartDate(formatted);
      setEndDate(formatted);
    } else {
      const today = formatDate(now);
      setStartDate(today);
      setEndDate(today);
    }
  }, [inputType]);

  const handleProceed = () => {
    callBack({
      startDate,
      endDate,
    });
  };

  return (
    <div className={`row m-0 p-0 justify-content-center col-md-12 ${className}`}>
      
      <div className="form-group hive_data_cell col-md-6 text-left">
        <label>{inputType === "datetime-local" ? "Start date & time" : "Start date"}</label>
        <input
          type={inputType}
          className="form-control col-md-12 mr-2"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>

      <div className="form-group hive_data_cell col-md-6 text-left">
        <label>{inputType === "datetime-local" ? "End date & time" : "End date"}</label>
        <input
          type={inputType}
          className="form-control col-md-12 mr-2"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      <div className="row m-0 p-0 justify-content-end col-md-12">
        <button
          className="btn border border_set btn-primary cpointer mb-2 mr-3"
          onClick={handleProceed}
        >
          <i className="fa fa-filter mr-1"></i> Proceed
        </button>
      </div>

    </div>
  );
}



export function filterDataByDate({
  label = "Search by date",
  inputType="date",
  callBack = () => {},
} = {}) {
  MosyCard(
    "",
    <>
      <div className="col-md-12 text-left m-0 pt-2 pl-0 pr-0 pb-2">
        <span className="m-0 p-0 h4">{label}</span>
      </div>
      <MosySpace spaceClass="p-1" />
      <MosyDateRangeFilter callBack={callBack} inputType={inputType}/>
    </>
  );
}

export function getStringInitials(name) {

  if (!name) return "";
  
  var words = name.trim().split(/\s+/);
  
  if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
  }
  
  var first = words[0].charAt(0);
  var second = words[1].charAt(0);
  
  return (first + second).toUpperCase();
  
  }


