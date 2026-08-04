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
import { inteprateSystemmodulemanifestFormAction, systemmodulemanifestProfileData , popDeleteDialog, InteprateSystemmodulemanifestEvent } from '../dataControl/SystemmodulemanifestRequestHandler';

//state management
import { useSystemmodulemanifestState } from '../dataControl/SystemmodulemanifestStateManager';

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

import SystemmodulemanifestList from './SystemmodulemanifestList';
// ════════════════════════════════════════════════════════════════
// PROFILE PAGE FUNCTION IMPORTS
// ════════════════════════════════════════════════════════════════


// export profile


///component access control key
export const MOSY_ACCESS_KEY = "MANAGE_SYSTEM_MODULE_MANIFEST_";

//live data detial / profile component

export default function SystemmodulemanifestProfile({ dataIn = {}, dataOut = {} }) {
  
  //initiate data exchange manifest
  //incoming data from parent
  const {
    showNavigationIsle = true,
    customQueryStr = "",
    backToList="./list",
    parentUseEffectKey = "",
    parentStateSetters=null,
    customProfileData={},
    hostParent="SystemmodulemanifestMainProfilePage",
    parentProfileItemId = "SystemmodulemanifestProfileTray"
    
  } = dataIn;
  
  //outgoing data to parent
  const {
    setChildDataOut = () => {},
    setChildDataOutSignature = () => {},
  } = dataOut;
  
  
  //set default state values
  const settersOverrides  = {localEventSignature : parentUseEffectKey,   activeScrollId : parentProfileItemId}
  
  //manage Systemmodulemanifest states
  const [stateItem, stateItemSetters] = useSystemmodulemanifestState(settersOverrides);
  const system_module_manifest_Node = stateItem.systemmodulemanifestNode
  
  // -- basic states --//
  const paramSystemmodulemanifestUptoken  = stateItem.systemmodulemanifestUptoken
  const systemmodulemanifestActionStatus = stateItem.systemmodulemanifestActionStatus
  const snackMessage = stateItem.snackMessage
  const activeScrollId = stateItem.activeScrollId
  
  //const snackOnDone = stateItem.snackOnDone
  
  const localEventSignature = stateItem.localEventSignature
  
  const handleInputChange = mosyFormInputHandler(stateItemSetters.setSystemmodulemanifestNode);
  
  //use route navigation system
  const router = useRouter();
  
  //manage post form
  function postSystemmodulemanifestFormData(e) {
    
    MosyNotify({message: "Sending request",icon:"send"})
    
    inteprateSystemmodulemanifestFormAction(e, stateItemSetters).then(response=>{
      
      setChildDataOut({
        
        actionName : response.actionName,
        dataToken : response.newToken,
        actionsSource : "postSystemmodulemanifestFormData",
        setters :{
          
          childStateSetters: stateItemSetters,
          parentStateSetters: parentStateSetters
          
        }
        
      })
      
      //focus on this form on submission
      stateItemSetters.setActiveScrollId("SystemmodulemanifestProfileTray")
      mosyScrollTo(activeScrollId)
      
      closeMosyModal()
      
    })
    
  }
  
  useEffect(() => {
    
    systemmodulemanifestProfileData(customQueryStr, stateItemSetters, router, customProfileData)
    
    mosyScrollTo(activeScrollId)
    
  }, [localEventSignature]);
  
  
  
  //child queries use effect
  
  
  //access control managemant
  const [allowed, setAllowed] = useState(null);
  
  useEffect(() => {
    setAllowed(MosyAccessControl(MOSY_ACCESS_KEY));
  }, []);
  
  if (allowed === null) return null;
  if (!allowed) return <MosyUIGuard />;
  
  return (
    
    <div className="p-0 col-md-12 text-center row justify-content-center m-0  " id="SystemmodulemanifestProfileTray">
      {/* ================== Start Feature Section========================== ------*/}
      
      
      <div className="col-md-9 rounded text-left p-2 mb-0  bg-white ">
        <div className={` profile_container col-md-12 m-0 p-0  ${showNavigationIsle &&("pr-lg-4 pl-lg-4 m-0")}`}>
          <form onSubmit={postSystemmodulemanifestFormData} encType="multipart/form-data" id="system_module_manifest__profile_form">
            
            {/*    Title isle      */}
            <div className="col-md-12 pt-4 p-0 hive_profile_title_top d-lg-none" id=""></div>
            <h3 className="col-md-12 title_text text-left p-0 pt-3 hive_profile_title row justify-content-center m-0 ">
              <div className="col m-0 p-0 pb-3">
                {system_module_manifest_Node?.primkey ? (  <span>{`Module Profile / ${system_module_manifest_Node?.component_name} / ${system_module_manifest_Node?.access_name}`}</span> ) :(<span> New Module</span>)}
              </div>
              <>{!showNavigationIsle && (<div className="col m-0 p-0 text-right ">
                {paramSystemmodulemanifestUptoken && (
                  <DeleteButton
                  src="SystemmodulemanifestMainProfilePage"
                  tableName="system_module_manifest_"
                  uptoken={paramSystemmodulemanifestUptoken}
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
              
              
              
              {paramSystemmodulemanifestUptoken && (
                <>
                
              </>
            )}
            
            {paramSystemmodulemanifestUptoken && showNavigationIsle && (
              <>
              
              <DeleteButton
              src="SystemmodulemanifestMainProfilePage"
              tableName="system_module_manifest_"
              uptoken={paramSystemmodulemanifestUptoken}
              stateItemSetters={stateItemSetters}
              parentStateSetters={parentStateSetters}
              router={router}
              onDelete={popDeleteDialog}
              />
              
              
              <AddNewButton
              src="SystemmodulemanifestMainProfilePage"
              tableName="system_module_manifest_"
              link="./profile"
              label="New Module"
              icon="plus" />
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
            <div className="col-md-8 bg-white border border_set shadow-md p-4 mb-4 hive_form_section  ">
              <h5 className="col-md-12 row p-2 justify-content-center p-0 m-0">
                <div className="col-md-3 bg-dark mb-3 mb-lg-0 mt-lg-3" style={{height: "1px"}}></div>
                <div className="col-md-5 text-center">Module Identity</div>
                <div className="col-md-4 bg-dark mt-3" style={{height: "1px"}}></div>
              </h5>
              
              <div className="col-md-12 pt-3 p-0" id=""></div>
              
              <div className="row justify-content-center col-md-12 p-0 m-0 ">
                
                <MosySmartField
                module="system_module_manifest_"
                field="component_name"
                label="Component Name"
                value={system_module_manifest_Node?.component_name || ""}
                onChange={handleInputChange}
                context={{ hostParent: hostParent  }}
                inputOverrides={{}}
                type="text"
                cellOverrides={{additionalClass: "col-md-6 hive_data_cell "}}
                />
                
                
                <div className="form-group col-md-6 hive_data_cell ">
                  <label className="d-none">Module Key</label>
                  
                  <SmartDropdown
                  apiEndpoint={apiRoutes.systemmodulemanifest.base}
                  idField="primkey"
                  labelField="module_key"
                  inputName="module_key"
                  label="Module Key"
                  onSelect={(val) => console.log('Selected:', val)}
                  defaultValue={system_module_manifest_Node?.module_key || ""}
                  />
                </div>
                
                
                <div className="form-group col-md-6 hive_data_cell ">
                  <label className="d-none">Module Name</label>
                  
                  <SmartDropdown
                  apiEndpoint={apiRoutes.systemmodulemanifest.base}
                  idField="primkey"
                  labelField="module_name"
                  inputName="module_name"
                  label="Module Name"
                  onSelect={(val) => console.log('Selected:', val)}
                  defaultValue={system_module_manifest_Node?.module_name || ""}
                  />
                </div>
                
                
                <div className="form-group col-md-6 hive_data_cell ">
                  <label className="d-none">Access Name</label>
                  
                  <SmartDropdown
                  apiEndpoint={apiRoutes.systemmodulemanifest.base}
                  idField="primkey"
                  labelField="access_name"
                  inputName="access_name"
                  label="Access Name"
                  onSelect={(val) => console.log('Selected:', val)}
                  defaultValue={system_module_manifest_Node?.access_name || ""}
                  />
                </div>
                
              </div>
              
            </div>
            
            <div className="col-md-8 bg-white border border_set shadow-md p-4 mb-4 hive_form_section  ">
              <h5 className="col-md-12 row p-2 justify-content-center p-0 m-0">
                <div className="col-md-3 bg-dark mb-3 mb-lg-0 mt-lg-3" style={{height: "1px"}}></div>
                <div className="col-md-5 text-center">Permission Settings</div>
                <div className="col-md-4 bg-dark mt-3" style={{height: "1px"}}></div>
              </h5>
              
              <div className="col-md-12 pt-3 p-0" id=""></div>
              
              <div className="row justify-content-center col-md-12 p-0 m-0 ">
                
                <div className="form-group col-md-6 hive_data_cell ">
                  <label className="d-none">Permission Type</label>
                  
                  <SmartDropdown
                  apiEndpoint={apiRoutes.systemmodulemanifest.base}
                  idField="primkey"
                  labelField="permission_type"
                  inputName="permission_type"
                  label="Permission Type"
                  onSelect={(val) => console.log('Selected:', val)}
                  defaultValue={system_module_manifest_Node?.permission_type || ""}
                  />
                </div>
                
                
                <MosySmartField
                module="system_module_manifest_"
                field="capability_key"
                label="Capability Key"
                value={system_module_manifest_Node?.capability_key || ""}
                onChange={handleInputChange}
                context={{ hostParent: hostParent  }}
                inputOverrides={{}}
                type="text"
                cellOverrides={{additionalClass: "col-md-6 hive_data_cell "}}
                />
                
              </div>
              
            </div>
            
            <div className="col-md-8 bg-white border border_set shadow-md p-4 mb-4 hive_form_section  ">
              <h5 className="col-md-12 row p-2 justify-content-center p-0 m-0">
                <div className="col-md-3 bg-dark mb-3 mb-lg-0 mt-lg-3" style={{height: "1px"}}></div>
                <div className="col-md-5 text-center">Routing Configuration</div>
                <div className="col-md-4 bg-dark mt-3" style={{height: "1px"}}></div>
              </h5>
              
              <div className="col-md-12 pt-3 p-0" id=""></div>
              
              <div className="row justify-content-center col-md-12 p-0 m-0 ">
                
                <MosySmartField
                module="system_module_manifest_"
                field="relative_path"
                label="Relative Path"
                value={system_module_manifest_Node?.relative_path || ""}
                onChange={handleInputChange}
                context={{ hostParent: hostParent  }}
                inputOverrides={{}}
                type="text"
                cellOverrides={{additionalClass: "col-md-12"}}
                />
                
              </div>
              
              <div className="col-md-12 text-center">
                <SubmitButtons
                src="SystemmodulemanifestMainProfilePage"
                tblName="system_module_manifest_"
                extraClass="optional-custom-class"
                
                />
              </div>
            </div></div>
            {/*    Input cells section isle      */}
          </div>
          
          <section className="hive_control">
            <input type="hidden" id="system_module_manifest__dataNode" name="system_module_manifest__dataNode" value={paramSystemmodulemanifestUptoken}/>
            <input type="hidden" id="system_module_manifest__mosy_action" name="system_module_manifest__mosy_action" value={systemmodulemanifestActionStatus}/>
          </section>
          
          
        </div>
        
      </form>
      
      
      <div className="row justify-content-center m-0 pr-lg-1 pl-lg-1 pt-0 col-md-12" id="">
        {/*<hive_mini_list/>*/}
        
        
        
        <style jsx global>{`
        .data_list_section {
          display: none;
        }
        .bottom_tbl_handler{
          padding-bottom:70px!important;
        }
        `}
      </style>
      {system_module_manifest_Node?.primkey && (
        <section className="col-md-12 m-0  pt-5 p-0 ">
          <h5 className="col-md-12 text-left  border-bottom pl-lg-1 text-muted mb-3"> {`More Modules`} </h5>
          
          <div className="col-md-12 p-2 text-right ">
            <a href={`./list?system_module_manifest__mosyfilter`} className="cpointer"> View More  <i className="fa fa-arrow-right "></i></a>
          </div>
          
          <SystemmodulemanifestList
          key={`${customQueryStr}-${localEventSignature}`}
          dataIn={{
            parentStateSetters : stateItemSetters,
            parentUseEffectKey : localEventSignature,
            showNavigationIsle:false,
            showDataControlSections:false,
            customQueryStr : '',
            customProfilePath:"./profile"
            
          }}
          
          dataOut={{
            setChildDataOut: InteprateSystemmodulemanifestEvent,
            setChildDataOutSignature: (sig) => console.log("Signature changed:", sig),
          }}
          />
        </section>
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

