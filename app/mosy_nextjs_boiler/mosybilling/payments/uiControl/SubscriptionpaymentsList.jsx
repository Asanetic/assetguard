'use client';
//React
import { useEffect, useState ,Fragment } from 'react';

import Link from 'next/link';

import { useRouter } from 'next/navigation';


//print utils
import { exportTableToExcel } from '../../../MosyUtils/exportToExcel';
import { mosyPrintToPdf } from '../../../MosyUtils/hiveUtils';


//custom utils
import { deleteUrlParam, magicTrimText, mosyUrlParam, mosyFormatDateOnly , mosyFormatDateTime} from '../../../MosyUtils/hiveUtils';

import { mosyFilterUrl } from '../../DataControl/MosyFilterEngine';

//list components
import {
  MosySmartDropdownActions,
  AddNewButton,
  MosyActionButton,
  MosyGridRowOptions,
  MosyPaginationUi,
  DeleteButton,
  MosyImageViewer
} from '../../UiControl/componentControl';

import MosySnackWidget from '../../../MosyUtils/MosySnackWidget';

//data
import { loadSubscriptionpaymentsListData, popDeleteDialog, InteprateSubscriptionpaymentsEvent  } from '../dataControl/SubscriptionpaymentsRequestHandler';

//state management
import { useSubscriptionpaymentsState } from '../dataControl/SubscriptionpaymentsStateManager';

//emberbill custom functions
//import {  } from '../../emberbill_custom_functions';

//def logo
import logo from '../../../img/logo/logo.png'; // outside public!

//large text
import ReactMarkdown from 'react-markdown';
import DynamicModalProvider from '../../../components/DynamicModalProvider';

//export list
export default function SubscriptionpaymentsList({ dataIn = {}, dataOut = {} }) {
  
  //incoming data in from parent
  const {
    customQueryStr = "",
    customProfilePath="../payments/profile",
    showDataControlSections = true,
    parentUseEffectKey = "",
    parentStateSetters=null,
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
  
  const localEventSignature = stateItem.localEventSignature
  const snackMessage = stateItem.snackMessage
  const snackOnDone = stateItem.snackOnDone
  
  //use route navigation system if need be
  const router = useRouter();
  
  useEffect(() => {
    
    const snackUrlAlert = mosyUrlParam("snack_alert")
    if(snackUrlAlert)
    {
      stateItemSetters.setSnackMessage(snackUrlAlert)
    }
    
    loadSubscriptionpaymentsListData(customQueryStr, stateItemSetters);
    
  }, [localEventSignature]);
  
  
  return (
    
    <div className="col-md-12 bg-white p-0 main_list_container  " style={{marginTop: "0px", paddingBottom: "0px"}}>
      <form method="post" onSubmit={()=>{mosyFilterUrl({tableName:"billing_transactions", keyword:stateItem.subscriptionpaymentsQuerySearchStr})}} encType="multipart/form-data">
      
      {showDataControlSections && (<div className="row justify-content-end col-md-12 text-right pt-3 pb-3 data_list_section ml-0 mr-0 mb-3 border-bottom pr-0 pl-0" id="">
        <div className="col-md-12 p-0 text-left pt-3 hive_list_title">
          <h6 className="text-muted"><b> Subscription payments </b></h6>
        </div>
        <div className="col-md-6 p-0 text-right hive_list_search_tray d-none">
          <input type="text" id="txt_billing_transactions" name="txt_billing_transactions" className="custom-search-input form-control" placeholder="Search in Subscription payments "
          onChange={(e) => stateItemSetters.setSubscriptionpaymentsQuerySearchStr(e.target.value)}
          />
          <button className="custom-search-botton" id="qbilling_transactions_btn" name="qbilling_transactions_btn" type="submit"><i className="fa fa-search mr-1"></i> Go </button>
        </div>
        <div className="col-md-12 pt-5 p-0 hive_list_search_divider" id=""></div>
        <div className="row justify-content-end m-0 p-0 col-md-12 hive_list_action_btn_tray d-none" id="">
          <div className="col-md-5 d-none p-0 text-left hive_list_nav_left_ribbon" id="">
          </div>
          <div className="col-md-12 p-0 hive_list_nav_right_ribbon" id="">
            {/*--<navgation_buttons/>--*/}
            
            <a href="list" className="medium_btn border border_set btn-white hive_list_nav_refresh ml-3"><i className="fa fa-refresh mr-1 "></i> Refresh </a>
            
          </div>
        </div>
      </div> )}
      
      
      <div className="table-responsive  data-tables bg-white bottom_tbl_handler">
        
        <div className="text-left m-0 p-0 col-md-12">
          <div className="ml-2 cpointer badge btn_neo p-2 rounded badge-primary mb-3 tbl_print_btn"
          onClick={() => {mosyPrintToPdf({elemId : "billing_transactions_print_card", defaultTitle:"Subscription payments"})}}
          >
          <i className="fa fa-print "></i> Print List
        </div>
        <div className="cpointer p-2 ml-2 badge rounded border border_set badge-whte mb-3 tbl_print_to_excel_btn"
        
        onClick={() => exportTableToExcel("billing_transactions_data_table", "Subscription payments.xlsx")}
        >
        <i className="fa fa-arrow-right "></i> Export to excel
      </div>
    </div>
    <div className="col-md-12 " id="billing_transactions_print_card">
      <table className="table table-hover  text-left printTarget" id="billing_transactions_data_table">
        <thead className="text-uppercase">
          <tr>
            <th scope="col">#</th>
            
            <th scope="col"><b>Transaction Ref.</b></th>
            <th scope="col"><b>Transations date</b></th>
            <th scope="col"><b>Amount</b></th>
            <th scope="col"><b>Account number</b></th>
            <th scope="col"><b>App name</b></th>
            
          </tr>
          
        </thead>
        <tbody>
          {stateItem.subscriptionpaymentsLoading ? (
            <tr>
              <th scope="col">#</th>
              <td colSpan="6" className="text-muted">
                <h5 className="col-md-12 text-center p-3 mb-5 text-muted"><i className="fa fa-spinner fa-spin"></i> Loading Subscription payments ...</h5>
              </td>
            </tr>
          ) : stateItem.subscriptionpaymentsListData?.length > 0 ? (
            stateItem.subscriptionpaymentsListData.map((listbilling_transactions_result, index) => (
              <Fragment key={`_row_${listbilling_transactions_result.primkey}`}>
                <tr key={listbilling_transactions_result.primkey}>
                  <td>
                    <div className="table_cell_dropdown">
                      <div className="table_cell_dropbtn"><b>{listbilling_transactions_result.row_count}</b></div>
                    </div>
                  </td>
                  
                  <td scope="col"><span title={listbilling_transactions_result.trx_id}>{magicTrimText(listbilling_transactions_result.trx_id, 70)}</span></td>
                  <td scope="col"><span title={listbilling_transactions_result.trx_date}>{mosyFormatDateOnly(listbilling_transactions_result.trx_date)}</span></td>
                  <td scope="col"><span title={listbilling_transactions_result.amount}>{magicTrimText(listbilling_transactions_result.amount, 70)}</span></td>
                  <td scope="col"><span title={listbilling_transactions_result.BillRefNumber}>{magicTrimText(listbilling_transactions_result.BillRefNumber, 70)}</span></td>
                  <td scope="col"><span title={listbilling_transactions_result.app_id}>{magicTrimText(listbilling_transactions_result._app_list_app_name_app_id, 70)}</span></td>
                  
                </tr>
                
                
              </Fragment>
              
            ))
            
          ) : (
            
            <tr><td colSpan="6" className="text-muted">
              
              
              <div className="col-md-12 text-center mt-4">
                <h6 className="col-md-12 text-center p-3 mb-5 text-muted"><i className="fa fa-search"></i> Sorry, no billing transactions records found</h6>
                
                <div className="col-md-12 pt-5 " id=""></div>
              </div>
            </td></tr>
            
          )}
        </tbody>
      </table>
    </div>
    <MosyPaginationUi
    tblName="billing_transactions"
    totalPages={stateItem.subscriptionpaymentsListPageCount}
    stateItemSetters={stateItemSetters}
    />
  </div>
  
  
</form>
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
</div>
);

}

