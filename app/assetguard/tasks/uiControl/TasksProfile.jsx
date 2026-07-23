'use client';

//React
import { useEffect, useState } from 'react';

import Link from 'next/link';

import { useRouter } from 'next/navigation';
//access control
import {MosyAccessControl} from "../../UiControl/MosyAccessControl"
import {MosyUIGuard } from "../../UiControl/MosyUiGuard"


//components
import { MosyAlertCard, MosyNotify ,closeMosyModal } from  '../../../MosyUtils/ActionModals';
import MosySnackWidget from '../../../MosyUtils/MosySnackWidget';

//basic utils
import { mosyScrollTo , deleteUrlParam, mosyFormInputHandler,mosyUrlParam ,mosyTonum  } from '../../../MosyUtils/hiveUtils';

//data control and processors
import { inteprateTasksFormAction, tasksProfileData , popDeleteDialog, InteprateTasksEvent } from '../dataControl/TasksRequestHandler';

//state management
import { useTasksState } from '../dataControl/TasksStateManager';

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

//def logo
import logo from '../../../img/logo/logo.png'; // outside public!

import MosyHtmlEditor from '../../../MosyUtils/htmlEditor'

//routes manager
///handle routes
import { getApiRoutes } from '../../AppRoutes/apiRoutesHandler';

// Use default base root (/)
const apiRoutes = getApiRoutes();

import {InteprateClientsEvent} from '../../clients/dataControl/ClientsRequestHandler';
import ClientsList from '../../clients/uiControl/ClientsList';
import {InteprateDealsEvent} from '../../deals/dataControl/DealsRequestHandler';
import DealsList from '../../deals/uiControl/DealsList';
import {InteprateUsersEvent} from '../../users/dataControl/UsersRequestHandler';
import UsersList from '../../users/uiControl/UsersList';
import ClientsProfile from '../../clients/uiControl/ClientsProfile';
import DealsProfile from '../../deals/uiControl/DealsProfile';
import UsersProfile from '../../users/uiControl/UsersProfile';
// ════════════════════════════════════════════════════════════════
// PROFILE PAGE FUNCTION IMPORTS
// ════════════════════════════════════════════════════════════════
// Imports from mark-completed.jsx
import {
  markTaskCompleted
} from '../logicControl/mark-completed';

// Imports from mark-overdue.jsx
import {
  markTaskOverdue
} from '../logicControl/mark-overdue';

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



// export profile

//import minilist component manager
import { MosyProfileSection} from '../../UiControl/dataMapUiControl';


///component access control key
export const MOSY_ACCESS_KEY = "MANAGE_TASKS";

//live data detial / profile component

export default function TasksProfile({ dataIn = {}, dataOut = {} }) {
  
  //initiate data exchange manifest
  //incoming data from parent
  const {
    showNavigationIsle = true,
    customQueryStr = "",
    backToList="./list",
    parentUseEffectKey = "",
    parentStateSetters=null,
    customProfileData={},
    hostParent="TasksMainProfilePage",
    parentProfileItemId = "TasksProfileTray"
    
  } = dataIn;
  
  //outgoing data to parent
  const {
    setChildDataOut = () => {},
    setChildDataOutSignature = () => {},
  } = dataOut;
  
  
  //set default state values
  const settersOverrides  = {localEventSignature : parentUseEffectKey,   activeScrollId : parentProfileItemId}
  
  //manage Tasks states
  const [stateItem, stateItemSetters] = useTasksState(settersOverrides);
  const tasksNode = stateItem.tasksNode
  
  // -- basic states --//
  const paramTasksUptoken  = stateItem.tasksUptoken
  const tasksActionStatus = stateItem.tasksActionStatus
  const snackMessage = stateItem.snackMessage
  const activeScrollId = stateItem.activeScrollId
  
  //const snackOnDone = stateItem.snackOnDone
  
  const localEventSignature = stateItem.localEventSignature
  
  const handleInputChange = mosyFormInputHandler(stateItemSetters.setTasksNode);
  
  //use route navigation system
  const router = useRouter();
  
  //manage post form
  function postTasksFormData(e) {
    
    MosyNotify({message: "Sending request",icon:"send"})
    
    inteprateTasksFormAction(e, stateItemSetters).then(response=>{
      
      setChildDataOut({
        
        actionName : response.actionName,
        dataToken : response.newToken,
        actionsSource : "postTasksFormData",
        setters :{
          
          childStateSetters: stateItemSetters,
          parentStateSetters: parentStateSetters
          
        }
        
      })
      
      //focus on this form on submission
      stateItemSetters.setActiveScrollId("TasksProfileTray")
      mosyScrollTo(activeScrollId)
      
      closeMosyModal()
      
    })
    
  }
  
  useEffect(() => {
    
    tasksProfileData(customQueryStr, stateItemSetters, router, customProfileData)
    
    mosyScrollTo(activeScrollId)
    
  }, [localEventSignature]);
  
  
  
  //child queries use effect
  
  //setClientsCustomProfileQuery Script
  const setClientsCustomProfileQuery = stateItemSetters.setClientsCustomProfileQuery;
  const clientsCustomProfileQuery =  stateItem.clientsCustomProfileQuery;
  
  useEffect(() => {
    if (tasksNode?.primkey && setClientsCustomProfileQuery) {
      
      const query = {recordId:btoa(tasksNode?.client_id)    };
      
      const tokenUrl = mosyUrlParam("clients_dataNode")
      
      if(!tokenUrl)
      {
        setClientsCustomProfileQuery(query);
      }
      
    }
  }, [tasksNode, setClientsCustomProfileQuery]);
  
  //setDealsCustomProfileQuery Script
  const setDealsCustomProfileQuery = stateItemSetters.setDealsCustomProfileQuery;
  const dealsCustomProfileQuery =  stateItem.dealsCustomProfileQuery;
  
  useEffect(() => {
    if (tasksNode?.primkey && setDealsCustomProfileQuery) {
      
      const query = {recordId:btoa(tasksNode?.deal_id)        };
      
      const tokenUrl = mosyUrlParam("deals_dataNode")
      
      if(!tokenUrl)
      {
        setDealsCustomProfileQuery(query);
      }
      
    }
  }, [tasksNode, setDealsCustomProfileQuery]);
  
  //setUsersCustomProfileQuery Script
  const setUsersCustomProfileQuery = stateItemSetters.setUsersCustomProfileQuery;
  const usersCustomProfileQuery =  stateItem.usersCustomProfileQuery;
  
  useEffect(() => {
    if (tasksNode?.primkey && setUsersCustomProfileQuery) {
      
      const query = {recordId:btoa(tasksNode?.assigned_sales_rep)            };
      
      const tokenUrl = mosyUrlParam("users_dataNode")
      
      if(!tokenUrl)
      {
        setUsersCustomProfileQuery(query);
      }
      
    }
  }, [tasksNode, setUsersCustomProfileQuery]);
  
  
  //access control managemant
  const [allowed, setAllowed] = useState(null);
  
  useEffect(() => {
    setAllowed(MosyAccessControl(MOSY_ACCESS_KEY));
  }, []);
  
  if (allowed === null) return null;
  if (!allowed) return <MosyUIGuard />;
  
  return (
    
    <div className="p-0 col-md-12 text-center row justify-content-center m-0  " id="TasksProfileTray">
      {/* ================== Start Feature Section========================== ------*/}
      
      
      <div className="col-md-12 rounded text-left p-2 mb-0  bg-white ">
        <div className={` profile_container col-md-12 m-0 p-0  ${showNavigationIsle &&("pr-lg-4 pl-lg-4 m-0")}`}>
          <form onSubmit={postTasksFormData} encType="multipart/form-data" id="tasks_profile_form">
            
            {/*    Title isle      */}
            <div className="col-md-12 pt-4 p-0 hive_profile_title_top d-lg-none" id=""></div>
            <h3 className="col-md-12 title_text text-left p-0 pt-3 hive_profile_title row justify-content-center m-0 ">
              <div className="col m-0 p-0 pb-3">
                
                {
                  tasksNode?.primkey ? (
                    
                    <span>{`Tasks / ${tasksNode?.task_description}`}</span>
                    
                  ) : customProfileData?.TasksTitle ? (
                    
                    <span>{customProfileData.TasksTitle}</span>
                    
                  ) : (
                    
                    <span>New Tasks</span>
                    
                  )}
                  
                </div>
                <>{!showNavigationIsle && (<div className="col m-0 p-0 text-right ">
                  {paramTasksUptoken && (
                    <DeleteButton
                    src="TasksMainProfilePage"
                    tableName="tasks"
                    uptoken={paramTasksUptoken}
                    stateItemSetters={stateItemSetters}
                    parentStateSetters={parentStateSetters}
                    
                    onDelete={popDeleteDialog}
                    />
                  )}
                </div>)}</>
              </h3>
              {/*    Title isle      */}
              
              
              
              {/*    Navigation isle      */}
              <><div className="row justify-content-end m-0 p-0 col-md-12  p-3  hive_profile_navigation " id="">
                <div className="col-md-4 text-left p-0 hive_profile_nav_back_to_list_tray" id="">
                  
                  {showNavigationIsle && (
                    <>
                    <Link href={backToList} className="text-info hive_profile_nav_back_to_list "><i className="fa fa-arrow-left"></i> Back to list</Link>
                  </>
                )}
                
              </div>
              <div className="col-md-8 p-0 text-right hive_profile_nav_add_new_tray" id="">
                
                
                
                {paramTasksUptoken && (
                  <>
                  
                  <MosyActionButton
                  source="TasksProfile"
                  action="tasks_DataMap_markTaskCompleted_btn"
                  label="Mark Completed"
                  icon="check-circle"
                  
                  onClick={()=>{
                    
                    markTaskCompleted({
                      
                      title: `Mark {{task_title}} completed`,
                      
                      component: TasksProfile,
                      
                      stateitemsetters: stateItemSetters,
                      
                      parentTable: "tasks",
                      
                      destTable: "tasks",
                      
                      fieldsetstr: 'task_status|Completed',
                      
                      profileDataNode: tasksNode,
                      
                      dataInterpreter: InteprateTasksEvent
                      
                    })
                    
                  }}
                  />
                  <MosyActionButton
                  source="TasksProfile"
                  action="tasks_DataMap_markTaskOverdue_btn"
                  label="Mark Overdue"
                  icon="alert-circle"
                  
                  onClick={()=>{
                    
                    markTaskOverdue({
                      
                      title: `Mark {{task_title}} overdue`,
                      
                      component: TasksProfile,
                      
                      stateitemsetters: stateItemSetters,
                      
                      parentTable: "tasks",
                      
                      destTable: "tasks",
                      
                      fieldsetstr: 'task_status|Overdue',
                      
                      profileDataNode: tasksNode,
                      
                      dataInterpreter: InteprateTasksEvent
                      
                    })
                    
                  }}
                  />
                  <MosyActionButton
                  source="TasksProfile"
                  action="view_client_details_profile_action_btn"
                  label="View Client Details"
                  icon="list"
                  
                  onClick={()=>{
                    
                    viewClients({childCol:`recordId`,parentColVal:tasksNode.client_id,parentName:tasksNode.task_title})
                    
                  }}
                  />
                  <MosyActionButton
                  source="TasksProfile"
                  action="view_deal_details_profile_action_btn"
                  label="View Deal Details"
                  icon="list"
                  
                  onClick={()=>{
                    
                    viewDeals({childCol:`recordId`,parentColVal:tasksNode.deal_id,parentName:tasksNode.task_title})
                    
                  }}
                  />
                  
                  <div className="position-relative d-inline-block mr-2">
                    
                    <MosyActionButton
                    source="TasksProfile"
                    action="more_profile_action_btn"
                    label="More..."
                    icon="ellipsis-v"
                    
                    onClick={(e)=>{
                      
                      const node = document.getElementById("Tasks_more_profile_actions");
                      
                      if(node.style.display === "block")
                      {
                        node.style.display = "none";
                      }
                      else
                      {
                        const rect = e.currentTarget.getBoundingClientRect();
                        
                        node.style.top = (rect.bottom + 8) + "px";
                        
                        node.style.display = "block";
                      }
                      
                    }}
                    />
                    
                    <div
                    id="Tasks_more_profile_actions"
                    
                    style={{
                      display:"none",
                      position:"fixed",
                      left:"10%",
                      top:"20%",
                      width:"80%",
                      zIndex:"3",
                      borderRadius:"16px",
                      boxShadow:"0 8px 32px rgba(0,0,0,0.18)",
                      overflow:"hidden"
                    }}
                    
                    className="bg-white border p-0"
                    >
                    
                    <div
                    className="d-flex align-items-center justify-content-between px-3 py-2 btn-primary"
                    style={{ borderBottom:"1px solid #e5e7eb" }}
                    >
                    
                    <h6 className="m-0 fw-bold" style={{ fontSize:"0.95rem" }}>
                      
                      <i
                      className="fa fa-grid mr-2"
                      style={{ color:"#6c757d" }}
                      ></i>
                      
                      
                      {
                        tasksNode?.primkey ? (
                          
                          <span>{`Tasks / ${tasksNode?.task_description}`}</span>
                          
                        ) : customProfileData?.TasksTitle ? (
                          
                          <span>{customProfileData.TasksTitle}</span>
                          
                        ) : (
                          
                          <span>New Tasks</span>
                          
                        )}
                        - advanced options
                        
                      </h6>
                      
                      <button
                      type="button"
                      aria-label="Close"
                      
                      onClick={()=>{
                        document.getElementById("Tasks_more_profile_actions").style.display = "none";
                      }}
                      
                      style={{
                        background:"none",
                        border:"none",
                        cursor:"pointer",
                        padding:"4px 8px",
                        borderRadius:"8px",
                        fontSize:"1.1rem",
                        color:"#6c757d"
                      }}
                      >
                      
                      <i className="fa fa-times text-light"></i>
                      
                    </button>
                    
                  </div>
                  
                  <div
                  className="p-3"
                  
                  onClick={()=>{
                    document.getElementById("Tasks_more_profile_actions").style.display = "none";
                  }}
                  >
                  
                  <div className="row m-0 align-items-center">
                    
                    
                    <div className="col-auto p-1">
                      
                      <MosyActionButton
                      source="TasksProfile"
                      action="view_assigned_user_profile_action_btn"
                      label="View Assigned User"
                      icon="list"
                      
                      onClick={()=>{
                        
                        viewUsers({childCol:`recordId`,parentColVal:tasksNode.assigned_sales_rep,parentName:tasksNode.task_title})
                        
                      }}
                      />
                    </div>
                    
                  </div>
                  
                </div>
                
              </div>
              
            </div>
          </>
        )}
        
        {paramTasksUptoken && showNavigationIsle && (
          <>
          
          <DeleteButton
          src="TasksMainProfilePage"
          tableName="tasks"
          uptoken={paramTasksUptoken}
          stateItemSetters={stateItemSetters}
          parentStateSetters={parentStateSetters}
          router={router}
          onDelete={popDeleteDialog}
          />
          
          
          <AddNewButton
          src="TasksMainProfilePage"
          tableName="tasks"
          link="./profile"
          label="New Tasks"
          icon="plus-circle" />
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
        <div className="col-md-12 bg-white border border_set shadow-md p-4 mb-4 hive_form_section  ">
          <h5 className="col-md-12 row p-2 justify-content-center p-0 m-0">
            <div className="col-md-3 bg-dark mb-3 mb-lg-0 mt-lg-3" style={{height: "1px"}}></div>
            <div className="col-md-5 text-center">Basic Information</div>
            <div className="col-md-4 bg-dark mt-3" style={{height: "1px"}}></div>
          </h5>
          
          <div className="col-md-12 pt-3 p-0" id=""></div>
          
          <div className="row justify-content-start col-md-12 p-0 m-0 ">
            
            <MosySmartField
            module="tasks"
            field="task_title"
            label="Task Title"
            value={tasksNode?.task_title || ""}
            onChange={handleInputChange}
            context={{ hostParent: hostParent  }}
            inputOverrides={{}}
            type="title"
            cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
            />
            
            
            <MosySmartField
            module="tasks"
            field="task_description"
            label="Task Description"
            value={tasksNode?.task_description || ""}
            onChange={handleInputChange}
            context={{ hostParent: hostParent  }}
            inputOverrides={{}}
            type="textarea"
            cellOverrides={{additionalClass: "col-md-12 hive_data_cell"}}
            />
            
            
            <div className="form-group col-md-4 hive_data_cell ">
              <label className="d-none">Task Type</label>
              
              <SmartDropdown
              apiEndpoint={apiRoutes.tasks.base}
              idField="primkey"
              labelField="task_type"
              inputName="task_type"
              label="Task Type"
              onSelect={(val) => console.log('Selected:', val)}
              defaultValue={tasksNode?.task_type || ""}
              />
            </div>
            
            
            <MosySmartField
            module="tasks"
            field="task_priority"
            label="Task Priority"
            value={tasksNode?.task_priority || ""}
            onChange={handleInputChange}
            context={{ hostParent: hostParent  }}
            inputOverrides={{}}
            type="text"
            cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
            />
            
            
            <MosySmartField
            module="tasks"
            field="task_status"
            label="Task Status"
            value={tasksNode?.task_status || ""}
            onChange={handleInputChange}
            context={{ hostParent: hostParent  }}
            inputOverrides={{}}
            type="text"
            cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
            />
            
            
            <div className="form-group col-md-4 hive_data_cell ">
              <label className="d-none">Full Name</label>
              
              <SmartDropdown
              apiEndpoint={apiRoutes.tasks.base}
              idField="primkey"
              labelField="assigned_sales_rep"
              inputName="assigned_sales_rep"
              label="Full Name"
              onSelect={(val) => console.log('Selected:', val)}
              defaultValue={tasksNode?.assigned_sales_rep || ""}
              />
            </div>
            
            <LiveSearchDropdown
            apiEndpoint={apiRoutes.clients.base}
            tblName="clients"
            parentTable="tasks"
            inputName="_clients_full_name_client_id"
            hiddenInputName="client_id"
            valueField="record_id"
            displayField="full_name"
            label="Full Name"
            defaultValue={{ record_id: tasksNode?.client_id || "", full_name: tasksNode?._clients_full_name_client_id || "" }}
            onSelect={(id) => console.log("Just the ID:", id)}
            onSelectFull={(dataRes) =>  console.log("Data seleted")}
            onInputChange={handleInputChange}
            defaultColSize={`col-md-4 hive_data_cell  hive_data_cell ${
              customProfileData?.client_id
              ? 'd-none'
              : ''
            }`}
            context={{hostParent : hostParent}}
            />
          </div>
          
        </div>
        
        <div className="col-md-12 bg-white border border_set shadow-md p-4 mb-4 hive_form_section  ">
          <h5 className="col-md-12 row p-2 justify-content-center p-0 m-0">
            <div className="col-md-3 bg-dark mb-3 mb-lg-0 mt-lg-3" style={{height: "1px"}}></div>
            <div className="col-md-5 text-center"></div>
            <div className="col-md-4 bg-dark mt-3" style={{height: "1px"}}></div>
          </h5>
          
          <div className="col-md-12 pt-3 p-0" id=""></div>
          
          <div className="row justify-content-start col-md-12 p-0 m-0 ">
            <LiveSearchDropdown
            apiEndpoint={apiRoutes.deals.base}
            tblName="deals"
            parentTable="tasks"
            inputName="_deals_deal_title_deal_id"
            hiddenInputName="deal_id"
            valueField="record_id"
            displayField="deal_title"
            label="Deal Title"
            defaultValue={{ record_id: tasksNode?.deal_id || "", deal_title: tasksNode?._deals_deal_title_deal_id || "" }}
            onSelect={(id) => console.log("Just the ID:", id)}
            onSelectFull={(dataRes) =>  console.log("Data seleted")}
            onInputChange={handleInputChange}
            defaultColSize={`col-md-4 hive_data_cell  hive_data_cell ${
              customProfileData?.deal_id
              ? 'd-none'
              : ''
            }`}
            context={{hostParent : hostParent}}
            />
            
            <MosySmartField
            module="tasks"
            field="due_date"
            label="Due Date"
            value={tasksNode?.due_date || ""}
            onChange={handleInputChange}
            context={{ hostParent: hostParent  }}
            inputOverrides={{}}
            type="datetime-local"
            cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
            />
            
            
            <MosySmartField
            module="tasks"
            field="completed_on"
            label="Completed On"
            value={tasksNode?.completed_on || ""}
            onChange={handleInputChange}
            context={{ hostParent: hostParent  }}
            inputOverrides={{}}
            type="date"
            cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
            />
            
            
            <MosySmartField
            module="tasks"
            field="task_notes"
            label="Task Notes"
            value={tasksNode?.task_notes || ""}
            onChange={handleInputChange}
            context={{ hostParent: hostParent  }}
            inputOverrides={{}}
            type="textarea"
            cellOverrides={{additionalClass: "col-md-12 hive_data_cell"}}
            />
            
            
            <MosySmartField
            module="tasks"
            field="created_at"
            label="Created At"
            value={tasksNode?.created_at || ""}
            onChange={handleInputChange}
            context={{ hostParent: hostParent  }}
            inputOverrides={{}}
            type="datetime-local"
            cellOverrides={{additionalClass: "col-md-4 hive_data_cell  d-none"}}
            />
            
            
            <MosySmartField
            module="tasks"
            field="updated_at"
            label="Updated At"
            value={tasksNode?.updated_at || ""}
            onChange={handleInputChange}
            context={{ hostParent: hostParent  }}
            inputOverrides={{}}
            type="datetime-local"
            cellOverrides={{additionalClass: "col-md-4 hive_data_cell  d-none"}}
            />
            
          </div>
          
          <div className="col-md-12 text-center">
            <SubmitButtons
            src="TasksMainProfilePage"
            tblName="tasks"
            extraClass="optional-custom-class"
            
            />
          </div>
        </div></div>
        {/*    Input cells section isle      */}
      </div>
      
      <section className="hive_control">
        <input type="hidden" id="tasks_dataNode" name="tasks_dataNode" value={paramTasksUptoken}/>
        <input type="hidden" id="tasks_mosy_action" name="tasks_mosy_action" value={tasksActionStatus}/>
      </section>
      
      
    </div>
    
  </form>
  
  
  <div className="row justify-content-center m-0 pr-lg-1 pl-lg-1 pt-0 col-md-12" id="">
    {/*<hive_mini_list/>*/}
    
    {tasksNode?.primkey && (
      <MosyProfileSection
      title={`Client Details`}
      source="tasks_ClientsProfile"
      component={ClientsProfile}
      table="tasks"
      key={`ClientsProfile-${localEventSignature}`}
      dataIn={{
        
        parentStateSetters : stateItemSetters,
        parentUseEffectKey : localEventSignature,
        showNavigationIsle:false,
        customQueryStr : clientsCustomProfileQuery,
        hostParent : "TasksProfile",
        parentProfileItemId : activeScrollId,
        customProfileData : {
          _tasks_task_title_record_id:tasksNode?.task_title,
          record_id:tasksNode?.client_id
        }
        
      }}
      
      dataOut={{
        
        setChildDataOut: InteprateClientsEvent,
        setChildDataOutSignature: (sig) => console.log("Signature changed:", sig),
        
      }}
      />
      
    )}
    {tasksNode?.primkey && (
      <MosyProfileSection
      title={`Deal Details`}
      source="tasks_DealsProfile"
      component={DealsProfile}
      table="tasks"
      key={`DealsProfile-${localEventSignature}`}
      dataIn={{
        
        parentStateSetters : stateItemSetters,
        parentUseEffectKey : localEventSignature,
        showNavigationIsle:false,
        customQueryStr : dealsCustomProfileQuery,
        hostParent : "TasksProfile",
        parentProfileItemId : activeScrollId,
        customProfileData : {
          _tasks_task_title_record_id:tasksNode?.task_title,
          record_id:tasksNode?.deal_id
        }
        
      }}
      
      dataOut={{
        
        setChildDataOut: InteprateDealsEvent,
        setChildDataOutSignature: (sig) => console.log("Signature changed:", sig),
        
      }}
      />
      
    )}
    {tasksNode?.primkey && (
      <MosyProfileSection
      title={`Assigned User`}
      source="tasks_UsersProfile"
      component={UsersProfile}
      table="tasks"
      key={`UsersProfile-${localEventSignature}`}
      dataIn={{
        
        parentStateSetters : stateItemSetters,
        parentUseEffectKey : localEventSignature,
        showNavigationIsle:false,
        customQueryStr : usersCustomProfileQuery,
        hostParent : "TasksProfile",
        parentProfileItemId : activeScrollId,
        customProfileData : {
          _tasks_task_title_record_id:tasksNode?.task_title,
          record_id:tasksNode?.assigned_sales_rep
        }
        
      }}
      
      dataOut={{
        
        setChildDataOut: InteprateUsersEvent,
        setChildDataOutSignature: (sig) => console.log("Signature changed:", sig),
        
      }}
      />
      
    )}
    
    
    {tasksNode?.primkey && (
      <MosyProfileSection
      viewAllLink={`../clients/list?tasks_mosyfilter=${btoa(`{recordId:btoa(tasksNode?.client_id)    }`)}`}
      title={`Client Details`}
      source="tasks_ClientsList"
      component={ClientsList}
      table="tasks"
      key={`ClientsList-${localEventSignature}`}
      dataIn={{
        parentStateSetters : stateItemSetters,
        parentUseEffectKey : localEventSignature,
        showNavigationIsle:false,
        showDataControlSections:false,
        customQueryStr : {recordId:btoa(tasksNode?.client_id)    },
        customProfilePath:"../clients/profile"
        
      }}
      
      dataOut={{
        setChildDataOut: InteprateClientsEvent,
        setChildDataOutSignature: (sig) => console.log("Signature changed:", sig),
      }}
      />
    )}
    
    {tasksNode?.primkey && (
      <MosyProfileSection
      viewAllLink={`../deals/list?tasks_mosyfilter=${btoa(`{recordId:btoa(tasksNode?.deal_id)        }`)}`}
      title={`Deal Details`}
      source="tasks_DealsList"
      component={DealsList}
      table="tasks"
      key={`DealsList-${localEventSignature}`}
      dataIn={{
        parentStateSetters : stateItemSetters,
        parentUseEffectKey : localEventSignature,
        showNavigationIsle:false,
        showDataControlSections:false,
        customQueryStr : {recordId:btoa(tasksNode?.deal_id)        },
        customProfilePath:"../deals/profile"
        
      }}
      
      dataOut={{
        setChildDataOut: InteprateDealsEvent,
        setChildDataOutSignature: (sig) => console.log("Signature changed:", sig),
      }}
      />
    )}
    
    {tasksNode?.primkey && (
      <MosyProfileSection
      viewAllLink={`../users/list?tasks_mosyfilter=${btoa(`{recordId:btoa(tasksNode?.assigned_sales_rep)            }`)}`}
      title={`Assigned User`}
      source="tasks_UsersList"
      component={UsersList}
      table="tasks"
      key={`UsersList-${localEventSignature}`}
      dataIn={{
        parentStateSetters : stateItemSetters,
        parentUseEffectKey : localEventSignature,
        showNavigationIsle:false,
        showDataControlSections:false,
        customQueryStr : {recordId:btoa(tasksNode?.assigned_sales_rep)            },
        customProfilePath:"../users/profile"
        
      }}
      
      dataOut={{
        setChildDataOut: InteprateUsersEvent,
        setChildDataOutSignature: (sig) => console.log("Signature changed:", sig),
      }}
      />
    )}
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

