'use client';
//hive / data utils
import { mosyPostFormData, mosyGetData, mosyUrlParam, mosyUpdateUrlParam , deleteUrlParam, magicRandomStr, mosyGetLSData  } from '../../../MosyUtils/hiveUtils';

//action modals 
import { MosyNotify , closeMosyModal, MosyAlertCard } from '../../../MosyUtils/ActionModals';

//filter util
import { MosySecureFilterEngine } from '../../DataControl/MosyFilterEngine';

//custom event manager 
import { customEventHandler } from '../../DataControl/customDataFunction';

//routes manager
///handle routes 
import { getApiRoutes } from '../../AppRoutes/apiRoutesHandler';

// Use default base root (/)
const apiRoutes = getApiRoutes();

//insert data
export async function insertSystemmodulemanifest() {
 //console.log(`Form system_module_manifest_ insert sent `)

  return await mosyPostFormData({
    formId: 'system_module_manifest__profile_form',
    url: apiRoutes.systemmodulemanifest.base,
    method: 'POST',
    isMultipart: false,
  });
}

//update record 
export async function updateSystemmodulemanifest() {

  //console.log(`Form system_module_manifest_ update sent `)

  return await mosyPostFormData({
    formId: 'system_module_manifest__profile_form',
    url: apiRoutes.systemmodulemanifest.base,
    method: 'PUT',
    isMultipart: false,
  });
}


///receive form actions from profile page  
export async function inteprateSystemmodulemanifestFormAction(e, setters) {
  e.preventDefault();

  const form = e.target;
  const formDataObj = new FormData(form);
  const actionType = formDataObj.get('system_module_manifest__mosy_action');
 
 //console.log(`Form system_module_manifest_ submission received action : ${actionType}`)

  try {
    let result = null;
    let actionMessage ='Record added succesfully!';

    if (actionType === 'add_system_module_manifest_') {

      actionMessage ='Record added succesfully!';

      result = await insertSystemmodulemanifest();
    }

    if (actionType === 'update_system_module_manifest_') {

      actionMessage ='Record updated succesfully!';

      result = await updateSystemmodulemanifest();
    }

    if (result?.status === 'success') {
      
      const system_module_manifest_Uptoken = btoa(result.system_module_manifest__dataNode || '');

      //set id key
      setters.setSystemmodulemanifestUptoken(system_module_manifest_Uptoken);
      
      //update url with new system_module_manifest_Uptoken
      mosyUpdateUrlParam('system_module_manifest__dataNode', system_module_manifest_Uptoken)

      setters.setSystemmodulemanifestActionStatus('update_system_module_manifest_')
    
      setters.setSnackMessage(actionMessage);

      return {
        status: 'success',
        message: actionMessage,
        newToken: system_module_manifest_Uptoken,
        actionName : actionType,
        actionType : 'system_module_manifest__form_submission'
      };
            
      
    } else {
      MosyNotify({message:result.message, icon:'times-circle', iconColor :'text-danger'})
      
      return {
        status: 'error',
        message: result,
        actionName: actionType,
        newToken: null
      };
      
    }

  } catch (error) {
    console.error('Form error:', error);
    
      MosyNotify({message:result.message, icon:'times-circle', iconColor :'text-danger'})
    
      return {
        status: 'error',
        message: result,
        actionName: actionType,
        newToken: null
      };
      
  } 
}


export async function initSystemmodulemanifestProfileData(rawQstr) { 

  MosyNotify({message : 'Refreshing System Module Manifest' , icon:'refresh', addTimer:false})

  try {
    // Fetch the  data with the given key
    const response = await mosyGetData({
      endpoint: apiRoutes.systemmodulemanifest.base,
      params: { 
      ...rawQstr,
      src : btoa(`initSystemmodulemanifestProfileData`)
      },
    });

    // Handle the successful response
    if (response.status === 'success') {
      //console.log('accesscontrol Data:', response.data);  // Process the data

       closeMosyModal()

      return response.data?.[0] || {};  // Return the actual record

    } else {
          
      console.log('Error fetching accesscontrol data:', response.message);  // Handle error
      MosyNotify({message:response.message, icon:'times-circle', iconColor :'text-danger'})

      closeMosyModal()

      return {}
    }
  } catch (err) {

    closeMosyModal()

    console.log('Error:', err);
    return {}
  }
}


export async function DeleteSystemmodulemanifest(token = '') {

    try {
      MosyNotify({message:"Sending delete request",icon:"send", addTimer : false})
    
      const response = await mosyGetData({
        endpoint: apiRoutes.systemmodulemanifest.delete,
        params: { 
          _system_module_manifest__delete_record: (token), 
          },
      });

      console.log('Token DeleteSystemmodulemanifest '+token)
      if (response.status === 'success') {

        closeMosyModal();

        return response; // Return the data
      } else {
        console.error('Error deleting systemusers data:', response.message);
        
        closeMosyModal();

        MosyNotify({message:response.message, icon:'times-circle', iconColor :'text-danger'})

        return response; // Safe fallback
      }
    } catch (err) {
      console.error('Error:', err);
      closeMosyModal();
      
      return []; //  Even safer fallback
    }

}


export async function getSystemmodulemanifestListData(qstr = {}) {

  //manage pagination 
  const pageNo = mosyUrlParam('qsystem_module_manifest__page','0')
  const recordsPerPage = mosyGetLSData('systemDataLimit', '11')

  try {
    const response = await mosyGetData({
      endpoint: apiRoutes.systemmodulemanifest.base,
      params: { 
        ... qstr, 
        pageNo : pageNo,
        pageSize : recordsPerPage,
        orderType : 'desc', 
        src : btoa(`getSystemmodulemanifestListData`)
        },
    });

    if (response.status === 'success') {
      //console.log('accesscontrol Data:', response.data);
      return response; //Return the data
    } else {
      console.log('Error fetching accesscontrol data:', response);
      MosyNotify({message:response.message, icon:'times-circle', iconColor :'text-danger'})
      
      return []; // Safe fallback
    }
  } catch (err) {

   MosyNotify({message:err, icon:'times-circle', iconColor :'text-danger'})

    console.log('Error:', err);
    return []; //  Even safer fallback
  }
}


export async function loadSystemmodulemanifestListData(customQueryStr, setters) {

    const gftSystemmodulemanifest = MosySecureFilterEngine('system_module_manifest_');
    let finalFilterStr = (gftSystemmodulemanifest);    

    if(customQueryStr!='')
    {
      finalFilterStr = customQueryStr;
    }

    setters.setSystemmodulemanifestLoading(true);
    
    const systemmodulemanifestListData = await getSystemmodulemanifestListData(finalFilterStr);
    
    setters.setSystemmodulemanifestLoading(false)
    setters.setSystemmodulemanifestListData(systemmodulemanifestListData?.data)

    setters.setSystemmodulemanifestListPageCount(systemmodulemanifestListData?.pagination?.page_count)


    return systemmodulemanifestListData

}
  
  
export async function systemmodulemanifestProfileData(customQueryStr, setters, router, customProfileData={}) {

    const systemmodulemanifestTokenId = mosyUrlParam('system_module_manifest__dataNode');
    
    const deleteParam = mosyUrlParam('system_module_manifest__delete');

    //manage  the staff_uptoken value  basically detect primkey
    let decodedSystemmodulemanifestToken = '0';
    if (systemmodulemanifestTokenId) {
      
      decodedSystemmodulemanifestToken = atob(systemmodulemanifestTokenId); // Decode the record_id
      setters.setSystemmodulemanifestUptoken(systemmodulemanifestTokenId);
      setters.setSystemmodulemanifestActionStatus('update_system_module_manifest_');
      
    }
    
    //override customQueryStr if there is an active staff_uptoken else use customQueryStr if any
    let rawSystemmodulemanifestQueryStr ={Node:btoa(decodedSystemmodulemanifestToken)}
    if(customQueryStr!='')
    {
      // if no system_module_manifest__dataNode set , use customQueryStr
      if (!systemmodulemanifestTokenId) {
       rawSystemmodulemanifestQueryStr = customQueryStr
      }
    }

    const profileDataRecord = await initSystemmodulemanifestProfileData(rawSystemmodulemanifestQueryStr)

    if(deleteParam){
      popDeleteDialog(systemmodulemanifestTokenId, setters, router)
    }
    
    // Merge with custom injected values (custom wins)
    const finalProfileData = {
      ...profileDataRecord,
      ...customProfileData,    
    };
      

    setters.setSystemmodulemanifestNode(finalProfileData)
    
    
}
  
  

export function InteprateSystemmodulemanifestEvent(data) {
     
  //console.log(' Systemmodulemanifest Child gave us:', data);

  const actionName = data?.actionName

  const childActionName = { [actionName]: true };

  if(childActionName.select_system_module_manifest_){

    if(data?.profile)
    {
    
    //const childStateSetters = data?.setters.childSetters

    const parentSetter = data?.setters.parentStateSetters 

    parentSetter?.setLocalEventSignature(magicRandomStr())
    parentSetter?.setParentUseEffectKey(magicRandomStr())
    parentSetter?.setActiveScrollId('SystemmodulemanifestProfileTray')

    
    mosyUpdateUrlParam('system_module_manifest__dataNode', btoa(data?.token))
    
    const router = data?.router
      
    const url = data?.url

    router.push(url, { scroll: false });

    }else{

    //const childStateSetters = data?.setters.childSetters

    const parentSetter = data?.setters.parentStateSetters 

    parentSetter?.setSystemmodulemanifestCustomProfileQuery(data?.qstr)

    parentSetter?.setLocalEventSignature(magicRandomStr())
    parentSetter?.setParentUseEffectKey(magicRandomStr())
    parentSetter?.setActiveScrollId('SystemmodulemanifestProfileTray')

    
    mosyUpdateUrlParam('system_module_manifest__dataNode', btoa(data?.token))
    
    }
  }

  if(childActionName.add_system_module_manifest_){

    const stateSetter =data?.setters.childStateSetters
    const parentStateSetter =data?.setters.parentStateSetters

    //console.log(`add system_module_manifest_ `, data?.setters)

    if(stateSetter.setLocalEventSignature){
     stateSetter?.setLocalEventSignature(magicRandomStr())
    }

    if(parentStateSetter){
      if(parentStateSetter.setLocalEventSignature){
        parentStateSetter?.setLocalEventSignature(magicRandomStr())
        parentStateSetter?.setActiveScrollId('SystemmodulemanifestProfileTray')
      }
    }
     
  }

  if(childActionName.update_system_module_manifest_){
    const stateSetter =data?.setters.childStateSetters
    const parentStateSetter =data?.setters.parentStateSetters

    //console.log(`update system_module_manifest_ `, data?.setters)

    if(stateSetter.setLocalEventSignature){
     stateSetter?.setLocalEventSignature(magicRandomStr())
    }

    if(parentStateSetter){
      if(parentStateSetter.setLocalEventSignature){
        parentStateSetter?.setLocalEventSignature(magicRandomStr())
        parentStateSetter?.setActiveScrollId('SystemmodulemanifestProfileTray')
        
      }
    }
  }

  if(childActionName.delete_system_module_manifest_){

    popDeleteDialog(btoa(data?.token), data?.setters)

 }

  
}


export function popDeleteDialog(deleteToken, setters, router, afterDeleteUrl='../accesscontrol/list')
{     

  //console.log(`popDeleteDialog`, setters)
  const childSetters = setters?.childStateSetters
  
  MosyAlertCard({
  
    icon : "trash",
  
    message: "Are you sure you want to delete this record?",

    autoDismissOnClick : false,
  
    onYes: () => {
  
      DeleteSystemmodulemanifest(deleteToken).then(response=>{
  
        if(response.status!='error')
        {
          childSetters?.setSnackMessage("Record deleted succesfully!")
          childSetters?.setParentUseEffectKey(magicRandomStr());
          childSetters?.setLocalEventSignature(magicRandomStr());

          if(router){
            router.push(`${afterDeleteUrl}?snack_alert=Record Deleted successfully!`)
          }
       }
      })
  
    },
  
    onNo: () => {
  
      // Remove the param from the URL
       closeMosyModal()
       deleteUrlParam('system_module_manifest__delete');
        
    }
  
  });

}