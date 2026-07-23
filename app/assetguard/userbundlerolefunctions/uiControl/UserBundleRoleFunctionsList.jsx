'use client';
//React
import { useEffect, useState ,Fragment } from 'react';

import Link from 'next/link';

import { useRouter } from 'next/navigation';


//print utils
import { exportTableToExcel } from '../../../MosyUtils/exportToExcel';
import { mosyPrintToPdf } from '../../../MosyUtils/hiveUtils';


//access control
import {MosyAccessControl} from "../../UiControl/MosyAccessControl"
import {MosyUIGuard } from "../../UiControl/MosyUiGuard"
import { MosySecureFilterEngine  } from "../../DataControl/MosyFilterEngine";
import { mosyBtoa, mosyUpdateUrlParam } from "../../../MosyUtils/hiveUtils";



//custom utils
import { deleteUrlParam, magicTrimText, mosyUrlParam, mosyFormatDateOnly , mosyFormatDateTime, mosyTonum , mosyToggleSelectAllTblRows , mosySelectTblRows } from '../../../MosyUtils/hiveUtils';
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
import { loadUserBundleRoleFunctionsListData, popDeleteDialog, InteprateUserBundleRoleFunctionsEvent  } from '../dataControl/UserBundleRoleFunctionsRequestHandler';

//state management
import { useUserBundleRoleFunctionsState } from '../dataControl/UserBundleRoleFunctionsStateManager';

import logo from '../../../img/logo/logo.png'; // outside public!

//large text
import ReactMarkdown from 'react-markdown';

//routes manager
///handle routes
import { getApiRoutes } from '../../AppRoutes/apiRoutesHandler';

//custom fuctions
//import {  } from '../../AppCore/coreUtils';

// Use default base root (/)
const apiRoutes = getApiRoutes();
// ════════════════════════════════════════════════════════════════
// LIST PAGE FUNCTION IMPORTS
// ════════════════════════════════════════════════════════════════


//export list



///component access control key
export const MOSY_ACCESS_KEY = "VIEW_USER_BUNDLE_ROLE_FUNCTIONS";

//live data list component

export default function UserBundleRoleFunctionsList({ dataIn = {}, dataOut = {} }) {
  
  //incoming data in from parent
  const {
    customQueryStr = "",
    customProfilePath="./profile",
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
  
  //manage UserBundleRoleFunctions states
  const [stateItem, stateItemSetters] = useUserBundleRoleFunctionsState(settersOverrides);
  
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
    
    const customFilter = {
      
      ...customQueryStr,
      ...MosySecureFilterEngine("user_bundle_role_functions"),
      
    }
    
    
    loadUserBundleRoleFunctionsListData(customFilter, stateItemSetters);
    
  }, [localEventSignature]);
  
  
  
  function moduleFilterManager(action = "")
  {
    
    
    if(action === "search"){
      
      //reset pagination
      mosyUpdateUrlParam(
        "quser_bundle_role_functions_page",
        "1"
      );
      
      //set url params
      mosyFilterUrl({tableName:"user_bundle_role_functions", keyword:stateItem.userBundleRoleFunctionsQuerySearchStr, reload:false})
      
      // clear input
      document.getElementById(
        "txt_user_bundle_role_functions"
      ).value = "";
      
    }
    
    if(action === "refresh")
    {
      //empty Search String
      stateItemSetters.setUserBundleRoleFunctionsQuerySearchStr("");
      
      //reset pagination
      mosyUpdateUrlParam(
        "quser_bundle_role_functions_page",
        "1"
      );
      
      
      //delete search param var
      deleteUrlParam("quser_bundle_role_functions")
      deleteUrlParam("user_bundle_role_functions_mosyfilter")
      
      // clear input
      document.getElementById(
        "txt_user_bundle_role_functions"
      ).value = "";
      
      //refresh list
      loadUserBundleRoleFunctionsListData(customQueryStr, stateItemSetters);
      
    }
    
    //refresh sign
    stateItemSetters.setLocalEventSignature(Date.now())
    
  }
  
  
  //access control managemant
  const [allowed, setAllowed] = useState(null);
  
  useEffect(() => {
    setAllowed(MosyAccessControl(MOSY_ACCESS_KEY));
  }, []);
  
  if (allowed === null) return null;
  if (!allowed) return <MosyUIGuard />;
  
  return (
    
    <div className={`col-md-12  p-0 m-0  ${showDataControlSections && ("main_list_container")}  `} style={{marginTop: "0px", paddingBottom: "0px"}}>
      <form method="post" onSubmit={()=>{mosyFilterUrl({tableName:"user_bundle_role_functions", keyword:stateItem.userBundleRoleFunctionsQuerySearchStr})}} encType="multipart/form-data">
      
      {showDataControlSections && (<div className="row justify-content-end col-md-12 text-right pt-3 pb-3 data_list_section ml-0 mr-0 mb-3 border-bottom pr-0 pl-0" id="">
        <div className="col-md-6 p-0 text-left pt-3 hive_list_title">
          <h6 className="text-muted"><b> User Bundle Role Functions </b></h6>
        </div>
        <div className="col-md-6 p-0 text-right hive_list_search_tray">
          <input type="text" id="txt_user_bundle_role_functions" name="txt_user_bundle_role_functions" className="custom-search-input form-control" placeholder="Search in User Bundle Role Functions "
          onChange={(e) => stateItemSetters.setUserBundleRoleFunctionsQuerySearchStr(e.target.value)}
          />
          <button className="custom-search-botton" id="quser_bundle_role_functions_btn" name="quser_bundle_role_functions_btn" type="button" onClick={() => moduleFilterManager("search")}><i className="fa fa-search mr-1"></i> Go </button>
        </div>
        <div className="col-md-12 pt-5 p-0 hive_list_search_divider" id=""></div>
        <div className="row justify-content-end m-0 p-0 col-md-12 hive_list_action_btn_tray" id="">
          <div className="col-md-5 d-none p-0 text-left hive_list_nav_left_ribbon" id="">
          </div>
          <div className="col-md-12 p-0 hive_list_nav_right_ribbon" id="">
            {/*--<navgation_buttons/>--*/}
            
            
            
            <AddNewButton src="UserBundleRoleFunctionsList" link={customProfilePath} label="New User Bundle Role Functions" icon="plus-circle" />
            <div
            className="cpointer medium_btn border border_set btn-white hive_list_nav_refresh ml-3"
            
            onClick={() => moduleFilterManager("refresh")}
            >
            <i className="fa fa-refresh mr-1"></i> Refresh
          </div>
        </div>
      </div>
    </div> )}
    
    
    <div className="table-responsive  data-tables bottom_tbl_handler">
      
      
      <div className="text-left m-0 p-0 col-md-12">
        <div className="ml-2 cpointer badge btn_neo p-2 rounded badge-primary mb-3 tbl_print_btn"
        onClick={() => {mosyPrintToPdf({elemId : "user_bundle_role_functions_print_card", defaultTitle:"User Bundle Role Functions"})}}
        >
        <i className="fa fa-print "></i> Print List
      </div>
      <div className="cpointer p-2 ml-2 badge rounded border border_set badge-whte mb-3 tbl_print_to_excel_btn"
      
      onClick={() => exportTableToExcel("user_bundle_role_functions_data_table", "User Bundle Role Functions.xlsx")}
      >
      <i className="fa fa-arrow-right "></i> Export to excel
    </div>
  </div>
  <div className="col-md-12 m-0 p-0" id="user_bundle_role_functions_print_card">
    <table className="table table-hover  text-left printTarget" id="user_bundle_role_functions_data_table">
      <thead className="text-uppercase">
        <tr>
          <th scope="col">#</th>
          
          <th scope="col"><b>Bundle Id</b></th>
          <th scope="col"><b>Bundle Name</b></th>
          <th scope="col"><b>Role Id</b></th>
          <th scope="col"><b>Role Name</b></th>
          <th scope="col"><b>Remark</b></th>
          <th scope="col"><b>Created At</b></th>
          <th scope="col"><b>Updated At</b></th>
          
        </tr>
        
      </thead>
      <tbody>
        {stateItem.userBundleRoleFunctionsLoading ? (
          <tr>
            <th scope="col">#</th>
            <td colSpan="8" className="text-muted">
              <h5 className="col-md-12 text-center p-3 mb-5 text-muted"><i className="fa fa-spinner fa-spin"></i> Loading User Bundle Role Functions ...</h5>
            </td>
          </tr>
        ) : stateItem.userBundleRoleFunctionsListData?.length > 0 ? (
          stateItem.userBundleRoleFunctionsListData.map((listuser_bundle_role_functions_result, index) => {
            
            
            
            return(
              <Fragment key={`_row_${listuser_bundle_role_functions_result.primkey}`}>
                <tr key={listuser_bundle_role_functions_result.primkey}>
                  <td>
                    <div className="table_cell_dropdown">
                      <div className="table_cell_dropbtn">
                        
                        <b>{listuser_bundle_role_functions_result.row_count}</b></div>
                        <div className="table_cell_dropdown-content">
                          <MosySmartDropdownActions
                          tblName="user_bundle_role_functions"
                          setters={{
                            
                            childStateSetters: stateItemSetters,
                            parentStateSetters: parentStateSetters
                            
                          }}
                          
                          attributes={`${listuser_bundle_role_functions_result.primkey}:${customProfilePath}:false`}
                          callBack={(incomingRequest) => {setChildDataOut(incomingRequest) }}
                          
                          />
                          
                        </div>
                      </div>
                    </td>
                    
                    <td scope="col"><span title={listuser_bundle_role_functions_result.bundle_id}>{magicTrimText(listuser_bundle_role_functions_result.bundle_id, 70)}</span></td>
                    <td scope="col"><span title={listuser_bundle_role_functions_result.bundle_name}>{magicTrimText(listuser_bundle_role_functions_result.bundle_name, 70)}</span></td>
                    <td scope="col"><span title={listuser_bundle_role_functions_result.role_id}>{magicTrimText(listuser_bundle_role_functions_result.role_id, 70)}</span></td>
                    <td scope="col"><span title={listuser_bundle_role_functions_result.role_name}>{magicTrimText(listuser_bundle_role_functions_result.role_name, 70)}</span></td>
                    <td scope="col"><span>
                      <ReactMarkdown>
                        
                        {magicTrimText(listuser_bundle_role_functions_result.remark, 70)}
                        
                      </ReactMarkdown>
                    </span></td>
                    <td scope="col"><span title={listuser_bundle_role_functions_result.created_at}>{mosyFormatDateTime(listuser_bundle_role_functions_result.created_at)}</span></td>
                    <td scope="col"><span title={listuser_bundle_role_functions_result.updated_at}>{mosyFormatDateTime(listuser_bundle_role_functions_result.updated_at)}</span></td>
                    
                  </tr>
                  
                  
                </Fragment>)
                
              })
              
            ) : (
              
              <tr><td colSpan="8" className="text-muted">
                
                
                <div className="col-md-12 text-center mt-4">
                  <h6 className="col-md-12 text-center p-3 mb-5 text-muted"><i className="fa fa-search"></i> Sorry, no user bundle role functions records found</h6>
                  
                  <AddNewButton src="UserBundleRoleFunctionsList"  link={customProfilePath} label="New User Bundle Role Functions" icon="plus-circle" />
                  <div className="col-md-12 pt-5 " id=""></div>
                </div>
              </td></tr>
              
            )}
            
            <tr className="bg-light">
              <th></th>
              
              <th scope="col"><b></b></th>
              <th scope="col"><b></b></th>
              <th scope="col"><b></b></th>
              <th scope="col"><b></b></th>
              <th scope="col"><b></b></th>
              <th scope="col"><b></b></th>
              <th scope="col"><b></b></th>
              
            </tr>
          </tbody>
          
        </table>
      </div>
      <MosyPaginationUi
      src="UserBundleRoleFunctionsList"
      tblName="user_bundle_role_functions"
      totalPages={stateItem.userBundleRoleFunctionsListPageCount}
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

