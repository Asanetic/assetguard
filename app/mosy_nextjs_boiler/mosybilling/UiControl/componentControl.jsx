'use client';

import React, { useEffect, useState , useRef  } from 'react';
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

import {MosyFilterEngine} from "../DataControl/MosyFilterEngine";
import { mosyPostFormData, mosyGetData, mosyUpdateUrlParam, mosyUrlParam, magicRandomStr, mosySetLSData, mosyGetLSData, deleteUrlParam, mosyFormatDateOnly, mosyFormatDateTime, magicTrimText } from '../../MosyUtils/hiveUtils';

import {MosyCard, closeMosyCard } from "../../components/MosyCard";   

import { mosyInputProps, mosyCellClass } from './formControlEngine';

import { MosyExtendLiveSearch } from './customUI';


function isComponentEnabled(tblName, actionType = 'cu') {
  const disabledDeleteTables = ["system_role_bundles", "system_users", "client_list", "affiliates", "services"];
  const [action, table] = tblName.includes(':') ? tblName.split(':') : [actionType, tblName];

  if (action === "delete" && disabledDeleteTables.includes(table)) {
    return false;
  }

  return true;
}


export  function DeleteButton({ uptoken, stateItemSetters, parentStateSetters, router = null, onDelete}) {
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


// Submit/Proceed/Clone Buttons
export function SubmitButtons({ tblName, extraClass = '' }) {
  const searchParams = useSearchParams();
  const isUpdate = searchParams.has(`${tblName}_uptoken`);

  function handleCloneClick(e) {
    // Update the hidden input value before submitting
    const actionInput = document.getElementById(`${tblName}_mosy_action`);
    if (actionInput) {
      actionInput.value = `add_${tblName}`;
    }
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

          <button
            type="submit"
            id={`mp${tblName}_insert_btn`}
            name={`mp${tblName}_insert_btn`}
            className={`ml-lg-3 ${extraClass} mt-lg-0 mt-4 btn border border_set text-dark`}
            onClick={handleCloneClick}
          >
            <i className="fa fa-copy"></i> Clone Record
          </button>
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
export function AddNewButton({ link, label, icon = 'plus', className = 'medium_btn btn-primary border border_set hive_profile_add_new_btn p-2 mb-3 ml-1 mr-1 ' }) {
  return (
    <a href={link} className={className}>
      <i className={`fa fa-${icon}`}></i> {label}
    </a>
  );
}

// File Upload
export function MosyFileUploadButton({ tblName, attribute }) {
  if (!isComponentEnabled(tblName, 'upload')) return null;

  const fileId = `txt_${tblName}_${attribute}`;
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


export function MosySmartDropdownActions({ tblName, attributes = '',  callBack = () => {}, setters={}}) {
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

    params.set(`${tblName}_uptoken`, token);
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

  
  const enabledStatus = 'Enabled'; // Or your real toggle logic
  if (enabledStatus !== 'Enabled') return null;

  return (
    <>
      <a className="mosy_msdn cpointer" onClick={handleEdit}>
        <i className="fa fa-edit"></i> View more
      </a>
      <a className="mosy_msdn cpointer" onClick={handleDelete}>
        <i className="fa fa-trash"></i> Delete
      </a>
    </>
  );

}

export function MosyGridRowOptions({
  label = 'View',
  icon = 'edit',
  dataIn = {},
  className = '',
  callBack = () => {},
}) {
  const handleClick = () => {
    if (typeof callBack === 'function') {
      callBack(dataIn);
    }
  };

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
  forceImg = true,
  defaultSize = "",
}) {
  const isImage = (filePath) => /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(filePath);
  const borderStyle_ = defaultSize ? "" : "border";

  const isMediaAvailable = media &&
  typeof media === 'string' &&
  media.trim() !== '' &&
  !media.trim().endsWith('?media=');

  // 👇 If the path already includes ?media= treat it as a full API URL
  const isQueryPath = isMediaAvailable && media.includes('?media=');

  const finalMediaPath = isQueryPath
    ? media
    : isMediaAvailable
      ? `/storage/${media}` // Or whatever your direct storage path would be
      : defaultLogo;

    //  console.log(`isMediaAvailable`, media, isMediaAvailable)

  const handleImageClick = (path) => {
    MosyCard("",<MosyImageViewer media={media} imageClass="product_image"/>);
  };

  // 🖼️ Image File (with .jpg, .png etc.)
  if (isMediaAvailable && isImage(media)) {
    return (
      <img
        src={finalMediaPath}
        onClick={() => handleImageClick(finalMediaPath)}
        className={`cpointer ${borderStyle_} ${imageClass}`}
        alt="Uploaded media"
      />
    );
  }

  // 📎 If it's a non-image file (like .pdf, .doc etc.)
  if (isMediaAvailable && !isImage(media) && !forceImg) {
    const fileName = decodeURIComponent(media.split("/").pop());
    return defaultSize ? (
      <i
        className="fa fa-paperclip cpointer"
        style={{ fontSize: "50px" }}
        title={magicTrimText(fileName)}
        onClick={() => window.open(finalMediaPath, "_blank")}
      ></i>
    ) : (
      <a href={finalMediaPath} target="_blank" rel="noopener noreferrer" className="d-block">
        <i className="fa fa-paperclip" style={{ fontSize: "70px" }}></i>
        <br />
        {magicTrimText(fileName)}
        <hr />
        <i className="fa fa-download"></i> Download
      </a>
    );
  }

// 🔁 Force image rendering fallback 
if (forceImg && isMediaAvailable) {
  return (
    <img
      src={finalMediaPath}
      onClick={() => handleImageClick(finalMediaPath)}
      className={`cpointer ${borderStyle_} ${imageClass}`}
      alt="Fallback logo"
    />
  );
}


  // 🧱 Default logo fallback
  return (
    <img
      src={defaultLogo}
      onClick={() => handleImageClick(defaultLogo)}
      className={`cpointer ${borderStyle_} ${imageClass}`}
      alt="Default logo"
    />
  );
}



export function SmartDropdown({ 
  apiEndpoint, 
  idField, 
  labelField, 
  inputName = 'smart_input',
  label = 'Select or type an option',
  onSelect,
  defaultValue = ''
}) {
  const [options, setOptions] = useState([]);
  const [selectedValue, setSelectedValue] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(true);

  const initialDefault = useRef(defaultValue); // 👈 Keeps default persistent

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch the  data with the given key
        const res = await mosyGetData({
          endpoint: apiEndpoint,
          params: { 
          q: btoa(``),         
          aw : btoa(`group by ${labelField}`),
          fullQ :false,
          src : btoa(`${inputName}`)
          },
        });
        
        const data = res
        if (data.status === 'success') {
          const items = data.data || [];
          setOptions(items);

          // Determine if default value exists in options
        const isInOptions = items.some(item => item[labelField] === defaultValue);          

        if (defaultValue) {
          setSelectedValue(defaultValue);
          setCustomInput(defaultValue);
          if (onSelect) onSelect(defaultValue);
        }
          
        } else {
          console.error('API Error:', data.message);
        }
      } catch (err) {
        console.error('Fetch failed:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [apiEndpoint, defaultValue]);

  const handleSelectChange = (e) => {
    const val = e.target.value;
    setIsCustom(false);
    setSelectedValue(val);
    setCustomInput(val);
    if (onSelect) onSelect(val);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setCustomInput(val);
    if (onSelect) onSelect(val);
  };


 const toggleCustomInput = () => {
    setIsCustom(prev => {
      const goingToDropdown = prev === true;
      if (goingToDropdown) {
        // Re-apply initial default only if they didn't select anything yet
        setSelectedValue(prevVal => prevVal || initialDefault.current);
      }
      return !prev;
    });
  };
  
  
  return (
    <>
      <label className="cpointer">
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
            <option key={item[idField]} value={item[labelField]}>
              {item[labelField]}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          className="form-control mb-2"
          placeholder={`Type new  ${label}`}
          name={inputName}
          value={customInput}
          onChange={handleInputChange}
        />
      )}
    </>
  );
}

export function LiveSearchDropdown({
  apiEndpoint,
  tblName = 'q',
  parentTable ="p",
  inputName = 'live_search',
  hiddenInputName = 'selected_id',
  label = 'Search & select an option',
  onSelect,
  onSelectFull,
  displayField = 'name',
  valueField = 'id',
  defaultValue = null,
  onInputChange,
  defaultColSize="col-md-4",
  cellOverrides={},
  inputOverrides={},
  context={},
  labelClassName=""
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef(null);

  // Set default value on mount
  useEffect(() => {
    if (defaultValue && defaultValue[valueField]) {
      setSelected(defaultValue);
      setQuery(defaultValue[displayField]);
    }
  }, [defaultValue, valueField, displayField]);

  // Perform live search
  useEffect(() => {
    /*if (!query.trim() && !isFocused) {
      setResults([]);
      setHasSearched(false);
      return;
    }*/

    setLoading(true);
    setHasSearched(true);

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const encodedQuery = btoa(query)
        
      const customParams = { [`q${tblName}`] : encodedQuery}
        
      const queryFilterStr = MosyFilterEngine(tblName, true, customParams)

      let fullQ = false

      if(queryFilterStr!='')
      {
        fullQ=true
      }

      try {
        
        // Fetch the  data with the given key
        const res = await mosyGetData({
          endpoint: apiEndpoint,
          params: { 
          q: btoa(queryFilterStr),    
          fullQ : fullQ,
          src : btoa(`${parentTable} - ${hiddenInputName}`)

          },
        });
        
        //console.log("LiveSearchDropdown res ", res)
        const data =res // await res.json();
        if (data.status === 'success') {
          setResults(data.data || []);
        } else {
          console.error('API error:', res);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    }, 400);

    //console.log(`live search tbl ${tblName} isfocused ${isFocused} reslts ${results.length}  isloading ${loading} hasSearched ${hasSearched}`)
    return () => clearTimeout(debounceRef.current);
  }, [query, apiEndpoint, tblName]);


  const handleSelect = (item) => {
    const displayValue = item[displayField] ?? '';
    setSelected(item);
    setQuery(displayValue);
  
    if (onSelect) onSelect(item[valueField]);
    if (onSelectFull) onSelectFull(item);
  
    if (onInputChange) {
      // Hidden ID
      onInputChange({
        target: {
          name: hiddenInputName,
          value: item[valueField],
        },
      });
  
      // Display text (optional)
      onInputChange({
        target: {
          name: inputName,
          value: displayValue,
        },
      });
    }
  };
  
  

  // Handle typing
  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setSelected(null);
    if (onInputChange) onInputChange(e); // Notify the outside world!

  };

  // Focus/blur handlers to control dropdown visibility
  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setTimeout(() => setIsFocused(false), 150);

  const cellClass = mosyCellClass(parentTable, hiddenInputName, context, cellOverrides);
  const inputProps = mosyInputProps(parentTable, hiddenInputName, context, inputOverrides);

  const createNewCellClass = mosyCellClass(parentTable, `${hiddenInputName}_create_new`, context, cellOverrides);

  return (
                      
    <div className={`form-group ${defaultColSize} hive_data_cell ${cellClass}`}>
    <div className="col-md-12 p-0 m-0 " id="">          
    <div className="form-group position-relative p-0 m-0 ">
      <label className={labelClassName}>{label}</label>
      <input
        type="text"
        className="form-control"
        name={inputName}
        autoComplete="off"
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={`Search ${label}...`}
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

            {!loading && results.length > 0 && results.map((item) => (
              <li
                key={`${item[valueField]}=${magicRandomStr()}`}
                className="list-group-item list-group-item-action"
                onClick={() => handleSelect(item)}
                style={{ cursor: 'pointer' }}
              >
                {item[displayField]}
              </li>
            ))}

            {!loading && results.length === 0 && hasSearched && (
              <li className="list-group-item text-muted p-2">
              <div className="d-flex justify-content-between align-items-center">
                <span className="d-flex align-items-center badge">
                  <i className="fa fa-info-circle mr-2"></i> No results found
                </span>

                <u
                  onClick={() => setIsFocused(false)}
                  style={{ cursor: 'pointer' }}
                  className="text-danger badge pr-2"
                >
                  <i className="fa fa-times-circle me-1"></i> Close
                </u>
              </div>
            </li>
            )}

            {/* Always show Add New when focused */}
            <li
              className={`list-group-item list-group-item-action text-primary ${createNewCellClass} hide_livesearch_add_new`}
              style={{ cursor: 'pointer', fontWeight: 'bold' }}
              onClick={() => {
                setTimeout(() => setIsFocused(false), 50);
                MosyExtendLiveSearch({
                  table: tblName,
                  label,
                  query,
                  context,
                  hiddenInputName,
                  parentTable
                });
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
  type = "text",
  inputIdPrefix = "txt_",
}) {

  const cellClass = mosyCellClass(module, field, context, cellOverrides);

  const inputProps = mosyInputProps(
    module,
    field,
    context,
    inputOverrides
  );

  const inputId = `${inputIdPrefix}${field}`;

  let finalValue = value || "";

  console.log("finalValue", finalValue, value);
  if (type === "date") {
    finalValue = mosyFormatDateOnly(finalValue);
  }

  if (type === "datetime-local") {
    finalValue = mosyFormatDateTime(finalValue);
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

      )}

    </div>
  );
}

export function MosyPaginationUi({
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


export function MosyActionButton({ source = "" , label, icon, onClick, className = '' }) {
  return (
    <a
      className={`medium_btn border border_set btn-white ml-1 mr-1 mb-3 d-inline-block cpointer ${className}`}
      onClick={onClick}
    >
      {icon && <i className={`fa fa-${icon} mr-1`}></i>}
      {label}
    </a>
  );
}


export function MosyDateRangeFilter({
  callBack = () => {},
  className = '',
}) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
  }, []);

  const handleProceed = () => {
    callBack({
      startDate,
      endDate,
    });
  };

  return (
    <div className={`row m-0 p-0 justify-content-center col-md-12 ${className}`}>
         
   <div className={`form-group hive_data_cell col-md-6  text-left`}>
      <label>Start date</label>
      <input
        type="date"
        className="form-control col-md-12 mr-2"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
      />
    </div>
    <div className={`form-group hive_data_cell col-md-6  text-left`}>
    <label>End date</label>
      <input
        type="date"
        className="form-control col-md-12  mr-2"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
      />
      </div>

    <div className={`row m-0 p-0 justify-content-end col-md-12 `}>
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
  callBack = () => {},
} = {}) {
  MosyCard(
    "",
    <>
      <div className="col-md-12 text-left m-0 pt-2 pl-0 pr-0 pb-2">
        <span className="m-0 p-0 h4">{label}</span>
      </div>
      <MosySpace spaceClass="p-1" />
      <MosyDateRangeFilter callBack={callBack} />
    </>
  );
}
