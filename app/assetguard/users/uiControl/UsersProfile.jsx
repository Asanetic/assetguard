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
import { inteprateUsersFormAction, usersProfileData , popDeleteDialog, InteprateUsersEvent } from '../dataControl/UsersRequestHandler';

//state management
import { useUsersState } from '../dataControl/UsersStateManager';

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

import {InteprateLeadsEvent} from '../../leads/dataControl/LeadsRequestHandler';
import LeadsList from '../../leads/uiControl/LeadsList';
import {InteprateClientsEvent} from '../../clients/dataControl/ClientsRequestHandler';
import ClientsList from '../../clients/uiControl/ClientsList';
import {InteprateDealsEvent} from '../../deals/dataControl/DealsRequestHandler';
import DealsList from '../../deals/uiControl/DealsList';
import {InteprateTasksEvent} from '../../tasks/dataControl/TasksRequestHandler';
import TasksList from '../../tasks/uiControl/TasksList';
import LeadsProfile from '../../leads/uiControl/LeadsProfile';
import ClientsProfile from '../../clients/uiControl/ClientsProfile';
import DealsProfile from '../../deals/uiControl/DealsProfile';
import TasksProfile from '../../tasks/uiControl/TasksProfile';
// ════════════════════════════════════════════════════════════════
// PROFILE PAGE FUNCTION IMPORTS
// ════════════════════════════════════════════════════════════════
// Imports from activate-user.jsx
import {
  activateUser
} from '../logicControl/activate-user';

// Imports from suspend-user.jsx
import {
  suspendUser
} from '../logicControl/suspend-user';

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



// export profile

//import minilist component manager
import { MosyProfileSection} from '../../UiControl/dataMapUiControl';


///component access control key
export const MOSY_ACCESS_KEY = "MANAGE_USERS";

//live data detial / profile component

export default function UsersProfile({ dataIn = {}, dataOut = {} }) {
  
  //initiate data exchange manifest
  //incoming data from parent
  const {
    showNavigationIsle = true,
    customQueryStr = "",
    backToList="./list",
    parentUseEffectKey = "",
    parentStateSetters=null,
    customProfileData={},
    hostParent="UsersMainProfilePage",
    parentProfileItemId = "UsersProfileTray"
    
  } = dataIn;
  
  //outgoing data to parent
  const {
    setChildDataOut = () => {},
    setChildDataOutSignature = () => {},
  } = dataOut;
  
  
  //set default state values
  const settersOverrides  = {localEventSignature : parentUseEffectKey,   activeScrollId : parentProfileItemId}
  
  //manage Users states
  const [stateItem, stateItemSetters] = useUsersState(settersOverrides);
  const usersNode = stateItem.usersNode
  
  // -- basic states --//
  const paramUsersUptoken  = stateItem.usersUptoken
  const usersActionStatus = stateItem.usersActionStatus
  const snackMessage = stateItem.snackMessage
  const activeScrollId = stateItem.activeScrollId
  
  //const snackOnDone = stateItem.snackOnDone
  
  const localEventSignature = stateItem.localEventSignature
  
  const handleInputChange = mosyFormInputHandler(stateItemSetters.setUsersNode);
  
  //use route navigation system
  const router = useRouter();
  
  //manage post form
  function postUsersFormData(e) {
    
    MosyNotify({message: "Sending request",icon:"send"})
    
    inteprateUsersFormAction(e, stateItemSetters).then(response=>{
      
      setChildDataOut({
        
        actionName : response.actionName,
        dataToken : response.newToken,
        actionsSource : "postUsersFormData",
        setters :{
          
          childStateSetters: stateItemSetters,
          parentStateSetters: parentStateSetters
          
        }
        
      })
      
      //focus on this form on submission
      stateItemSetters.setActiveScrollId("UsersProfileTray")
      mosyScrollTo(activeScrollId)
      
      closeMosyModal()
      
    })
    
  }
  
  useEffect(() => {
    
    usersProfileData(customQueryStr, stateItemSetters, router, customProfileData)
    
    mosyScrollTo(activeScrollId)
    
  }, [localEventSignature]);
  
  
  
  //child queries use effect
  
  //setLeadsCustomProfileQuery Script
  const setLeadsCustomProfileQuery = stateItemSetters.setLeadsCustomProfileQuery;
  const leadsCustomProfileQuery =  stateItem.leadsCustomProfileQuery;
  
  useEffect(() => {
    if (usersNode?.primkey && setLeadsCustomProfileQuery) {
      
      const query = {assignedSalesRep:btoa(usersNode?.record_id)    };
      
      const tokenUrl = mosyUrlParam("leads_dataNode")
      
      if(!tokenUrl)
      {
        setLeadsCustomProfileQuery(query);
      }
      
    }
  }, [usersNode, setLeadsCustomProfileQuery]);
  
  //setClientsCustomProfileQuery Script
  const setClientsCustomProfileQuery = stateItemSetters.setClientsCustomProfileQuery;
  const clientsCustomProfileQuery =  stateItem.clientsCustomProfileQuery;
  
  useEffect(() => {
    if (usersNode?.primkey && setClientsCustomProfileQuery) {
      
      const query = {assignedSalesRep:btoa(usersNode?.record_id)        };
      
      const tokenUrl = mosyUrlParam("clients_dataNode")
      
      if(!tokenUrl)
      {
        setClientsCustomProfileQuery(query);
      }
      
    }
  }, [usersNode, setClientsCustomProfileQuery]);
  
  //setDealsCustomProfileQuery Script
  const setDealsCustomProfileQuery = stateItemSetters.setDealsCustomProfileQuery;
  const dealsCustomProfileQuery =  stateItem.dealsCustomProfileQuery;
  
  useEffect(() => {
    if (usersNode?.primkey && setDealsCustomProfileQuery) {
      
      const query = {assignedSalesRep:btoa(usersNode?.record_id)            };
      
      const tokenUrl = mosyUrlParam("deals_dataNode")
      
      if(!tokenUrl)
      {
        setDealsCustomProfileQuery(query);
      }
      
    }
  }, [usersNode, setDealsCustomProfileQuery]);
  
  //setTasksCustomProfileQuery Script
  const setTasksCustomProfileQuery = stateItemSetters.setTasksCustomProfileQuery;
  const tasksCustomProfileQuery =  stateItem.tasksCustomProfileQuery;
  
  useEffect(() => {
    if (usersNode?.primkey && setTasksCustomProfileQuery) {
      
      const query = {assignedSalesRep:btoa(usersNode?.record_id)                };
      
      const tokenUrl = mosyUrlParam("tasks_dataNode")
      
      if(!tokenUrl)
      {
        setTasksCustomProfileQuery(query);
      }
      
    }
  }, [usersNode, setTasksCustomProfileQuery]);
  
  
  //access control managemant
  const [allowed, setAllowed] = useState(null);
  
  useEffect(() => {
    setAllowed(MosyAccessControl(MOSY_ACCESS_KEY));
  }, []);
  
  if (allowed === null) return null;
  if (!allowed) return <MosyUIGuard />;
  
  return (
    
    <div className="p-0 col-md-12 text-center row justify-content-center m-0  " id="UsersProfileTray">
      {/* ================== Start Feature Section========================== ------*/}
      
      
      <div className="col-md-12 rounded text-left p-2 mb-0  bg-white ">
        <div className={` profile_container col-md-12 m-0 p-0  ${showNavigationIsle &&("pr-lg-4 pl-lg-4 m-0")}`}>
          <form onSubmit={postUsersFormData} encType="multipart/form-data" id="users_profile_form">
            
            {/*    Title isle      */}
            <div className="col-md-12 pt-4 p-0 hive_profile_title_top d-lg-none" id=""></div>
            <h3 className="col-md-12 title_text text-left p-0 pt-3 hive_profile_title row justify-content-center m-0 ">
              <div className="col m-0 p-0 pb-3">
                
                {
                  usersNode?.primkey ? (
                    
                    <span>{`Users / ${usersNode?.phone_number}`}</span>
                    
                  ) : customProfileData?.UsersTitle ? (
                    
                    <span>{customProfileData.UsersTitle}</span>
                    
                  ) : (
                    
                    <span>New Users</span>
                    
                  )}
                  
                </div>
                <>{!showNavigationIsle && (<div className="col m-0 p-0 text-right ">
                  {paramUsersUptoken && (
                    <DeleteButton
                    src="UsersMainProfilePage"
                    tableName="users"
                    uptoken={paramUsersUptoken}
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
                
                
                
                {paramUsersUptoken && (
                  <>
                  
                  <MosyActionButton
                  source="UsersProfile"
                  action="users_DataMap_activateUser_btn"
                  label="Activate User"
                  icon="user-check"
                  
                  onClick={()=>{
                    
                    activateUser({
                      
                      title: `Activate {{full_name}} user`,
                      
                      component: UsersProfile,
                      
                      stateitemsetters: stateItemSetters,
                      
                      parentTable: "users",
                      
                      destTable: "users",
                      
                      fieldsetstr: 'account_status|Active',
                      
                      profileDataNode: usersNode,
                      
                      dataInterpreter: InteprateUsersEvent
                      
                    })
                    
                  }}
                  />
                  <MosyActionButton
                  source="UsersProfile"
                  action="users_DataMap_suspendUser_btn"
                  label="Suspend User"
                  icon="pause-circle"
                  
                  onClick={()=>{
                    
                    suspendUser({
                      
                      title: `Suspend {{full_name}} user`,
                      
                      component: UsersProfile,
                      
                      stateitemsetters: stateItemSetters,
                      
                      parentTable: "users",
                      
                      destTable: "users",
                      
                      fieldsetstr: 'account_status|Suspended',
                      
                      profileDataNode: usersNode,
                      
                      dataInterpreter: InteprateUsersEvent
                      
                    })
                    
                  }}
                  />
                  <MosyActionButton
                  source="UsersProfile"
                  action="view_assigned_leads_profile_action_btn"
                  label="View Assigned Leads"
                  icon="list"
                  
                  onClick={()=>{
                    
                    viewLeads({childCol:`assignedSalesRep`,parentColVal:usersNode.record_id,parentName:usersNode.full_name})
                    
                  }}
                  />
                  <MosyActionButton
                  source="UsersProfile"
                  action="view_assigned_clients_profile_action_btn"
                  label="View Assigned Clients"
                  icon="list"
                  
                  onClick={()=>{
                    
                    viewClients({childCol:`assignedSalesRep`,parentColVal:usersNode.record_id,parentName:usersNode.full_name})
                    
                  }}
                  />
                  
                  <div className="position-relative d-inline-block mr-2">
                    
                    <MosyActionButton
                    source="UsersProfile"
                    action="more_profile_action_btn"
                    label="More..."
                    icon="ellipsis-v"
                    
                    onClick={(e)=>{
                      
                      const node = document.getElementById("Users_more_profile_actions");
                      
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
                    id="Users_more_profile_actions"
                    
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
                        usersNode?.primkey ? (
                          
                          <span>{`Users / ${usersNode?.phone_number}`}</span>
                          
                        ) : customProfileData?.UsersTitle ? (
                          
                          <span>{customProfileData.UsersTitle}</span>
                          
                        ) : (
                          
                          <span>New Users</span>
                          
                        )}
                        - advanced options
                        
                      </h6>
                      
                      <button
                      type="button"
                      aria-label="Close"
                      
                      onClick={()=>{
                        document.getElementById("Users_more_profile_actions").style.display = "none";
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
                    document.getElementById("Users_more_profile_actions").style.display = "none";
                  }}
                  >
                  
                  <div className="row m-0 align-items-center">
                    
                    
                    <div className="col-auto p-1">
                      
                      <MosyActionButton
                      source="UsersProfile"
                      action="view_assigned_deals_profile_action_btn"
                      label="View Assigned Deals"
                      icon="list"
                      
                      onClick={()=>{
                        
                        viewDeals({childCol:`assignedSalesRep`,parentColVal:usersNode.record_id,parentName:usersNode.full_name})
                        
                      }}
                      />
                    </div>
                    <div className="col-auto p-1">
                      
                      <MosyActionButton
                      source="UsersProfile"
                      action="view_assigned_tasks_profile_action_btn"
                      label="View Assigned Tasks"
                      icon="list"
                      
                      onClick={()=>{
                        
                        viewTasks({childCol:`assignedSalesRep`,parentColVal:usersNode.record_id,parentName:usersNode.full_name})
                        
                      }}
                      />
                    </div>
                    
                  </div>
                  
                </div>
                
              </div>
              
            </div>
          </>
        )}
        
        {paramUsersUptoken && showNavigationIsle && (
          <>
          
          <DeleteButton
          src="UsersMainProfilePage"
          tableName="users"
          uptoken={paramUsersUptoken}
          stateItemSetters={stateItemSetters}
          parentStateSetters={parentStateSetters}
          router={router}
          onDelete={popDeleteDialog}
          />
          
          
          <AddNewButton
          src="UsersMainProfilePage"
          tableName="users"
          link="./profile"
          label="New Users"
          icon="plus-circle" />
        </>
      )}
      
    </div>
  </div></>
  <div className="col-md-12 pt-4 p-0 hive_profile_navigation_divider d-lg-none" id=""></div>
  {/*    Navigation isle      */}
  <div className="row justify-content-center m-0 p-0 col-md-12" id="">
    {/*    Image section isle      */}
    
    <div className="col-md-6 mr-lg-5">
      
      <div className="col-md-12 p-0 text-center mb-3">
        <div className="col-md-12 m-2"><b>Profile Photo</b></div>
        <MosyImageViewer
        media={`/api/mediaroom?media=${btoa((usersNode?.profile_photo || ""))}`}
        mediaRoot={""}
        defaultLogo={logo.src}
        imageClass="product_image"
        />
        
        <div className="">
          <MosyFileUploadButton
          tblName="users"
          attribute="profile_photo"
          />
        </div>
        <input type="hidden" name="media_users_profile_photo" value={usersNode?.profile_photo || ""}/>
      </div>
      
      
    </div>
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
            module="users"
            field="full_name"
            label="Full Name"
            value={usersNode?.full_name || ""}
            onChange={handleInputChange}
            context={{ hostParent: hostParent  }}
            inputOverrides={{}}
            type="text"
            cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
            />
            
            
            <MosySmartField
            module="users"
            field="phone_number"
            label="Phone Number"
            value={usersNode?.phone_number || ""}
            onChange={handleInputChange}
            context={{ hostParent: hostParent  }}
            inputOverrides={{}}
            type="text"
            cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
            />
            
            
            <MosySmartField
            module="users"
            field="email_address"
            label="Email Address"
            value={usersNode?.email_address || ""}
            onChange={handleInputChange}
            context={{ hostParent: hostParent  }}
            inputOverrides={{}}
            type="text"
            cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
            />
            
            
            <MosySmartField
            module="users"
            field="user_password"
            label="User Password"
            value={usersNode?.user_password || ""}
            onChange={handleInputChange}
            context={{ hostParent: hostParent  }}
            inputOverrides={{}}
            type="password"
            cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
            />
            
            
            <div className="form-group col-md-4 hive_data_cell ">
              <label className="d-none">User Role</label>
              
              <SmartDropdown
              apiEndpoint={apiRoutes.users.base}
              idField="primkey"
              labelField="user_role"
              inputName="user_role"
              label="User Role"
              onSelect={(val) => console.log('Selected:', val)}
              defaultValue={usersNode?.user_role || ""}
              />
            </div>
            
            
            <div className="form-group col-md-4 hive_data_cell ">
              <label className="d-none">Department Name</label>
              
              <SmartDropdown
              apiEndpoint={apiRoutes.users.base}
              idField="primkey"
              labelField="department_name"
              inputName="department_name"
              label="Department Name"
              onSelect={(val) => console.log('Selected:', val)}
              defaultValue={usersNode?.department_name || ""}
              />
            </div>
            
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
            
            <MosySmartField
            module="users"
            field="account_status"
            label="Account Status"
            value={usersNode?.account_status || ""}
            onChange={handleInputChange}
            context={{ hostParent: hostParent  }}
            inputOverrides={{}}
            type="text"
            cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
            />
            
            
            <MosySmartField
            module="users"
            field="last_login"
            label="Last Login"
            value={usersNode?.last_login || ""}
            onChange={handleInputChange}
            context={{ hostParent: hostParent  }}
            inputOverrides={{}}
            type="datetime-local"
            cellOverrides={{additionalClass: "col-md-4 hive_data_cell "}}
            />
            
            
            <MosySmartField
            module="users"
            field="created_at"
            label="Created At"
            value={usersNode?.created_at || ""}
            onChange={handleInputChange}
            context={{ hostParent: hostParent  }}
            inputOverrides={{}}
            type="datetime-local"
            cellOverrides={{additionalClass: "col-md-4 hive_data_cell  d-none"}}
            />
            
            
            <MosySmartField
            module="users"
            field="updated_at"
            label="Updated At"
            value={usersNode?.updated_at || ""}
            onChange={handleInputChange}
            context={{ hostParent: hostParent  }}
            inputOverrides={{}}
            type="datetime-local"
            cellOverrides={{additionalClass: "col-md-4 hive_data_cell  d-none"}}
            />
            
          </div>
          
          <div className="col-md-12 text-center">
            <SubmitButtons
            src="UsersMainProfilePage"
            tblName="users"
            extraClass="optional-custom-class"
            
            />
          </div>
        </div></div>
        {/*    Input cells section isle      */}
      </div>
      
      <section className="hive_control">
        <input type="hidden" id="users_dataNode" name="users_dataNode" value={paramUsersUptoken}/>
        <input type="hidden" id="users_mosy_action" name="users_mosy_action" value={usersActionStatus}/>
      </section>
      
      
    </div>
    
  </form>
  
  
  <div className="row justify-content-center m-0 pr-lg-1 pl-lg-1 pt-0 col-md-12" id="">
    {/*<hive_mini_list/>*/}
    
    {usersNode?.primkey && (
      <MosyProfileSection
      title={`Assigned Leads`}
      source="users_LeadsProfile"
      component={LeadsProfile}
      table="users"
      key={`LeadsProfile-${localEventSignature}`}
      dataIn={{
        
        parentStateSetters : stateItemSetters,
        parentUseEffectKey : localEventSignature,
        showNavigationIsle:false,
        customQueryStr : leadsCustomProfileQuery,
        hostParent : "UsersProfile",
        parentProfileItemId : activeScrollId,
        customProfileData : {
          _users_full_name_assigned_sales_rep:usersNode?.full_name,
          assigned_sales_rep:usersNode?.record_id
        }
        
      }}
      
      dataOut={{
        
        setChildDataOut: InteprateLeadsEvent,
        setChildDataOutSignature: (sig) => console.log("Signature changed:", sig),
        
      }}
      />
      
    )}
    {usersNode?.primkey && (
      <MosyProfileSection
      title={`Assigned Clients`}
      source="users_ClientsProfile"
      component={ClientsProfile}
      table="users"
      key={`ClientsProfile-${localEventSignature}`}
      dataIn={{
        
        parentStateSetters : stateItemSetters,
        parentUseEffectKey : localEventSignature,
        showNavigationIsle:false,
        customQueryStr : clientsCustomProfileQuery,
        hostParent : "UsersProfile",
        parentProfileItemId : activeScrollId,
        customProfileData : {
          _users_full_name_assigned_sales_rep:usersNode?.full_name,
          assigned_sales_rep:usersNode?.record_id
        }
        
      }}
      
      dataOut={{
        
        setChildDataOut: InteprateClientsEvent,
        setChildDataOutSignature: (sig) => console.log("Signature changed:", sig),
        
      }}
      />
      
    )}
    {usersNode?.primkey && (
      <MosyProfileSection
      title={`Assigned Deals`}
      source="users_DealsProfile"
      component={DealsProfile}
      table="users"
      key={`DealsProfile-${localEventSignature}`}
      dataIn={{
        
        parentStateSetters : stateItemSetters,
        parentUseEffectKey : localEventSignature,
        showNavigationIsle:false,
        customQueryStr : dealsCustomProfileQuery,
        hostParent : "UsersProfile",
        parentProfileItemId : activeScrollId,
        customProfileData : {
          _users_full_name_assigned_sales_rep:usersNode?.full_name,
          assigned_sales_rep:usersNode?.record_id
        }
        
      }}
      
      dataOut={{
        
        setChildDataOut: InteprateDealsEvent,
        setChildDataOutSignature: (sig) => console.log("Signature changed:", sig),
        
      }}
      />
      
    )}
    {usersNode?.primkey && (
      <MosyProfileSection
      title={`Assigned Tasks`}
      source="users_TasksProfile"
      component={TasksProfile}
      table="users"
      key={`TasksProfile-${localEventSignature}`}
      dataIn={{
        
        parentStateSetters : stateItemSetters,
        parentUseEffectKey : localEventSignature,
        showNavigationIsle:false,
        customQueryStr : tasksCustomProfileQuery,
        hostParent : "UsersProfile",
        parentProfileItemId : activeScrollId,
        customProfileData : {
          _users_full_name_assigned_sales_rep:usersNode?.full_name,
          assigned_sales_rep:usersNode?.record_id
        }
        
      }}
      
      dataOut={{
        
        setChildDataOut: InteprateTasksEvent,
        setChildDataOutSignature: (sig) => console.log("Signature changed:", sig),
        
      }}
      />
      
    )}
    
    
    {usersNode?.primkey && (
      <MosyProfileSection
      viewAllLink={`../leads/list?users_mosyfilter=${btoa(`{assignedSalesRep:btoa(usersNode?.record_id)    }`)}`}
      title={`Assigned Leads`}
      source="users_LeadsList"
      component={LeadsList}
      table="users"
      key={`LeadsList-${localEventSignature}`}
      dataIn={{
        parentStateSetters : stateItemSetters,
        parentUseEffectKey : localEventSignature,
        showNavigationIsle:false,
        showDataControlSections:false,
        customQueryStr : {assignedSalesRep:btoa(usersNode?.record_id)    },
        customProfilePath:"../leads/profile"
        
      }}
      
      dataOut={{
        setChildDataOut: InteprateLeadsEvent,
        setChildDataOutSignature: (sig) => console.log("Signature changed:", sig),
      }}
      />
    )}
    
    {usersNode?.primkey && (
      <MosyProfileSection
      viewAllLink={`../clients/list?users_mosyfilter=${btoa(`{assignedSalesRep:btoa(usersNode?.record_id)        }`)}`}
      title={`Assigned Clients`}
      source="users_ClientsList"
      component={ClientsList}
      table="users"
      key={`ClientsList-${localEventSignature}`}
      dataIn={{
        parentStateSetters : stateItemSetters,
        parentUseEffectKey : localEventSignature,
        showNavigationIsle:false,
        showDataControlSections:false,
        customQueryStr : {assignedSalesRep:btoa(usersNode?.record_id)        },
        customProfilePath:"../clients/profile"
        
      }}
      
      dataOut={{
        setChildDataOut: InteprateClientsEvent,
        setChildDataOutSignature: (sig) => console.log("Signature changed:", sig),
      }}
      />
    )}
    
    {usersNode?.primkey && (
      <MosyProfileSection
      viewAllLink={`../deals/list?users_mosyfilter=${btoa(`{assignedSalesRep:btoa(usersNode?.record_id)            }`)}`}
      title={`Assigned Deals`}
      source="users_DealsList"
      component={DealsList}
      table="users"
      key={`DealsList-${localEventSignature}`}
      dataIn={{
        parentStateSetters : stateItemSetters,
        parentUseEffectKey : localEventSignature,
        showNavigationIsle:false,
        showDataControlSections:false,
        customQueryStr : {assignedSalesRep:btoa(usersNode?.record_id)            },
        customProfilePath:"../deals/profile"
        
      }}
      
      dataOut={{
        setChildDataOut: InteprateDealsEvent,
        setChildDataOutSignature: (sig) => console.log("Signature changed:", sig),
      }}
      />
    )}
    
    {usersNode?.primkey && (
      <MosyProfileSection
      viewAllLink={`../tasks/list?users_mosyfilter=${btoa(`{assignedSalesRep:btoa(usersNode?.record_id)                }`)}`}
      title={`Assigned Tasks`}
      source="users_TasksList"
      component={TasksList}
      table="users"
      key={`TasksList-${localEventSignature}`}
      dataIn={{
        parentStateSetters : stateItemSetters,
        parentUseEffectKey : localEventSignature,
        showNavigationIsle:false,
        showDataControlSections:false,
        customQueryStr : {assignedSalesRep:btoa(usersNode?.record_id)                },
        customProfilePath:"../tasks/profile"
        
      }}
      
      dataOut={{
        setChildDataOut: InteprateTasksEvent,
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

