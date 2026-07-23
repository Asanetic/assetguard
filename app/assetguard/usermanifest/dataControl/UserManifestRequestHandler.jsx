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
export async function insertUserManifest() {
 //console.log(`Form user_manifest_ insert sent `)

  return await mosyPostFormData({
    formId: 'user_manifest__profile_form',
    url: apiRoutes.usermanifest.base,
    method: 'POST',
    isMultipart: false,
  });
}

//update record 
export async function updateUserManifest() {

  //console.log(`Form user_manifest_ update sent `)

  return await mosyPostFormData({
    formId: 'user_manifest__profile_form',
    url: apiRoutes.usermanifest.base,
    method: 'PUT',
    isMultipart: false,
  });
}


///receive form actions from profile page  
export async function inteprateUserManifestFormAction(e, setters) {
  e.preventDefault();

  const form = e.target;
  const formDataObj = new FormData(form);
  const actionType = formDataObj.get('user_manifest__mosy_action');
 
 //console.log(`Form user_manifest_ submission received action : ${actionType}`)

  try {
    let result = null;
    let actionMessage ='Record added succesfully!';

    if (actionType === 'add_user_manifest_') {

      actionMessage ='Record added succesfully!';

      result = await insertUserManifest();
    }

    if (actionType === 'update_user_manifest_') {

      actionMessage ='Record updated succesfully!';

      result = await updateUserManifest();
    }

    if (result?.status === 'success') {
      
      const user_manifest_Uptoken = btoa(result.user_manifest__dataNode || '');

      //set id key
      setters.setUserManifestUptoken(user_manifest_Uptoken);
      
      //update url with new user_manifest_Uptoken
      mosyUpdateUrlParam('user_manifest__dataNode', user_manifest_Uptoken)

      setters.setUserManifestActionStatus('update_user_manifest_')
    
      setters.setSnackMessage(actionMessage);

      return {
        status: 'success',
        message: actionMessage,
        newToken: user_manifest_Uptoken,
        actionName : actionType,
        actionType : 'user_manifest__form_submission'
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


export async function initUserManifestProfileData(rawQstr) { 

  MosyNotify({message : 'Refreshing User Manifest ' , icon:'refresh', addTimer:false})

  try {
    // Fetch the  data with the given key
    const response = await mosyGetData({
      endpoint: apiRoutes.usermanifest.base,
      params: { 
      ...rawQstr,
      src : btoa(`initUserManifestProfileData`)
      },
    });

    // Handle the successful response
    if (response.status === 'success') {
      //console.log('usermanifest Data:', response.data);  // Process the data

       closeMosyModal()

      return response.data?.[0] || {};  // Return the actual record

    } else {
          
      console.log('Error fetching usermanifest data:', response.message);  // Handle error
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


export async function DeleteUserManifest(token = '') {

    try {
      MosyNotify({message:"Sending delete request",icon:"send", addTimer : false})
    
      const response = await mosyGetData({
        endpoint: apiRoutes.usermanifest.delete,
        params: { 
          _user_manifest__delete_record: (token), 
          },
      });

      console.log('Token DeleteUserManifest '+token)
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


export async function getUserManifestListData(qstr = {}) {

  //manage pagination 
  const pageNo = mosyUrlParam('quser_manifest__page','0')
  const recordsPerPage = mosyGetLSData('systemDataLimit', '11')

  try {
    const response = await mosyGetData({
      endpoint: apiRoutes.usermanifest.base,
      params: { 
        ... qstr, 
        pageNo : pageNo,
        pageSize : recordsPerPage,
        orderType : 'desc', 
        src : btoa(`getUserManifestListData`)
        },
    });

    if (response.status === 'success') {
      //console.log('usermanifest Data:', response.data);
      return response; //Return the data
    } else {
      console.log('Error fetching usermanifest data:', response);
      MosyNotify({message:response.message, icon:'times-circle', iconColor :'text-danger'})
      
      return []; // Safe fallback
    }
  } catch (err) {

   MosyNotify({message:err, icon:'times-circle', iconColor :'text-danger'})

    console.log('Error:', err);
    return []; //  Even safer fallback
  }
}


export async function loadUserManifestListData(customQueryStr, setters) {

    const gftUserManifest = MosySecureFilterEngine('user_manifest_');
    let finalFilterStr = (gftUserManifest);    

    if(customQueryStr!='')
    {
      finalFilterStr = customQueryStr;
    }

    setters.setUserManifestLoading(true);
    
    const userManifestListData = await getUserManifestListData(finalFilterStr);
    
    setters.setUserManifestLoading(false)
    setters.setUserManifestListData(userManifestListData?.data)

    setters.setUserManifestListPageCount(userManifestListData?.pagination?.page_count)


    return userManifestListData

}
  
  
export async function userManifestProfileData(customQueryStr, setters, router, customProfileData={}) {

    const userManifestTokenId = mosyUrlParam('user_manifest__dataNode');
    
    const deleteParam = mosyUrlParam('user_manifest__delete');

    //manage  the staff_uptoken value  basically detect primkey
    let decodedUserManifestToken = '0';
    if (userManifestTokenId) {
      
      decodedUserManifestToken = atob(userManifestTokenId); // Decode the record_id
      setters.setUserManifestUptoken(userManifestTokenId);
      setters.setUserManifestActionStatus('update_user_manifest_');
      
    }
    
    //override customQueryStr if there is an active staff_uptoken else use customQueryStr if any
    let rawUserManifestQueryStr ={Node:btoa(decodedUserManifestToken)}
    if(customQueryStr!='')
    {
      // if no user_manifest__dataNode set , use customQueryStr
      if (!userManifestTokenId) {
       rawUserManifestQueryStr = customQueryStr
      }
    }

    const profileDataRecord = await initUserManifestProfileData(rawUserManifestQueryStr)

    if(deleteParam){
      popDeleteDialog(userManifestTokenId, setters, router)
    }
    
    // Merge with custom injected values (custom wins)
    const finalProfileData = {
      ...profileDataRecord,
      ...customProfileData,    
    };
      

    setters.setUserManifestNode(finalProfileData)
    
    
}
  
  

export function InteprateUserManifestEvent(data) {
     
  //console.log(' UserManifest Child gave us:', data);

  const actionName = data?.actionName

  const childActionName = { [actionName]: true };

  if(childActionName.select_user_manifest_){

    if(data?.profile)
    {
    
    //const childStateSetters = data?.setters.childSetters

    const parentSetter = data?.setters.parentStateSetters 

    parentSetter?.setLocalEventSignature(magicRandomStr())
    parentSetter?.setParentUseEffectKey(magicRandomStr())
    parentSetter?.setActiveScrollId('UserManifestProfileTray')

    
    mosyUpdateUrlParam('user_manifest__dataNode', btoa(data?.token))
    
    const router = data?.router
      
    const url = data?.url

    router.push(url, { scroll: false });

    }else{

    //const childStateSetters = data?.setters.childSetters

    const parentSetter = data?.setters.parentStateSetters 

    parentSetter?.setUserManifestCustomProfileQuery(data?.qstr)

    parentSetter?.setLocalEventSignature(magicRandomStr())
    parentSetter?.setParentUseEffectKey(magicRandomStr())
    parentSetter?.setActiveScrollId('UserManifestProfileTray')

    
    mosyUpdateUrlParam('user_manifest__dataNode', btoa(data?.token))
    
    }
  }

  if(childActionName.add_user_manifest_){

    const stateSetter =data?.setters.childStateSetters
    const parentStateSetter =data?.setters.parentStateSetters

    //console.log(`add user_manifest_ `, data?.setters)

    if(stateSetter.setLocalEventSignature){
     stateSetter?.setLocalEventSignature(magicRandomStr())
    }

    if(parentStateSetter){
      if(parentStateSetter.setLocalEventSignature){
        parentStateSetter?.setLocalEventSignature(magicRandomStr())
        parentStateSetter?.setActiveScrollId('UserManifestProfileTray')
      }
    }
     
  }

  if(childActionName.update_user_manifest_){
    const stateSetter =data?.setters.childStateSetters
    const parentStateSetter =data?.setters.parentStateSetters

    //console.log(`update user_manifest_ `, data?.setters)

    if(stateSetter.setLocalEventSignature){
     stateSetter?.setLocalEventSignature(magicRandomStr())
    }

    if(parentStateSetter){
      if(parentStateSetter.setLocalEventSignature){
        parentStateSetter?.setLocalEventSignature(magicRandomStr())
        parentStateSetter?.setActiveScrollId('UserManifestProfileTray')
        
      }
    }
  }

  if(childActionName.delete_user_manifest_){

    popDeleteDialog(btoa(data?.token), data?.setters)

 }

  
}


export function popDeleteDialog(deleteToken, setters, router, afterDeleteUrl='../usermanifest/list')
{     

  //console.log(`popDeleteDialog`, setters)
  const childSetters = setters?.childStateSetters
  
  MosyAlertCard({
  
    icon : "trash",
  
    message: "Are you sure you want to delete this record?",

    autoDismissOnClick : false,
  
    onYes: () => {
  
      DeleteUserManifest(deleteToken).then(response=>{
  
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
       deleteUrlParam('user_manifest__delete');
        
    }
  
  });

}