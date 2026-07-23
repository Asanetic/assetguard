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
import { loadSystemUsersListData, popDeleteDialog, InteprateSystemUsersEvent  } from '../dataControl/SystemUsersRequestHandler';

//state management
import { useSystemUsersState } from '../dataControl/SystemUsersStateManager';

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
export const MOSY_ACCESS_KEY = "VIEW_SYSTEM_USERS";

//live data list component

export default function SystemUsersList({ dataIn = {}, dataOut = {} }) {
  
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
  
  //manage SystemUsers states
  const [stateItem, stateItemSetters] = useSystemUsersState(settersOverrides);
  
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
      ...MosySecureFilterEngine("system_users"),
      
    }
    
    
    loadSystemUsersListData(customFilter, stateItemSetters);
    
  }, [localEventSignature]);
  
  
  
  function moduleFilterManager(action = "")
  {
    
    
    if(action === "search"){
      
      //reset pagination
      mosyUpdateUrlParam(
        "qsystem_users_page",
        "1"
      );
      
      //set url params
      mosyFilterUrl({tableName:"system_users", keyword:stateItem.systemUsersQuerySearchStr, reload:false})
      
      // clear input
      document.getElementById(
        "txt_system_users"
      ).value = "";
      
    }
    
    if(action === "refresh")
    {
      //empty Search String
      stateItemSetters.setSystemUsersQuerySearchStr("");
      
      //reset pagination
      mosyUpdateUrlParam(
        "qsystem_users_page",
        "1"
      );
      
      
      //delete search param var
      deleteUrlParam("qsystem_users")
      deleteUrlParam("system_users_mosyfilter")
      
      // clear input
      document.getElementById(
        "txt_system_users"
      ).value = "";
      
      //refresh list
      loadSystemUsersListData(customQueryStr, stateItemSetters);
      
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
      <form method="post" onSubmit={()=>{mosyFilterUrl({tableName:"system_users", keyword:stateItem.systemUsersQuerySearchStr})}} encType="multipart/form-data">
      
      {showDataControlSections && (<div className="row justify-content-end col-md-12 text-right pt-3 pb-3 data_list_section ml-0 mr-0 mb-3 border-bottom pr-0 pl-0" id="">
        <div className="col-md-6 p-0 text-left pt-3 hive_list_title">
          <h6 className="text-muted"><b> System Users </b></h6>
        </div>
        <div className="col-md-6 p-0 text-right hive_list_search_tray">
          <input type="text" id="txt_system_users" name="txt_system_users" className="custom-search-input form-control" placeholder="Search in System Users "
          onChange={(e) => stateItemSetters.setSystemUsersQuerySearchStr(e.target.value)}
          />
          <button className="custom-search-botton" id="qsystem_users_btn" name="qsystem_users_btn" type="button" onClick={() => moduleFilterManager("search")}><i className="fa fa-search mr-1"></i> Go </button>
        </div>
        <div className="col-md-12 pt-5 p-0 hive_list_search_divider" id=""></div>
        <div className="row justify-content-end m-0 p-0 col-md-12 hive_list_action_btn_tray" id="">
          <div className="col-md-5 d-none p-0 text-left hive_list_nav_left_ribbon" id="">
          </div>
          <div className="col-md-12 p-0 hive_list_nav_right_ribbon" id="">
            {/*--<navgation_buttons/>--*/}
            
            
            
            <AddNewButton src="SystemUsersList" link={customProfilePath} label="New System Users" icon="plus-circle" />
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
        onClick={() => {mosyPrintToPdf({elemId : "system_users_print_card", defaultTitle:"System Users"})}}
        >
        <i className="fa fa-print "></i> Print List
      </div>
      <div className="cpointer p-2 ml-2 badge rounded border border_set badge-whte mb-3 tbl_print_to_excel_btn"
      
      onClick={() => exportTableToExcel("system_users_data_table", "System Users.xlsx")}
      >
      <i className="fa fa-arrow-right "></i> Export to excel
    </div>
  </div>
  <div className="col-md-12 m-0 p-0" id="system_users_print_card">
    <table className="table table-hover  text-left printTarget" id="system_users_data_table">
      <thead className="text-uppercase">
        <tr>
          <th scope="col">#</th>
          <th>User Profile Photo</th>
          <th scope="col"><b>User Id</b></th>
          <th scope="col"><b>Name</b></th>
          <th scope="col"><b>Email</b></th>
          <th scope="col"><b>Telephone</b></th>
          <th scope="col"><b>Login Password</b></th>
          <th scope="col"><b>Reference Id</b></th>
          <th scope="col"><b>Registered On</b></th>
          
        </tr>
        
      </thead>
      <tbody>
        {stateItem.systemUsersLoading ? (
          <tr>
            <th scope="col">#</th>
            <td colSpan="8" className="text-muted">
              <h5 className="col-md-12 text-center p-3 mb-5 text-muted"><i className="fa fa-spinner fa-spin"></i> Loading System Users ...</h5>
            </td>
          </tr>
        ) : stateItem.systemUsersListData?.length > 0 ? (
          stateItem.systemUsersListData.map((listsystem_users_result, index) => {
            
            
            
            return(
              <Fragment key={`_row_${listsystem_users_result.primkey}`}>
                <tr key={listsystem_users_result.primkey}>
                  <td>
                    <div className="table_cell_dropdown">
                      <div className="table_cell_dropbtn">
                        
                        <b>{listsystem_users_result.row_count}</b></div>
                        <div className="table_cell_dropdown-content">
                          <MosySmartDropdownActions
                          tblName="system_users"
                          setters={{
                            
                            childStateSetters: stateItemSetters,
                            parentStateSetters: parentStateSetters
                            
                          }}
                          
                          attributes={`${listsystem_users_result.primkey}:${customProfilePath}:false`}
                          callBack={(incomingRequest) => {setChildDataOut(incomingRequest) }}
                          
                          />
                          
                        </div>
                      </div>
                    </td>
                    
                    <td>
                      <MosyImageViewer
                      media={`/api/mediaroom?media=${btoa((listsystem_users_result.user_profile_photo || ""))}`}
                      mediaRoot={""}
                      defaultLogo={logo.src}
                      imageClass="small_thumbnail"
                      />
                    </td>
                    <td scope="col"><span title={listsystem_users_result.user_id}>{magicTrimText(listsystem_users_result.user_id, 70)}</span></td>
                    <td scope="col"><span title={listsystem_users_result.name}>{magicTrimText(listsystem_users_result.name, 70)}</span></td>
                    <td scope="col"><span title={listsystem_users_result.email}>{magicTrimText(listsystem_users_result.email, 70)}</span></td>
                    <td scope="col"><span title={listsystem_users_result.telephone}>{magicTrimText(listsystem_users_result.telephone, 70)}</span></td>
                    <td scope="col"><span title={listsystem_users_result.login_password}>{magicTrimText(listsystem_users_result.login_password, 70)}</span></td>
                    <td scope="col"><span title={listsystem_users_result.reference_id}>{magicTrimText(listsystem_users_result.reference_id, 70)}</span></td>
                    <td scope="col"><span title={listsystem_users_result.registered_on}>{mosyFormatDateTime(listsystem_users_result.registered_on)}</span></td>
                    
                  </tr>
                  
                  
                </Fragment>)
                
              })
              
            ) : (
              
              <tr><td colSpan="9" className="text-muted">
                
                
                <div className="col-md-12 text-center mt-4">
                  <h6 className="col-md-12 text-center p-3 mb-5 text-muted"><i className="fa fa-search"></i> Sorry, no system users records found</h6>
                  
                  <AddNewButton src="SystemUsersList"  link={customProfilePath} label="New System Users" icon="plus-circle" />
                  <div className="col-md-12 pt-5 " id=""></div>
                </div>
              </td></tr>
              
            )}
            
            <tr className="bg-light">
              <th></th>
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
      src="SystemUsersList"
      tblName="system_users"
      totalPages={stateItem.systemUsersListPageCount}
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

