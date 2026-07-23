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
export async function insertSystemUsers() {
 //console.log(`Form system_users insert sent `)

  return await mosyPostFormData({
    formId: 'system_users_profile_form',
    url: apiRoutes.systemusers.base,
    method: 'POST',
    isMultipart: true,
  });
}

//update record 
export async function updateSystemUsers() {

  //console.log(`Form system_users update sent `)

  return await mosyPostFormData({
    formId: 'system_users_profile_form',
    url: apiRoutes.systemusers.base,
    method: 'PUT',
    isMultipart: true,
  });
}


///receive form actions from profile page  
export async function inteprateSystemUsersFormAction(e, setters) {
  e.preventDefault();

  const form = e.target;
  const formDataObj = new FormData(form);
  const actionType = formDataObj.get('system_users_mosy_action');
 
 //console.log(`Form system_users submission received action : ${actionType}`)

  try {
    let result = null;
    let actionMessage ='Record added succesfully!';

    if (actionType === 'add_system_users') {

      actionMessage ='Record added succesfully!';

      result = await insertSystemUsers();
    }

    if (actionType === 'update_system_users') {

      actionMessage ='Record updated succesfully!';

      result = await updateSystemUsers();
    }

    if (result?.status === 'success') {
      
      const system_usersUptoken = btoa(result.system_users_dataNode || '');

      //set id key
      setters.setSystemUsersUptoken(system_usersUptoken);
      
      //update url with new system_usersUptoken
      mosyUpdateUrlParam('system_users_dataNode', system_usersUptoken)

      setters.setSystemUsersActionStatus('update_system_users')
    
      setters.setSnackMessage(actionMessage);

      return {
        status: 'success',
        message: actionMessage,
        newToken: system_usersUptoken,
        actionName : actionType,
        actionType : 'system_users_form_submission'
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


export async function initSystemUsersProfileData(rawQstr) { 

  MosyNotify({message : 'Refreshing System Users' , icon:'refresh', addTimer:false})

  try {
    // Fetch the  data with the given key
    const response = await mosyGetData({
      endpoint: apiRoutes.systemusers.base,
      params: { 
      ...rawQstr,
      src : btoa(`initSystemUsersProfileData`)
      },
    });

    // Handle the successful response
    if (response.status === 'success') {
      //console.log('systemusers Data:', response.data);  // Process the data

       closeMosyModal()

      return response.data?.[0] || {};  // Return the actual record

    } else {
          
      console.log('Error fetching systemusers data:', response.message);  // Handle error
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


export async function DeleteSystemUsers(token = '') {

    try {
      MosyNotify({message:"Sending delete request",icon:"send", addTimer : false})
    
      const response = await mosyGetData({
        endpoint: apiRoutes.systemusers.delete,
        params: { 
          _system_users_delete_record: (token), 
          },
      });

      console.log('Token DeleteSystemUsers '+token)
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


export async function getSystemUsersListData(qstr = {}) {

  //manage pagination 
  const pageNo = mosyUrlParam('qsystem_users_page','0')
  const recordsPerPage = mosyGetLSData('systemDataLimit', '11')

  try {
    const response = await mosyGetData({
      endpoint: apiRoutes.systemusers.base,
      params: { 
        ... qstr, 
        pageNo : pageNo,
        pageSize : recordsPerPage,
        orderType : 'desc', 
        src : btoa(`getSystemUsersListData`)
        },
    });

    if (response.status === 'success') {
      //console.log('systemusers Data:', response.data);
      return response; //Return the data
    } else {
      console.log('Error fetching systemusers data:', response);
      MosyNotify({message:response.message, icon:'times-circle', iconColor :'text-danger'})
      
      return []; // Safe fallback
    }
  } catch (err) {

   MosyNotify({message:err, icon:'times-circle', iconColor :'text-danger'})

    console.log('Error:', err);
    return []; //  Even safer fallback
  }
}


export async function loadSystemUsersListData(customQueryStr, setters) {

    const gftSystemUsers = MosySecureFilterEngine('system_users');
    let finalFilterStr = (gftSystemUsers);    

    if(customQueryStr!='')
    {
      finalFilterStr = customQueryStr;
    }

    setters.setSystemUsersLoading(true);
    
    const systemUsersListData = await getSystemUsersListData(finalFilterStr);
    
    setters.setSystemUsersLoading(false)
    setters.setSystemUsersListData(systemUsersListData?.data)

    setters.setSystemUsersListPageCount(systemUsersListData?.pagination?.page_count)


    return systemUsersListData

}
  
  
export async function systemUsersProfileData(customQueryStr, setters, router, customProfileData={}) {

    const systemUsersTokenId = mosyUrlParam('system_users_dataNode');
    
    const deleteParam = mosyUrlParam('system_users_delete');

    //manage  the staff_uptoken value  basically detect primkey
    let decodedSystemUsersToken = '0';
    if (systemUsersTokenId) {
      
      decodedSystemUsersToken = atob(systemUsersTokenId); // Decode the record_id
      setters.setSystemUsersUptoken(systemUsersTokenId);
      setters.setSystemUsersActionStatus('update_system_users');
      
    }
    
    //override customQueryStr if there is an active staff_uptoken else use customQueryStr if any
    let rawSystemUsersQueryStr ={Node:btoa(decodedSystemUsersToken)}
    if(customQueryStr!='')
    {
      // if no system_users_dataNode set , use customQueryStr
      if (!systemUsersTokenId) {
       rawSystemUsersQueryStr = customQueryStr
      }
    }

    const profileDataRecord = await initSystemUsersProfileData(rawSystemUsersQueryStr)

    if(deleteParam){
      popDeleteDialog(systemUsersTokenId, setters, router)
    }
    
    // Merge with custom injected values (custom wins)
    const finalProfileData = {
      ...profileDataRecord,
      ...customProfileData,    
    };
      

    setters.setSystemUsersNode(finalProfileData)
    
    
}
  
  

export function InteprateSystemUsersEvent(data) {
     
  //console.log(' SystemUsers Child gave us:', data);

  const actionName = data?.actionName

  const childActionName = { [actionName]: true };

  if(childActionName.select_system_users){

    if(data?.profile)
    {
    
    //const childStateSetters = data?.setters.childSetters

    const parentSetter = data?.setters.parentStateSetters 

    parentSetter?.setLocalEventSignature(magicRandomStr())
    parentSetter?.setParentUseEffectKey(magicRandomStr())
    parentSetter?.setActiveScrollId('SystemUsersProfileTray')

    
    mosyUpdateUrlParam('system_users_dataNode', btoa(data?.token))
    
    const router = data?.router
      
    const url = data?.url

    router.push(url, { scroll: false });

    }else{

    //const childStateSetters = data?.setters.childSetters

    const parentSetter = data?.setters.parentStateSetters 

    parentSetter?.setSystemUsersCustomProfileQuery(data?.qstr)

    parentSetter?.setLocalEventSignature(magicRandomStr())
    parentSetter?.setParentUseEffectKey(magicRandomStr())
    parentSetter?.setActiveScrollId('SystemUsersProfileTray')

    
    mosyUpdateUrlParam('system_users_dataNode', btoa(data?.token))
    
    }
  }

  if(childActionName.add_system_users){

    const stateSetter =data?.setters.childStateSetters
    const parentStateSetter =data?.setters.parentStateSetters

    //console.log(`add system_users `, data?.setters)

    if(stateSetter.setLocalEventSignature){
     stateSetter?.setLocalEventSignature(magicRandomStr())
    }

    if(parentStateSetter){
      if(parentStateSetter.setLocalEventSignature){
        parentStateSetter?.setLocalEventSignature(magicRandomStr())
        parentStateSetter?.setActiveScrollId('SystemUsersProfileTray')
      }
    }
     
  }

  if(childActionName.update_system_users){
    const stateSetter =data?.setters.childStateSetters
    const parentStateSetter =data?.setters.parentStateSetters

    //console.log(`update system_users `, data?.setters)

    if(stateSetter.setLocalEventSignature){
     stateSetter?.setLocalEventSignature(magicRandomStr())
    }

    if(parentStateSetter){
      if(parentStateSetter.setLocalEventSignature){
        parentStateSetter?.setLocalEventSignature(magicRandomStr())
        parentStateSetter?.setActiveScrollId('SystemUsersProfileTray')
        
      }
    }
  }

  if(childActionName.delete_system_users){

    popDeleteDialog(btoa(data?.token), data?.setters)

 }

  
}


export function popDeleteDialog(deleteToken, setters, router, afterDeleteUrl='../systemusers/list')
{     

  //console.log(`popDeleteDialog`, setters)
  const childSetters = setters?.childStateSetters
  
  MosyAlertCard({
  
    icon : "trash",
  
    message: "Are you sure you want to delete this record?",

    autoDismissOnClick : false,
  
    onYes: () => {
  
      DeleteSystemUsers(deleteToken).then(response=>{
  
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
       deleteUrlParam('system_users_delete');
        
    }
  
  });

}