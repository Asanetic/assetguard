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
import { loadUsersListData, popDeleteDialog, InteprateUsersEvent  } from '../dataControl/UsersRequestHandler';

//state management
import { useUsersState } from '../dataControl/UsersStateManager';

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
// Imports from active-users.jsx
import {
  filterActiveUsers
} from '../logicControl/active-users';

// Imports from suspended-users.jsx
import {
  filterSuspendedUsers
} from '../logicControl/suspended-users';

// Imports from leads-automapper.jsx
import {
  viewLeads
} from '../../leads/logicControl/leads-automapper';

// Imports from clients-automapper.jsx
import {
  viewClients
} from '../../clients/logicControl/clients-automapper';

// Imports from deals-automapper.jsx
import {
  viewDeals
} from '../../deals/logicControl/deals-automapper';

// Imports from tasks-automapper.jsx
import {
  viewTasks
} from '../../tasks/logicControl/tasks-automapper';



//export list



///component access control key
export const MOSY_ACCESS_KEY = "VIEW_USERS";

//live data list component

export default function UsersList({ dataIn = {}, dataOut = {} }) {
  
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
  
  //manage Users states
  const [stateItem, stateItemSetters] = useUsersState(settersOverrides);
  
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
      ...MosySecureFilterEngine("users"),
      
    }
    
    
    loadUsersListData(customFilter, stateItemSetters);
    
  }, [localEventSignature]);
  
  
  
  function moduleFilterManager(action = "")
  {
    
    
    if(action === "search"){
      
      //reset pagination
      mosyUpdateUrlParam(
        "qusers_page",
        "1"
      );
      
      //set url params
      mosyFilterUrl({tableName:"users", keyword:stateItem.usersQuerySearchStr, reload:false})
      
      // clear input
      document.getElementById(
        "txt_users"
      ).value = "";
      
    }
    
    if(action === "refresh")
    {
      //empty Search String
      stateItemSetters.setUsersQuerySearchStr("");
      
      //reset pagination
      mosyUpdateUrlParam(
        "qusers_page",
        "1"
      );
      
      
      //delete search param var
      deleteUrlParam("qusers")
      deleteUrlParam("users_mosyfilter")
      
      // clear input
      document.getElementById(
        "txt_users"
      ).value = "";
      
      //refresh list
      loadUsersListData(customQueryStr, stateItemSetters);
      
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
      <form method="post" onSubmit={()=>{mosyFilterUrl({tableName:"users", keyword:stateItem.usersQuerySearchStr})}} encType="multipart/form-data">
      
      {showDataControlSections && (<div className="row justify-content-end col-md-12 text-right pt-3 pb-3 data_list_section ml-0 mr-0 mb-3 border-bottom pr-0 pl-0" id="">
        <div className="col-md-6 p-0 text-left pt-3 hive_list_title">
          <h6 className="text-muted"><b> Users </b></h6>
        </div>
        <div className="col-md-6 p-0 text-right hive_list_search_tray">
          <input type="text" id="txt_users" name="txt_users" className="custom-search-input form-control" placeholder="Search in Users "
          onChange={(e) => stateItemSetters.setUsersQuerySearchStr(e.target.value)}
          />
          <button className="custom-search-botton" id="qusers_btn" name="qusers_btn" type="button" onClick={() => moduleFilterManager("search")}><i className="fa fa-search mr-1"></i> Go </button>
        </div>
        <div className="col-md-12 pt-5 p-0 hive_list_search_divider" id=""></div>
        <div className="row justify-content-end m-0 p-0 col-md-12 hive_list_action_btn_tray" id="">
          <div className="col-md-5 d-none p-0 text-left hive_list_nav_left_ribbon" id="">
          </div>
          <div className="col-md-12 p-0 hive_list_nav_right_ribbon" id="">
            {/*--<navgation_buttons/>--*/}
            
            <MosyActionButton
            source="UsersProfile"
            action="users_DataMapQCol_filterActiveUsers_btn"
            label="Active Users"
            icon="user-check"
            
            onClick={()=>{
              
              filterActiveUsers({
                
                customQueryStr : customQueryStr,
                
                stateItemSetters: stateItemSetters,
                
                colName: "accountStatus",
                
                colVal: "Active",
                
                tableName: "users",
                
              })
              
            }}
            />
            <MosyActionButton
            source="UsersProfile"
            action="users_DataMapQCol_filterSuspendedUsers_btn"
            label="Suspended Users"
            icon="pause-circle"
            
            onClick={()=>{
              
              filterSuspendedUsers({
                
                customQueryStr : customQueryStr,
                
                stateItemSetters: stateItemSetters,
                
                colName: "accountStatus",
                
                colVal: "Suspended",
                
                tableName: "users",
                
              })
              
            }}
            />
            
            
            <AddNewButton src="UsersList" link={customProfilePath} label="New Users" icon="plus-circle" />
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
        onClick={() => {mosyPrintToPdf({elemId : "users_print_card", defaultTitle:"Users"})}}
        >
        <i className="fa fa-print "></i> Print List
      </div>
      <div className="cpointer p-2 ml-2 badge rounded border border_set badge-whte mb-3 tbl_print_to_excel_btn"
      
      onClick={() => exportTableToExcel("users_data_table", "Users.xlsx")}
      >
      <i className="fa fa-arrow-right "></i> Export to excel
    </div>
  </div>
  <div className="col-md-12 m-0 p-0" id="users_print_card">
    <table className="table table-hover  text-left printTarget" id="users_data_table">
      <thead className="text-uppercase">
        <tr>
          <th scope="col">#</th>
          <th>Profile Photo</th>
          <th scope="col"><b>Full Name</b></th>
          <th scope="col"><b>Phone Number</b></th>
          <th scope="col"><b>Email Address</b></th>
          <th scope="col"><b>User Password</b></th>
          <th scope="col"><b>User Role</b></th>
          <th scope="col"><b>Department Name</b></th>
          
        </tr>
        
      </thead>
      <tbody>
        {stateItem.usersLoading ? (
          <tr>
            <th scope="col">#</th>
            <td colSpan="7" className="text-muted">
              <h5 className="col-md-12 text-center p-3 mb-5 text-muted"><i className="fa fa-spinner fa-spin"></i> Loading Users ...</h5>
            </td>
          </tr>
        ) : stateItem.usersListData?.length > 0 ? (
          stateItem.usersListData.map((listusers_result, index) => {
            
            
            
            return(
              <Fragment key={`_row_${listusers_result.primkey}`}>
                <tr key={listusers_result.primkey}>
                  <td>
                    <div className="table_cell_dropdown">
                      <div className="table_cell_dropbtn">
                        
                        <b>{listusers_result.row_count}</b></div>
                        <div className="table_cell_dropdown-content">
                          <MosySmartDropdownActions
                          tblName="users"
                          setters={{
                            
                            childStateSetters: stateItemSetters,
                            parentStateSetters: parentStateSetters
                            
                          }}
                          
                          attributes={`${listusers_result.primkey}:${customProfilePath}:false`}
                          callBack={(incomingRequest) => {setChildDataOut(incomingRequest) }}
                          
                          />
                          
                          <MosyGridRowOptions
                          src="UsersList"
                          action="_assigned_leads"
                          label=" Assigned Leads"
                          icon="list "
                          dataIn={() => viewLeads({childCol:`assignedSalesRep`,parentColVal:listusers_result.record_id,parentName:listusers_result.full_name})}   // only runs on click now
                          callBack={(incomingRequest) => {setChildDataOut(incomingRequest) }}
                          />
                          <MosyGridRowOptions
                          src="UsersList"
                          action="_assigned_clients"
                          label=" Assigned Clients"
                          icon="list "
                          dataIn={() => viewClients({childCol:`assignedSalesRep`,parentColVal:listusers_result.record_id,parentName:listusers_result.full_name})}   // only runs on click now
                          callBack={(incomingRequest) => {setChildDataOut(incomingRequest) }}
                          />
                          <MosyGridRowOptions
                          src="UsersList"
                          action="_assigned_deals"
                          label=" Assigned Deals"
                          icon="list "
                          dataIn={() => viewDeals({childCol:`assignedSalesRep`,parentColVal:listusers_result.record_id,parentName:listusers_result.full_name})}   // only runs on click now
                          callBack={(incomingRequest) => {setChildDataOut(incomingRequest) }}
                          />
                          <MosyGridRowOptions
                          src="UsersList"
                          action="_assigned_tasks"
                          label=" Assigned Tasks"
                          icon="list "
                          dataIn={() => viewTasks({childCol:`assignedSalesRep`,parentColVal:listusers_result.record_id,parentName:listusers_result.full_name})}   // only runs on click now
                          callBack={(incomingRequest) => {setChildDataOut(incomingRequest) }}
                          />
                        </div>
                      </div>
                    </td>
                    
                    <td>
                      <MosyImageViewer
                      media={`/api/mediaroom?media=${btoa((listusers_result.profile_photo || ""))}`}
                      mediaRoot={""}
                      defaultLogo={logo.src}
                      imageClass="small_thumbnail"
                      />
                    </td>
                    <td scope="col"><span title={listusers_result.full_name}>{magicTrimText(listusers_result.full_name, 70)}</span></td>
                    <td scope="col"><span title={listusers_result.phone_number}>{magicTrimText(listusers_result.phone_number, 70)}</span></td>
                    <td scope="col"><span title={listusers_result.email_address}>{magicTrimText(listusers_result.email_address, 70)}</span></td>
                    <td scope="col"><span title={listusers_result.user_password}>{magicTrimText(listusers_result.user_password, 70)}</span></td>
                    <td scope="col"><span title={listusers_result.user_role}>{magicTrimText(listusers_result.user_role, 70)}</span></td>
                    <td scope="col"><span title={listusers_result.department_name}>{magicTrimText(listusers_result.department_name, 70)}</span></td>
                    
                  </tr>
                  
                  
                </Fragment>)
                
              })
              
            ) : (
              
              <tr><td colSpan="8" className="text-muted">
                
                
                <div className="col-md-12 text-center mt-4">
                  <h6 className="col-md-12 text-center p-3 mb-5 text-muted"><i className="fa fa-search"></i> Sorry, no users records found</h6>
                  
                  <AddNewButton src="UsersList"  link={customProfilePath} label="New Users" icon="plus-circle" />
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
              
            </tr>
          </tbody>
          
        </table>
      </div>
      <MosyPaginationUi
      src="UsersList"
      tblName="users"
      totalPages={stateItem.usersListPageCount}
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

