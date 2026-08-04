"use client"
import React, { useState, useEffect, useRef } from "react";
import { filterDataByDate, LiveSearchDropdown, MosySmartDropdownActions } from "../UiControl/componentControl";
import { mosyBtoa, mosyFormatDateOnly, mosyGetData, mosyGetElemVal, mosyPostData } from "../../MosyUtils/hiveUtils";
import { getApiRoutes } from "../AppRoutes/apiRoutesHandler";
import { MosyAlertCard, MosyNotify, MosySnackWidget } from "../../MosyUtils/ActionModals";
import { closeMosyCard, MosyCard } from "../../components/MosyCard";
import { MosyLiveSearch } from "../UiControl/customUI";
import { closeMosySnack, mosySnack, mosySnackWidgetManager } from "../../MosyUtils/MosySnackWidget";
import { InteprateStockpurchasesEvent } from "../stockhistory/dataControl/StockpurchasesRequestHandler";
import ClientsProfile from "../clientlist/uiControl/ClientsProfile";

const apiRoutes = getApiRoutes();

// ╔══════════════════════════════════════╗
// ║  AUTO-GENERATED FUNCTION  #1          
// ║  Function: filterSalesDates                    
// ╚══════════════════════════════════════╝

export function filterSalesDates(salesFile = "salesordersoverview") {
    //alert(`filterSalesDates`);

    filterDataByDate({
        label: "Search by sales date",
        callBack: ({startDate, endDate}) => {
            window.location=`../${salesFile}/list?sales_orders_mosyfilter=${btoa(` order_date >= '${startDate}' AND order_date <= '${endDate}' `)}`   
        },
    }); 

}


export function loadSalesOrders()
{
    deleteDatarows(`${apiRoutes.salesordersoverview.manageOrders}`)
}

export function loadSalesOrderItems()
{
  deleteDatarows(`${apiRoutes.salesorderitems.manageOrderItems}`)
}

export function deleteDatarows(route)
{
    const itemCount = mosyGetElemVal("mosy_sel_rows_count")

    const optionsModal = 
    <div className="col-md-12 p-2 text-center h3">
      <div className="col-md-12 p-3 text-center row justify-content-center m-0 h6 ">{`For selected ${itemCount} items`}</div>
      <div className="col-md-12 p-3text-center row justify-content-center m-0 ">
        <div className="btn btn-danger cpointer " onClick={()=>{deleteSalesOrderItems(route)}}><i className="fa fa-trash"></i> Delete rows </div>
      </div>
    </div>;
     
   MosyCard(``, optionsModal,true,"modal1") 

  //mosyPostData({url:`${apiRoutes.salesorderitems.manageOrderItems}`, data: {}})
}   

export async function deleteSalesOrderItems(route)
{
    const keysToDelete = mosyGetElemVal("mosy_selected_rows")
    const itemCount = mosyGetElemVal("mosy_sel_rows_count")
    
    closeMosyCard("modal1")

    MosyNotify({message : `Deleting ${itemCount} rows`, icon : "send", addTimer : false})

    await mosyPostData({url:route, data: {csvKeys:keysToDelete}})

    MosyNotify({message : `Deleted ${itemCount} rows`, icon : "check-circle", iconColor:"text-success", addTimer : false})

    setTimeout(() => {
      window.location.reload();
    }, 4000);   
}


// ╔══════════════════════════════════════╗
// ║  AUTO-GENERATED FUNCTION  #1          
// ║  Function: filterOrderPaymentsDates                    
// ╚══════════════════════════════════════╝
export function filterOrderPaymentsDates(salesOrderPaymentFile) {
    filterDataByDate({
        label: "Search by payment date",
        callBack: ({startDate, endDate}) => {
            window.location=`../${salesOrderPaymentFile}/list?sales_order_payments_mosyfilter=${btoa(` payment_date >= '${startDate}' AND payment_date <= '${endDate}' `)}`   
        },
    }); 
}

export function loadOrderPayments() {
    
    deleteDatarows(`${apiRoutes.salesordersoverview.manageOrders}`)

}


export function loadInventoryOptions  ()
{
    deleteDatarows(`${apiRoutes.stocklist.manageStock}`)
}


// ╔══════════════════════════════════════╗
// ║  AUTO-GENERATED FUNCTION  #1          
// ║  Function: filterCategory                    
// ╚══════════════════════════════════════╝
export function filterCategory(fieldName="category") {
    //alert(`filterCategory`);

    MosyLiveSearch({
        api: apiRoutes.stocklist.base,
        title :"Search categories",
        tableName: "inventory",
        displayField: fieldName,
        valueField: fieldName,
        actionName: "mosyfilter",
        actionData: {
            router: "../stocklist/list",
            qstr: `${fieldName} = '{{${fieldName}}}'`,
            path : "../stocklist/list",
}
})
}

// utils/formUtils.js
export function collectFormData(formId) {
    const form = document.getElementById(formId);
    if (!form) {
      console.warn(`Form with id "${formId}" not found`);
      return {};
    }
    if (form) {
      console.info(`Form with id "${formId}" is so found`);
    }
    const formData = new FormData(form);  
    const payload = {};
  
    for (let [key, value] of formData.entries()) {
      // Handle multiple values (e.g. checkboxes with same name)
      if (payload[key]) {
        if (Array.isArray(payload[key])) {
          payload[key].push(value);
        } else {
          payload[key] = [payload[key], value];
        }
      } else {
        payload[key] = value;
      }
    }
  
    return payload;
  }

export function newCustomer()
{
  MosyCard("",<ClientsProfile />,false,"modal1","mosycard_medium")
}

export function SalesPointList({ onSelect }) {

  const [salesPoints, setSalesPoints] = useState([]);

  useEffect(() => {

    async function fetchSalesPoints() {
      MosyNotify({message: `Loading sales points...`, icon:"info", addTimer : false});
      const salesPointRes = await mosyGetData({endpoint : apiRoutes.salespoint.base, params: {  } })
      setSalesPoints(salesPointRes.data || []);
      closeMosyCard()
    }

    fetchSalesPoints();

  }, []);

  const handleSelect = (point) => {
    if (onSelect) onSelect(point);
    //else alert(`Selected: ${point.name}`);
  };

  return (
    <div className="container mt-5">
      <h4 className="fw-bold text-center mb-4">Select Sales Point</h4>
      <div className="row justify-content-center g-3">
        {salesPoints.map((point, index) => (
          <div key={index} className="col-md-4">
            <div
              className="card shadow-sm border-0 h-100 p-3"
              style={{ borderRadius: '16px', cursor: 'pointer', transition: '0.3s' }}
              onClick={() => handleSelect(point)}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-5px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div className="card-body border-info border-2 rounded p-4 text-center">
                <h5 className="fw-bold text-primary">{point.sales_point_name}</h5>
                <p className="text-muted small mb-2">{point.description}</p>
                <span className="badge bg-light text-dark">Tap to continue</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


export function ShiftSelector({ onSelect }) {
  const [shifts , setShifts] = useState([]);

  useEffect(() => {
    // You can fetch shifts from an API if needed
    async function fetchShifs() {
      MosyNotify({message: `Loading shifts...`, icon:"info", addTimer : false});

      const salesPointRes = await mosyGetData({endpoint : apiRoutes.systemshifts.base, params: {  } })
      setShifts(salesPointRes.data || []);

      closeMosyCard()
    }

    fetchShifs();

  }, []);

  const handleSelect = (shift) => {
    if (onSelect) onSelect(shift);
    //else alert(`Selected: ${shift.shift_name} - ${shift.time}`);
  };

  return (
    <div className="container mt-5">
      <h4 className="fw-bold text-center mb-4">Select Shift</h4>
      <div className="row justify-content-center g-3">
        {shifts.map((shift, index) => (
          <div key={index} className="col-md-4">
            <div
              className="card shadow-sm border-0 text-center p-4"
              style={{ borderRadius: '16px', cursor: 'pointer', transition: '0.3s' }}
              onClick={() => handleSelect(shift)}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-5px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <h6 className="fw-bold mb-2 text-dark">{shift.shift_name}</h6>
              <p className="text-muted small mb-0">{shift.opening_time} - {shift.closing_time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export async function postStockRow(data)
{
  const row = data.row
 mosySnack({content: `Updating row...`,autoClose:false}); 
 await mosyPostData({url:`${apiRoutes.stockhistory.updaterow}`, data: row})
 closeMosySnack()
 mosySnack({content: `Changes saved`}); 

}

export async function addStockRow(data) {
  const row = data.row;

  mosySnack({ content: `Creating row...`, autoClose: false });

  const res = await mosyPostData({
    url: `${apiRoutes.stockhistory.addStockRow}`,
    data: row
  });

  closeMosySnack();

  if (res?.status === 'ok') {
    mosySnack({ content: `Row details saved` });

    // 🔑 IMPORTANT: return server identifiers
    return {
      record_id: res.result.record_id,
      primkey: res.result.record_id   // if primkey == record_id in your system
    };
  }

  throw new Error("Failed to create stock row");
}



export function createEmptyStockRow(index = 0) {
  return {
    primkey: `temp_${Date.now()}`,
    row_count: index + 1,
    inventory_date: new Date().toISOString(),
    item_code: "",
    item_id: "",
    total_buying_price: 0,
    quantity: 0,
    unit_per_dz: 0,
    selling_price_n_tax: 0,
    receipt_no: "",
    __isNew: true // 👈 flag for backend
  };
}


export function ExcelRow({ row, index, onRowChange, setters }) 
{

  /* =======================
     Normalized numeric inputs
  ======================= */
  const qtyDz        = Number(row.quantity || 0);
  const unitsPerDz   = Number(row.unit_per_dz || 0);
  const totalBuying  = Number(row.total_buying_price || 0);
  const sellingPrice = Number(row.selling_price_n_tax || 0);

  /* =======================
     Computed values
  ======================= */
  const totalUnits   = qtyDz * unitsPerDz;
  const buyingPrice  = totalUnits > 0 ? totalBuying / totalUnits : 0;
  const marginPrice  = sellingPrice - buyingPrice;
  const totalProfit  = marginPrice * totalUnits;


  function computeValues(baseRow) {
    const qtyDz        = Number(baseRow.quantity || 0);
    const unitsPerDz   = Number(baseRow.unit_per_dz || 0);
    const totalBuying  = Number(baseRow.total_buying_price || 0);
    const sellingPrice = Number(baseRow.selling_price_n_tax || 0);
  
    const totalUnits   = qtyDz * unitsPerDz;
    const buyingPrice  = totalUnits > 0 ? totalBuying / totalUnits : 0;
    const marginPrice  = sellingPrice - buyingPrice;
    const totalProfit  = marginPrice * totalUnits;
  
    return {
      total_units: totalUnits,
      buying_price: Number(buyingPrice.toFixed(2)),
      margin_price: Number(marginPrice.toFixed(2)),
      total_profit: Number(totalProfit.toFixed(2))
    };
  }

  
  /* =======================
     Field updater
  ======================= */
  function update(fieldOrPatch, value) {
    let patch = {};
  
    if (typeof fieldOrPatch === "object") {
      patch = fieldOrPatch;
    } else if (typeof fieldOrPatch === "string") {
      patch = { [fieldOrPatch]: value };
    }
  
    // merge row + new input
    const baseRow = {
      ...row,
      ...patch
    };
  
    // compute derived values
    const computed = computeValues(baseRow);
  
    const payload = {
      ...baseRow,
      ...computed,
      __dirty: true
    };
  
    onRowChange(payload, index);
  }
   
  
  return (
    <tr>
      {/* Row actions */}
      <td>
        <div className="table_cell_dropdown">
          <div className="table_cell_dropbtn">
            <b>{row.row_count}</b>
          </div>

          <div className="table_cell_dropdown-content">
            <MosySmartDropdownActions
              tblName="stock_history"
              setters={{
                              
                childStateSetters: setters,
                parentStateSetters: null
                
              }}
              attributes={`${row.primkey}:../stockledger/profile:false`}
              callBack={(req) => InteprateStockpurchasesEvent(req)}
            />
          </div>
        </div>
      </td>

      {/* Static fields */}
      <EditableCell
        value={mosyFormatDateOnly(row.inventory_date)}
        onChange={(v) => update("inventory_date", v)}
        type="date"
      />

      <td style={{ minWidth: "80px" }}>
        <LiveSearchDropdown 
        apiEndpoint={apiRoutes.allitems.base}
        tblName="inventory"
        parentTable="inventory"
        inputName="display_name"
        hiddenInputName="item_id"
        valueField="item_id"
        label=""
        labelClassName="d-none"
        
        onSelectFull={(item) => {
          update({
            item_id: item.item_id,
            selling_price_n_tax: item.selling_price,
            _inventory_display_name_item_id: item.display_name
          });
        }}        
        displayField="display_name"
        defaultValue={{ item_id: row.item_id || "", display_name: row._inventory_display_name_item_id || "" }}
        defaultColSize="col-lg-12 col-12 hive_data_cell p-0 m-0  "
      
      /></td>

      {/* Editable fields */}
      <EditableCell
        value={row.total_buying_price}
        onChange={(v) => update("total_buying_price", v)}
      />

      <EditableCell
        value={row.quantity}
        onChange={(v) => update("quantity", v)}
      />

      <EditableCell
        value={row.unit_per_dz}
        onChange={(v) => update("unit_per_dz", v)}
      />

      {/* Computed display-only fields */}
      <td>{row.total_units || 0}</td>
      <td>{Number(row.buying_price || 0).toFixed(2)}</td>

      <EditableCell
        value={row.selling_price_n_tax}
        onChange={(v) => update("selling_price_n_tax", v)}
      />

      <td>{Number(row.margin_price || 0).toFixed(2)}</td>
      <td>{Number(row.total_profit || 0).toFixed(2)}</td>
      <td style={{ minWidth: "80px" }}>
      <LiveSearchDropdown
        apiEndpoint={apiRoutes.suppliersledger.base}
        tblName="suppliers"
        parentTable="stock_history"
        inputName="txt__suppliers_supplier_name_supplier"
        hiddenInputName="txt_supplier"
        valueField="record_id"
        displayField="supplier_name"
        label="Supplier"
        labelClassName="d-none"
        defaultValue={{ record_id: row?.supplier || "", supplier_name: row?._suppliers_supplier_name_supplier || "" }}
        onSelectFull={(item) =>  {
          update({
            supplier: item.record_id,
            _suppliers_supplier_name_supplier: item.supplier_name
          }); 
        }}
        defaultColSize="col-md-12 p-0 m-0 hive_data_cell "
        context={{hostParent : "hostParent"}}
      />  
      </td>
      <EditableCell
        value={row.receipt_no}
        type="text"
        onChange={(v) => update("receipt_no", v)}
      />      
    </tr>
  );
}


  export function EditableCell({ value, onChange, type = "number" }) {
    return (
      <td style={{ minWidth: "80px" }}>
        <input
          type={type}
          className="form-control form-control-sm text-end"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          style={{
            border: "none",
            background: "transparent",
            boxShadow: "none"
          }}
        />
      </td>
    );
  }