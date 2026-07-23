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
export async function insertUsers() {
 //console.log(`Form users insert sent `)

  return await mosyPostFormData({
    formId: 'users_profile_form',
    url: apiRoutes.users.base,
    method: 'POST',
    isMultipart: true,
  });
}

//update record 
export async function updateUsers() {

  //console.log(`Form users update sent `)

  return await mosyPostFormData({
    formId: 'users_profile_form',
    url: apiRoutes.users.base,
    method: 'PUT',
    isMultipart: true,
  });
}


///receive form actions from profile page  
export async function inteprateUsersFormAction(e, setters) {
  e.preventDefault();

  const form = e.target;
  const formDataObj = new FormData(form);
  const actionType = formDataObj.get('users_mosy_action');
 
 //console.log(`Form users submission received action : ${actionType}`)

  try {
    let result = null;
    let actionMessage ='Record added succesfully!';

    if (actionType === 'add_users') {

      actionMessage ='Record added succesfully!';

      result = await insertUsers();
    }

    if (actionType === 'update_users') {

      actionMessage ='Record updated succesfully!';

      result = await updateUsers();
    }

    if (result?.status === 'success') {
      
      const usersUptoken = btoa(result.users_dataNode || '');

      //set id key
      setters.setUsersUptoken(usersUptoken);
      
      //update url with new usersUptoken
      mosyUpdateUrlParam('users_dataNode', usersUptoken)

      setters.setUsersActionStatus('update_users')
    
      setters.setSnackMessage(actionMessage);

      return {
        status: 'success',
        message: actionMessage,
        newToken: usersUptoken,
        actionName : actionType,
        actionType : 'users_form_submission'
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


export async function initUsersProfileData(rawQstr) { 

  MosyNotify({message : 'Refreshing Users' , icon:'refresh', addTimer:false})

  try {
    // Fetch the  data with the given key
    const response = await mosyGetData({
      endpoint: apiRoutes.users.base,
      params: { 
      ...rawQstr,
      src : btoa(`initUsersProfileData`)
      },
    });

    // Handle the successful response
    if (response.status === 'success') {
      //console.log('users Data:', response.data);  // Process the data

       closeMosyModal()

      return response.data?.[0] || {};  // Return the actual record

    } else {
          
      console.log('Error fetching users data:', response.message);  // Handle error
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


export async function DeleteUsers(token = '') {

    try {
      MosyNotify({message:"Sending delete request",icon:"send", addTimer : false})
    
      const response = await mosyGetData({
        endpoint: apiRoutes.users.delete,
        params: { 
          _users_delete_record: (token), 
          },
      });

      console.log('Token DeleteUsers '+token)
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


export async function getUsersListData(qstr = {}) {

  //manage pagination 
  const pageNo = mosyUrlParam('qusers_page','0')
  const recordsPerPage = mosyGetLSData('systemDataLimit', '11')

  try {
    const response = await mosyGetData({
      endpoint: apiRoutes.users.base,
      params: { 
        ... qstr, 
        pageNo : pageNo,
        pageSize : recordsPerPage,
        orderType : 'desc', 
        src : btoa(`getUsersListData`)
        },
    });

    if (response.status === 'success') {
      //console.log('users Data:', response.data);
      return response; //Return the data
    } else {
      console.log('Error fetching users data:', response);
      MosyNotify({message:response.message, icon:'times-circle', iconColor :'text-danger'})
      
      return []; // Safe fallback
    }
  } catch (err) {

   MosyNotify({message:err, icon:'times-circle', iconColor :'text-danger'})

    console.log('Error:', err);
    return []; //  Even safer fallback
  }
}


export async function loadUsersListData(customQueryStr, setters) {

    const gftUsers = MosySecureFilterEngine('users');
    let finalFilterStr = (gftUsers);    

    if(customQueryStr!='')
    {
      finalFilterStr = customQueryStr;
    }

    setters.setUsersLoading(true);
    
    const usersListData = await getUsersListData(finalFilterStr);
    
    setters.setUsersLoading(false)
    setters.setUsersListData(usersListData?.data)

    setters.setUsersListPageCount(usersListData?.pagination?.page_count)


    return usersListData

}
  
  
export async function usersProfileData(customQueryStr, setters, router, customProfileData={}) {

    const usersTokenId = mosyUrlParam('users_dataNode');
    
    const deleteParam = mosyUrlParam('users_delete');

    //manage  the staff_uptoken value  basically detect primkey
    let decodedUsersToken = '0';
    if (usersTokenId) {
      
      decodedUsersToken = atob(usersTokenId); // Decode the record_id
      setters.setUsersUptoken(usersTokenId);
      setters.setUsersActionStatus('update_users');
      
    }
    
    //override customQueryStr if there is an active staff_uptoken else use customQueryStr if any
    let rawUsersQueryStr ={Node:btoa(decodedUsersToken)}
    if(customQueryStr!='')
    {
      // if no users_dataNode set , use customQueryStr
      if (!usersTokenId) {
       rawUsersQueryStr = customQueryStr
      }
    }

    const profileDataRecord = await initUsersProfileData(rawUsersQueryStr)

    if(deleteParam){
      popDeleteDialog(usersTokenId, setters, router)
    }
    
    // Merge with custom injected values (custom wins)
    const finalProfileData = {
      ...profileDataRecord,
      ...customProfileData,    
    };
      

    setters.setUsersNode(finalProfileData)
    
    
}
  
  

export function InteprateUsersEvent(data) {
     
  //console.log(' Users Child gave us:', data);

  const actionName = data?.actionName

  const childActionName = { [actionName]: true };

  if(childActionName.select_users){

    if(data?.profile)
    {
    
    //const childStateSetters = data?.setters.childSetters

    const parentSetter = data?.setters.parentStateSetters 

    parentSetter?.setLocalEventSignature(magicRandomStr())
    parentSetter?.setParentUseEffectKey(magicRandomStr())
    parentSetter?.setActiveScrollId('UsersProfileTray')

    
    mosyUpdateUrlParam('users_dataNode', btoa(data?.token))
    
    const router = data?.router
      
    const url = data?.url

    router.push(url, { scroll: false });

    }else{

    //const childStateSetters = data?.setters.childSetters

    const parentSetter = data?.setters.parentStateSetters 

    parentSetter?.setUsersCustomProfileQuery(data?.qstr)

    parentSetter?.setLocalEventSignature(magicRandomStr())
    parentSetter?.setParentUseEffectKey(magicRandomStr())
    parentSetter?.setActiveScrollId('UsersProfileTray')

    
    mosyUpdateUrlParam('users_dataNode', btoa(data?.token))
    
    }
  }

  if(childActionName.add_users){

    const stateSetter =data?.setters.childStateSetters
    const parentStateSetter =data?.setters.parentStateSetters

    //console.log(`add users `, data?.setters)

    if(stateSetter.setLocalEventSignature){
     stateSetter?.setLocalEventSignature(magicRandomStr())
    }

    if(parentStateSetter){
      if(parentStateSetter.setLocalEventSignature){
        parentStateSetter?.setLocalEventSignature(magicRandomStr())
        parentStateSetter?.setActiveScrollId('UsersProfileTray')
      }
    }
     
  }

  if(childActionName.update_users){
    const stateSetter =data?.setters.childStateSetters
    const parentStateSetter =data?.setters.parentStateSetters

    //console.log(`update users `, data?.setters)

    if(stateSetter.setLocalEventSignature){
     stateSetter?.setLocalEventSignature(magicRandomStr())
    }

    if(parentStateSetter){
      if(parentStateSetter.setLocalEventSignature){
        parentStateSetter?.setLocalEventSignature(magicRandomStr())
        parentStateSetter?.setActiveScrollId('UsersProfileTray')
        
      }
    }
  }

  if(childActionName.delete_users){

    popDeleteDialog(btoa(data?.token), data?.setters)

 }

  
}


export function popDeleteDialog(deleteToken, setters, router, afterDeleteUrl='../users/list')
{     

  //console.log(`popDeleteDialog`, setters)
  const childSetters = setters?.childStateSetters
  
  MosyAlertCard({
  
    icon : "trash",
  
    message: "Are you sure you want to delete this record?",

    autoDismissOnClick : false,
  
    onYes: () => {
  
      DeleteUsers(deleteToken).then(response=>{
  
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
       deleteUrlParam('users_delete');
        
    }
  
  });

}