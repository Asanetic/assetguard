'use client';

//React
import { useEffect, useState } from 'react';

import Link from 'next/link';

import { useRouter } from 'next/navigation';

//components
import { MosyAlertCard, MosyNotify ,closeMosyModal } from  '../../../MosyUtils/ActionModals';

import MosySnackWidget from '../../../MosyUtils/MosySnackWidget';

//basic utils
import { mosyScrollTo , deleteUrlParam, mosyFormInputHandler,mosyUrlParam  } from '../../../MosyUtils/hiveUtils';

//data control and processors
import { inteprateSubscriptionpaymentsFormAction, subscriptionpaymentsProfileData , popDeleteDialog, InteprateSubscriptionpaymentsEvent } from '../dataControl/SubscriptionpaymentsRequestHandler';

//state management
import { useSubscriptionpaymentsState } from '../dataControl/SubscriptionpaymentsStateManager';

//profile components
import {
  SubmitButtons,
  AddNewButton,
  LiveSearchDropdown,
  MosySmartField,
  MosyActionButton,
  SmartDropdown,
  DeleteButton ,
  MosyImageViewer,
  MosyFileUploadButton
} from '../../UiControl/componentControl';

//emberbill custom functions
//import {  } from '../../emberbill_custom_functions';

//def logo
import logo from '../../../img/logo/logo.png'; // outside public!

import MosyHtmlEditor from '../../../MosyUtils/htmlEditor'

// export profile

export default function SubscriptionpaymentsProfile({ dataIn = {}, dataOut = {} }) {
  
  //initiate data exchange manifest
  //incoming data from parent
  const {
    showNavigationIsle = true,
    customQueryStr = "",
    parentUseEffectKey = "",
    parentStateSetters=null,
    customProfileData={},
    hostParent="SubscriptionpaymentsMainProfilePage"
  } = dataIn;
  
  //outgoing data to parent
  const {
    setChildDataOut = () => {},
    setChildDataOutSignature = () => {},
  } = dataOut;
  
  
  //set default state values
  const settersOverrides  = {localEventSignature : parentUseEffectKey}
  
  //manage Subscriptionpayments states
  const [stateItem, stateItemSetters] = useSubscriptionpaymentsState(settersOverrides);
  const billing_transactionsNode = stateItem.subscriptionpaymentsNode
  
  // -- basic states --//
  const paramSubscriptionpaymentsUptoken  = stateItem.subscriptionpaymentsUptoken
  const subscriptionpaymentsActionStatus = stateItem.subscriptionpaymentsActionStatus
  const snackMessage = stateItem.snackMessage
  //const snackOnDone = stateItem.snackOnDone
  
  const localEventSignature = stateItem.localEventSignature
  
  const handleInputChange = mosyFormInputHandler(stateItemSetters.setSubscriptionpaymentsNode);
  
  //use route navigation system
  const router = useRouter();
  
  //manage post form
  function postSubscriptionpaymentsFormData(e) {
    
    MosyNotify({message: "Sending request",icon:"send"})
    
    inteprateSubscriptionpaymentsFormAction(e, stateItemSetters).then(response=>{
      
      setChildDataOut({
        
        actionName : response.actionName,
        dataToken : response.newToken,
        actionsSource : "postSubscriptionpaymentsFormData",
        setters :{
          
          childStateSetters: stateItemSetters,
          parentStateSetters: parentStateSetters
          
        }
        
      })
      
      mosyScrollTo("SubscriptionpaymentsProfileTray")
      closeMosyModal()
      
    })
    
  }
  
  useEffect(() => {
    
    subscriptionpaymentsProfileData(customQueryStr, stateItemSetters, router, customProfileData)
    
    mosyScrollTo("SubscriptionpaymentsProfileTray")
    
    
  }, [localEventSignature]);
  
  
  
  //child queries use effect
  
  
  
  return (
    
    <div className="p-0 col-md-12 text-center row justify-content-center m-0  " id="SubscriptionpaymentsProfileTray">
      {/* ================== Start Feature Section========================== ------*/}
      
      
      <div className="col-md-12 rounded text-left p-2 mb-0  bg-white ">
        <div className={` profile_container col-md-12 m-0 p-0  ${showNavigationIsle &&("pr-lg-4 pl-lg-4 m-0")}`}>
          <form onSubmit={postSubscriptionpaymentsFormData} encType="multipart/form-data" id="billing_transactions_profile_form">
            
            {/*    Title isle      */}
            <div className="col-md-12 pt-4 p-0 hive_profile_title_top d-lg-none" id=""></div>
            <h3 className="col-md-12 title_text text-left p-0 pt-3 hive_profile_title row justify-content-center m-0 ">
              <div className="col m-0 p-0 pb-3">
                {billing_transactionsNode?.primkey ? (  <span>Subscription payments Profile</span>) : (<span>Add Billing Transactions</span>)}
              </div>
              <>{!showNavigationIsle && (<div className="col m-0 p-0 text-right ">
                {paramSubscriptionpaymentsUptoken && (
                  <DeleteButton
                  uptoken={paramSubscriptionpaymentsUptoken}
                  stateItemSetters={stateItemSetters}
                  parentStateSetters={parentStateSetters}
                  
                  onDelete={popDeleteDialog}
                  />
                )}
              </div>)}</>
            </h3>
            {/*    Title isle      */}
            
            
            
            {/*    Navigation isle      */}
            <><div className="row justify-content-end m-0 p-0 col-md-12  p-3 bg-white hive_profile_navigation " id="">
              <div className="col-md-4 text-left p-0 hive_profile_nav_back_to_list_tray" id="">
                
                {showNavigationIsle && ( <Link href="./list" className="text-info hive_profile_nav_back_to_list"><i className="fa fa-arrow-left"></i> Back to list</Link>)}
                
              </div>
              <div className="col-md-8 p-0 text-right hive_profile_nav_add_new_tray" id="">
                
                
                
                {paramSubscriptionpaymentsUptoken && (
                  <>
                  
                </>
              )}
              
              {paramSubscriptionpaymentsUptoken && showNavigationIsle && (
                <>
                
                <DeleteButton
                uptoken={paramSubscriptionpaymentsUptoken}
                stateItemSetters={stateItemSetters}
                parentStateSetters={parentStateSetters}
                router={router}
                onDelete={popDeleteDialog}
                />
                
                
                <AddNewButton link="./profile" label=" Add new" icon="plus-circle" />
              </>
            )}
            
          </div>
        </div></>
        <div className="col-md-12 pt-4 p-0 hive_profile_navigation_divider d-lg-none" id=""></div>
        {/*    Navigation isle      */}
        <div className="row justify-content-center m-0 p-0 col-md-12" id="">
          {/*    Image section isle      */}
          
          {/*    Image section isle      */}
          
          {/*  //-------------    main content starts here  ------------------------------ */}
          
          
          
          <div className="col-md-12 row justify-content-center m-0  p-0">
            {/*    Input cells section isle      */}
            <div className="col-md-12 row p-0 justify-content-center p-0 m-0">
              <div className="col-md-12 row justify-content-center p-0 m-0">
                <div className="col-md-12 row p-0 justify-content-center p-0 m-0">
                  
                  <MosySmartField
                  module="billing_transactions"
                  field="trx_id"
                  label="Transaction Ref."
                  value={billing_transactionsNode?.trx_id || ""}
                  onChange={handleInputChange}
                  context={{ hostParent: hostParent  }}
                  inputOverrides={{}}
                  type="text"
                  cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
                  />
                  
                  
                  <MosySmartField
                  module="billing_transactions"
                  field="trx_date"
                  label="Transations date"
                  value={billing_transactionsNode?.trx_date || ""}
                  onChange={handleInputChange}
                  context={{ hostParent: hostParent  }}
                  inputOverrides={{}}
                  type="date"
                  cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
                  />
                  
                  
                  <MosySmartField
                  module="billing_transactions"
                  field="trx_month_year"
                  label="Trx Month Year"
                  value={billing_transactionsNode?.trx_month_year || ""}
                  onChange={handleInputChange}
                  context={{ hostParent: hostParent  }}
                  inputOverrides={{}}
                  type="text"
                  cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
                  />
                  
                  
                  <MosySmartField
                  module="billing_transactions"
                  field="trx_remark"
                  label="Trx Remark"
                  value={billing_transactionsNode?.trx_remark || ""}
                  onChange={handleInputChange}
                  context={{ hostParent: hostParent  }}
                  inputOverrides={{}}
                  type="text"
                  cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
                  />
                  
                  
                  <MosySmartField
                  module="billing_transactions"
                  field="amount"
                  label="Amount"
                  value={billing_transactionsNode?.amount || ""}
                  onChange={handleInputChange}
                  context={{ hostParent: hostParent  }}
                  inputOverrides={{}}
                  type="text"
                  cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
                  />
                  
                  
                  <MosySmartField
                  module="billing_transactions"
                  field="trx_type"
                  label="Trx Type"
                  value={billing_transactionsNode?.trx_type || ""}
                  onChange={handleInputChange}
                  context={{ hostParent: hostParent  }}
                  inputOverrides={{}}
                  type="text"
                  cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
                  />
                  
                  
                  <MosySmartField
                  module="billing_transactions"
                  field="business_id"
                  label="Business Id"
                  value={billing_transactionsNode?.business_id || ""}
                  onChange={handleInputChange}
                  context={{ hostParent: hostParent  }}
                  inputOverrides={{}}
                  type="text"
                  cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
                  />
                  
                  
                  <MosySmartField
                  module="billing_transactions"
                  field="client_id"
                  label="Client Id"
                  value={billing_transactionsNode?.client_id || ""}
                  onChange={handleInputChange}
                  context={{ hostParent: hostParent  }}
                  inputOverrides={{}}
                  type="text"
                  cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
                  />
                  
                  
                  <MosySmartField
                  module="billing_transactions"
                  field="admin_id"
                  label="Admin Id"
                  value={billing_transactionsNode?.admin_id || ""}
                  onChange={handleInputChange}
                  context={{ hostParent: hostParent  }}
                  inputOverrides={{}}
                  type="text"
                  cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
                  />
                  
                  
                  <MosySmartField
                  module="billing_transactions"
                  field="TransactionType"
                  label="Transactiontype"
                  value={billing_transactionsNode?.TransactionType || ""}
                  onChange={handleInputChange}
                  context={{ hostParent: hostParent  }}
                  inputOverrides={{}}
                  type="text"
                  cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
                  />
                  
                  
                  <MosySmartField
                  module="billing_transactions"
                  field="BusinessShortCode"
                  label="Businessshortcode"
                  value={billing_transactionsNode?.BusinessShortCode || ""}
                  onChange={handleInputChange}
                  context={{ hostParent: hostParent  }}
                  inputOverrides={{}}
                  type="text"
                  cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
                  />
                  
                  
                  <MosySmartField
                  module="billing_transactions"
                  field="BillRefNumber"
                  label="Account number"
                  value={billing_transactionsNode?.BillRefNumber || ""}
                  onChange={handleInputChange}
                  context={{ hostParent: hostParent  }}
                  inputOverrides={{}}
                  type="text"
                  cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
                  />
                  
                  
                  <MosySmartField
                  module="billing_transactions"
                  field="InvoiceNumber"
                  label="Invoicenumber"
                  value={billing_transactionsNode?.InvoiceNumber || ""}
                  onChange={handleInputChange}
                  context={{ hostParent: hostParent  }}
                  inputOverrides={{}}
                  type="text"
                  cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
                  />
                  
                  
                  <MosySmartField
                  module="billing_transactions"
                  field="OrgAccountBalance"
                  label="Orgaccountbalance"
                  value={billing_transactionsNode?.OrgAccountBalance || ""}
                  onChange={handleInputChange}
                  context={{ hostParent: hostParent  }}
                  inputOverrides={{}}
                  type="text"
                  cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
                  />
                  
                  
                  <MosySmartField
                  module="billing_transactions"
                  field="ThirdPartyTransID"
                  label="Thirdpartytransid"
                  value={billing_transactionsNode?.ThirdPartyTransID || ""}
                  onChange={handleInputChange}
                  context={{ hostParent: hostParent  }}
                  inputOverrides={{}}
                  type="text"
                  cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
                  />
                  
                  
                  <MosySmartField
                  module="billing_transactions"
                  field="MSISDN"
                  label="Msisdn"
                  value={billing_transactionsNode?.MSISDN || ""}
                  onChange={handleInputChange}
                  context={{ hostParent: hostParent  }}
                  inputOverrides={{}}
                  type="text"
                  cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
                  />
                  
                  
                  <MosySmartField
                  module="billing_transactions"
                  field="FirstName"
                  label="Firstname"
                  value={billing_transactionsNode?.FirstName || ""}
                  onChange={handleInputChange}
                  context={{ hostParent: hostParent  }}
                  inputOverrides={{}}
                  type="text"
                  cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
                  />
                  
                  
                  <MosySmartField
                  module="billing_transactions"
                  field="MiddleName"
                  label="Middlename"
                  value={billing_transactionsNode?.MiddleName || ""}
                  onChange={handleInputChange}
                  context={{ hostParent: hostParent  }}
                  inputOverrides={{}}
                  type="text"
                  cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
                  />
                  
                  
                  <MosySmartField
                  module="billing_transactions"
                  field="LastName"
                  label="Lastname"
                  value={billing_transactionsNode?.LastName || ""}
                  onChange={handleInputChange}
                  context={{ hostParent: hostParent  }}
                  inputOverrides={{}}
                  type="text"
                  cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
                  />
                  
                  
                  <MosySmartField
                  module="billing_transactions"
                  field="trx_msg"
                  label="Trx Msg"
                  value={billing_transactionsNode?.trx_msg || ""}
                  onChange={handleInputChange}
                  context={{ hostParent: hostParent  }}
                  inputOverrides={{}}
                  type="text"
                  cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
                  />
                  
                  
                  <MosySmartField
                  module="billing_transactions"
                  field="account_id"
                  label="Account Id"
                  value={billing_transactionsNode?.account_id || ""}
                  onChange={handleInputChange}
                  context={{ hostParent: hostParent  }}
                  inputOverrides={{}}
                  type="text"
                  cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
                  />
                  
                  
                  <MosySmartField
                  module="billing_transactions"
                  field="used_status"
                  label="Used Status"
                  value={billing_transactionsNode?.used_status || ""}
                  onChange={handleInputChange}
                  context={{ hostParent: hostParent  }}
                  inputOverrides={{}}
                  type="text"
                  cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
                  />
                  
                  
                  <MosySmartField
                  module="billing_transactions"
                  field="filter_date"
                  label="Filter Date"
                  value={billing_transactionsNode?.filter_date || ""}
                  onChange={handleInputChange}
                  context={{ hostParent: hostParent  }}
                  inputOverrides={{}}
                  type="text"
                  cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
                  />
                  
                  
                  <MosySmartField
                  module="billing_transactions"
                  field="flw_id"
                  label="Flw Id"
                  value={billing_transactionsNode?.flw_id || ""}
                  onChange={handleInputChange}
                  context={{ hostParent: hostParent  }}
                  inputOverrides={{}}
                  type="text"
                  cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
                  />
                  
                  
                  <MosySmartField
                  module="billing_transactions"
                  field="flag_state"
                  label="Flag State"
                  value={billing_transactionsNode?.flag_state || ""}
                  onChange={handleInputChange}
                  context={{ hostParent: hostParent  }}
                  inputOverrides={{}}
                  type="text"
                  cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
                  />
                  
                  
                  <MosySmartField
                  module="billing_transactions"
                  field="reconciled"
                  label="Reconciled"
                  value={billing_transactionsNode?.reconciled || ""}
                  onChange={handleInputChange}
                  context={{ hostParent: hostParent  }}
                  inputOverrides={{}}
                  type="text"
                  cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
                  />
                  
                  
                  <MosySmartField
                  module="billing_transactions"
                  field="corrected_number"
                  label="Corrected Number"
                  value={billing_transactionsNode?.corrected_number || ""}
                  onChange={handleInputChange}
                  context={{ hostParent: hostParent  }}
                  inputOverrides={{}}
                  type="text"
                  cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
                  />
                  
                  <LiveSearchDropdown
                  apiEndpoint="/api/emberbill/apps/applications"
                  tblName="app_list"
                  parentTable="billing_transactions"
                  inputName="txt__app_list_app_name_app_id"
                  hiddenInputName="txt_app_id"
                  valueField="app_id"
                  displayField="app_name"
                  label="App name"
                  defaultValue={{ app_id: billing_transactionsNode?.app_id || "", app_name: billing_transactionsNode?._app_list_app_name_app_id || "" }}
                  onSelect={(id) => console.log("Just the ID:", id)}
                  onSelectFull={(dataRes) =>  console.log("Data seleted")}
                  onInputChange={handleInputChange}
                  defaultColSize="col-md-4 hive_data_cell "
                  context={{hostParent : hostParent}}
                  />
                </div>
                
                <div className="col-md-12 text-center">
                  <SubmitButtons tblName="billing_transactions" extraClass="optional-custom-class" />
                </div>
              </div></div>
              {/*    Input cells section isle      */}
            </div>
            
            <section className="hive_control">
              <input type="hidden" id="billing_transactions_uptoken" name="billing_transactions_uptoken" value={paramSubscriptionpaymentsUptoken}/>
              <input type="hidden" id="billing_transactions_mosy_action" name="billing_transactions_mosy_action" value={subscriptionpaymentsActionStatus}/>
            </section>
            
            
          </div>
          
        </form>
        
        
        <div className="row justify-content-center m-0 pr-lg-1 pl-lg-1 pt-0 col-md-12" id="">
          {/*<hive_mini_list/>*/}
          
          
        </div>
      </div>
    </div>
    
    
    {/* snack notifications -- */}
    {snackMessage &&(
      <MosySnackWidget
      content={snackMessage}
      duration={5000}
      type="custom"
      onDone={() => {
        stateItemSetters.setSnackMessage("");
        stateItem.snackOnDone(); // Run whats inside onDone
        deleteUrlParam("snack_alert")
      }}
      
      />)}
      {/* snack notifications -- */}
            
      {/* ================== End Feature Section========================== ------*/}
    </div>
    
  );
  
}

