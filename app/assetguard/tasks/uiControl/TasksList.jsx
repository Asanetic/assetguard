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
import { loadTasksListData, popDeleteDialog, InteprateTasksEvent  } from '../dataControl/TasksRequestHandler';

//state management
import { useTasksState } from '../dataControl/TasksStateManager';

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
// Imports from pending-tasks.jsx
import {
  filterPendingTasks
} from '../logicControl/pending-tasks';

// Imports from completed-tasks.jsx
import {
  filterCompletedTasks
} from '../logicControl/completed-tasks';

// Imports from clients-automapper.jsx
import {
  viewClients
} from '../../clients/logicControl/clients-automapper';

// Imports from deals-automapper.jsx
import {
  viewDeals
} from '../../deals/logicControl/deals-automapper';

// Imports from users-automapper.jsx
import {
  viewUsers
} from '../../users/logicControl/users-automapper';



//export list



///component access control key
export const MOSY_ACCESS_KEY = "VIEW_TASKS";

//live data list component

export default function TasksList({ dataIn = {}, dataOut = {} }) {
  
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
  
  //manage Tasks states
  const [stateItem, stateItemSetters] = useTasksState(settersOverrides);
  
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
      ...MosySecureFilterEngine("tasks"),
      
    }
    
    
    loadTasksListData(customFilter, stateItemSetters);
    
  }, [localEventSignature]);
  
  
  
  function moduleFilterManager(action = "")
  {
    
    
    if(action === "search"){
      
      //reset pagination
      mosyUpdateUrlParam(
        "qtasks_page",
        "1"
      );
      
      //set url params
      mosyFilterUrl({tableName:"tasks", keyword:stateItem.tasksQuerySearchStr, reload:false})
      
      // clear input
      document.getElementById(
        "txt_tasks"
      ).value = "";
      
    }
    
    if(action === "refresh")
    {
      //empty Search String
      stateItemSetters.setTasksQuerySearchStr("");
      
      //reset pagination
      mosyUpdateUrlParam(
        "qtasks_page",
        "1"
      );
      
      
      //delete search param var
      deleteUrlParam("qtasks")
      deleteUrlParam("tasks_mosyfilter")
      
      // clear input
      document.getElementById(
        "txt_tasks"
      ).value = "";
      
      //refresh list
      loadTasksListData(customQueryStr, stateItemSetters);
      
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
      <form method="post" onSubmit={()=>{mosyFilterUrl({tableName:"tasks", keyword:stateItem.tasksQuerySearchStr})}} encType="multipart/form-data">
      
      {showDataControlSections && (<div className="row justify-content-end col-md-12 text-right pt-3 pb-3 data_list_section ml-0 mr-0 mb-3 border-bottom pr-0 pl-0" id="">
        <div className="col-md-6 p-0 text-left pt-3 hive_list_title">
          <h6 className="text-muted"><b> Tasks </b></h6>
        </div>
        <div className="col-md-6 p-0 text-right hive_list_search_tray">
          <input type="text" id="txt_tasks" name="txt_tasks" className="custom-search-input form-control" placeholder="Search in Tasks "
          onChange={(e) => stateItemSetters.setTasksQuerySearchStr(e.target.value)}
          />
          <button className="custom-search-botton" id="qtasks_btn" name="qtasks_btn" type="button" onClick={() => moduleFilterManager("search")}><i className="fa fa-search mr-1"></i> Go </button>
        </div>
        <div className="col-md-12 pt-5 p-0 hive_list_search_divider" id=""></div>
        <div className="row justify-content-end m-0 p-0 col-md-12 hive_list_action_btn_tray" id="">
          <div className="col-md-5 d-none p-0 text-left hive_list_nav_left_ribbon" id="">
          </div>
          <div className="col-md-12 p-0 hive_list_nav_right_ribbon" id="">
            {/*--<navgation_buttons/>--*/}
            
            <MosyActionButton
            source="TasksProfile"
            action="tasks_DataMapQCol_filterPendingTasks_btn"
            label="Pending Tasks"
            icon="clock"
            
            onClick={()=>{
              
              filterPendingTasks({
                
                customQueryStr : customQueryStr,
                
                stateItemSetters: stateItemSetters,
                
                colName: "taskStatus",
                
                colVal: "Pending",
                
                tableName: "tasks",
                
              })
              
            }}
            />
            <MosyActionButton
            source="TasksProfile"
            action="tasks_DataMapQCol_filterCompletedTasks_btn"
            label="Completed Tasks"
            icon="check-circle"
            
            onClick={()=>{
              
              filterCompletedTasks({
                
                customQueryStr : customQueryStr,
                
                stateItemSetters: stateItemSetters,
                
                colName: "taskStatus",
                
                colVal: "Completed",
                
                tableName: "tasks",
                
              })
              
            }}
            />
            
            
            <AddNewButton src="TasksList" link={customProfilePath} label="New Tasks" icon="plus-circle" />
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
        onClick={() => {mosyPrintToPdf({elemId : "tasks_print_card", defaultTitle:"Tasks"})}}
        >
        <i className="fa fa-print "></i> Print List
      </div>
      <div className="cpointer p-2 ml-2 badge rounded border border_set badge-whte mb-3 tbl_print_to_excel_btn"
      
      onClick={() => exportTableToExcel("tasks_data_table", "Tasks.xlsx")}
      >
      <i className="fa fa-arrow-right "></i> Export to excel
    </div>
  </div>
  <div className="col-md-12 m-0 p-0" id="tasks_print_card">
    <table className="table table-hover  text-left printTarget" id="tasks_data_table">
      <thead className="text-uppercase">
        <tr>
          <th scope="col">#</th>
          
          <th scope="col"><b>Task Title</b></th>
          <th scope="col"><b>Task Description</b></th>
          <th scope="col"><b>Task Type</b></th>
          <th scope="col"><b>Task Priority</b></th>
          <th scope="col"><b>Task Status</b></th>
          <th scope="col"><b>Full Name</b></th>
          <th scope="col"><b>Full Name</b></th>
          
        </tr>
        
      </thead>
      <tbody>
        {stateItem.tasksLoading ? (
          <tr>
            <th scope="col">#</th>
            <td colSpan="8" className="text-muted">
              <h5 className="col-md-12 text-center p-3 mb-5 text-muted"><i className="fa fa-spinner fa-spin"></i> Loading Tasks ...</h5>
            </td>
          </tr>
        ) : stateItem.tasksListData?.length > 0 ? (
          stateItem.tasksListData.map((listtasks_result, index) => {
            
            
            
            return(
              <Fragment key={`_row_${listtasks_result.primkey}`}>
                <tr key={listtasks_result.primkey}>
                  <td>
                    <div className="table_cell_dropdown">
                      <div className="table_cell_dropbtn">
                        
                        <b>{listtasks_result.row_count}</b></div>
                        <div className="table_cell_dropdown-content">
                          <MosySmartDropdownActions
                          tblName="tasks"
                          setters={{
                            
                            childStateSetters: stateItemSetters,
                            parentStateSetters: parentStateSetters
                            
                          }}
                          
                          attributes={`${listtasks_result.primkey}:${customProfilePath}:false`}
                          callBack={(incomingRequest) => {setChildDataOut(incomingRequest) }}
                          
                          />
                          
                          <MosyGridRowOptions
                          src="TasksList"
                          action="_client_details"
                          label=" Client Details"
                          icon="list "
                          dataIn={() => viewClients({childCol:`recordId`,parentColVal:listtasks_result.client_id,parentName:listtasks_result.task_title})}   // only runs on click now
                          callBack={(incomingRequest) => {setChildDataOut(incomingRequest) }}
                          />
                          <MosyGridRowOptions
                          src="TasksList"
                          action="_deal_details"
                          label=" Deal Details"
                          icon="list "
                          dataIn={() => viewDeals({childCol:`recordId`,parentColVal:listtasks_result.deal_id,parentName:listtasks_result.task_title})}   // only runs on click now
                          callBack={(incomingRequest) => {setChildDataOut(incomingRequest) }}
                          />
                          <MosyGridRowOptions
                          src="TasksList"
                          action="_assigned_user"
                          label=" Assigned User"
                          icon="list "
                          dataIn={() => viewUsers({childCol:`recordId`,parentColVal:listtasks_result.assigned_sales_rep,parentName:listtasks_result.task_title})}   // only runs on click now
                          callBack={(incomingRequest) => {setChildDataOut(incomingRequest) }}
                          />
                        </div>
                      </div>
                    </td>
                    
                    <td scope="col"><span title={listtasks_result.task_title}>{magicTrimText(listtasks_result.task_title, 70)}</span></td>
                    <td scope="col"><span>
                      <ReactMarkdown>
                        
                        {magicTrimText(listtasks_result.task_description, 70)}
                        
                      </ReactMarkdown>
                    </span></td>
                    <td scope="col"><span title={listtasks_result.task_type}>{magicTrimText(listtasks_result.task_type, 70)}</span></td>
                    <td scope="col"><span title={listtasks_result.task_priority}>{magicTrimText(listtasks_result.task_priority, 70)}</span></td>
                    <td scope="col"><span title={listtasks_result.task_status}>{magicTrimText(listtasks_result.task_status, 70)}</span></td>
                    <td scope="col"><span title={listtasks_result.assigned_sales_rep}>{magicTrimText(listtasks_result._users_full_name_assigned_sales_rep, 70)}</span></td>
                    <td scope="col"><span title={listtasks_result.client_id}>{magicTrimText(listtasks_result._clients_full_name_client_id, 70)}</span></td>
                    
                  </tr>
                  
                  
                </Fragment>)
                
              })
              
            ) : (
              
              <tr><td colSpan="8" className="text-muted">
                
                
                <div className="col-md-12 text-center mt-4">
                  <h6 className="col-md-12 text-center p-3 mb-5 text-muted"><i className="fa fa-search"></i> Sorry, no tasks records found</h6>
                  
                  <AddNewButton src="TasksList"  link={customProfilePath} label="New Tasks" icon="plus-circle" />
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
      src="TasksList"
      tblName="tasks"
      totalPages={stateItem.tasksListPageCount}
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

