// utils/inputControlEngine.js
const controlMap = {
    
     asset_pricing: {
      asset_id_: {input: { readOnly: true, required: false}, cellClass: "bg-secondary p-3 rounded_medium d-none"},
     },

     sms: {

      recipient_phone: {input: { readOnly: true, required: false}, cellClass: "bg-light"},
      message_body : {input: { readOnly: true, required: false}, cellClass: "bg-light  "},       

     },

     farmers: {
      farmer_name: {input: { readOnly: true, required: false}, cellClass: ""},
      farmer_number: {input: { readOnly: true, required: false}, cellClass: ""},
      phone: {input: { readOnly: true, required: false}, cellClass: ""},
      location: {input: { readOnly: true, required: false}, cellClass: ""},
      date_registered: {input: { readOnly: true, required: false}, cellClass: ""},
      
     },
     
     message_templates: {
      qdataInput_create_new : {input: { readOnly: false, required: false}, cellClass: "show_livesearch_add_new"},
     }      
        
  };

// --- Custom override functions --- //
function customInputsControl(module, field, controlData = {}) {

  ///console.log(`customInputsControl `, module , field , controlData)

  // Default: return null if no custom override
  return null;
  
}

function customCellControls(module, field, controlData = {}) {


  const hostParent = controlData?.hostParent
  
  //console.log(`customCellControls `, module , field , controlData , hostParent)

  //hive invoice id if not in the main page
  if ((module==="invoice_payments" && field === "txt_invoice_id")) {
   if(hostParent!=="InvoicepaymentsMainProfilePage"){
    return "d-none";
   }
  }

  return null;
}

// --- Get input props with optional overrides --- //
export function mosyInputProps(module, field, controlData = {}, overrides = {}) {
  const base = controlMap?.[module]?.[field]?.input || {};
  const custom = customInputsControl(module, field, controlData) || {};

  return {
    ...base,
    ...custom,
    ...overrides
  };
}

// --- Get cell class with dynamic and override support --- //
export function mosyCellClass(module, field, controlData = {}, overrides = {}) {
  const baseClass = controlMap?.[module]?.[field]?.cellClass || "";
  const customClass = customCellControls(module, field, controlData) || "";
  const overrideClass = overrides.additionalClass || "";

  return [baseClass, customClass, overrideClass].join(" ").trim();
}