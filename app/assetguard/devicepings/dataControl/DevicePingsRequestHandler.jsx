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
export async function insertDevicePings() {
 //console.log(`Form device_pings insert sent `)

  return await mosyPostFormData({
    formId: 'device_pings_profile_form',
    url: apiRoutes.devicepings.base,
    method: 'POST',
    isMultipart: false,
  });
}

//update record 
export async function updateDevicePings() {

  //console.log(`Form device_pings update sent `)

  return await mosyPostFormData({
    formId: 'device_pings_profile_form',
    url: apiRoutes.devicepings.base,
    method: 'PUT',
    isMultipart: false,
  });
}


///receive form actions from profile page  
export async function inteprateDevicePingsFormAction(e, setters) {
  e.preventDefault();

  const form = e.target;
  const formDataObj = new FormData(form);
  const actionType = formDataObj.get('device_pings_mosy_action');
 
 //console.log(`Form device_pings submission received action : ${actionType}`)

  try {
    let result = null;
    let actionMessage ='Record added succesfully!';

    if (actionType === 'add_device_pings') {

      actionMessage ='Record added succesfully!';

      result = await insertDevicePings();
    }

    if (actionType === 'update_device_pings') {

      actionMessage ='Record updated succesfully!';

      result = await updateDevicePings();
    }

    if (result?.status === 'success') {
      
      const device_pingsUptoken = btoa(result.device_pings_dataNode || '');

      //set id key
      setters.setDevicePingsUptoken(device_pingsUptoken);
      
      //update url with new device_pingsUptoken
      mosyUpdateUrlParam('device_pings_dataNode', device_pingsUptoken)

      setters.setDevicePingsActionStatus('update_device_pings')
    
      setters.setSnackMessage(actionMessage);

      return {
        status: 'success',
        message: actionMessage,
        newToken: device_pingsUptoken,
        actionName : actionType,
        actionType : 'device_pings_form_submission'
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


export async function initDevicePingsProfileData(rawQstr) { 

  MosyNotify({message : 'Refreshing Device Pings' , icon:'refresh', addTimer:false})

  try {
    // Fetch the  data with the given key
    const response = await mosyGetData({
      endpoint: apiRoutes.devicepings.base,
      params: { 
      ...rawQstr,
      src : btoa(`initDevicePingsProfileData`)
      },
    });

    // Handle the successful response
    if (response.status === 'success') {
      //console.log('devicepings Data:', response.data);  // Process the data

       closeMosyModal()

      return response.data?.[0] || {};  // Return the actual record

    } else {
          
      console.log('Error fetching devicepings data:', response.message);  // Handle error
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


export async function DeleteDevicePings(token = '') {

    try {
      MosyNotify({message:"Sending delete request",icon:"send", addTimer : false})
    
      const response = await mosyGetData({
        endpoint: apiRoutes.devicepings.delete,
        params: { 
          _device_pings_delete_record: (token), 
          },
      });

      console.log('Token DeleteDevicePings '+token)
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


export async function getDevicePingsListData(qstr = {}) {

  //manage pagination 
  const pageNo = mosyUrlParam('qdevice_pings_page','0')
  const recordsPerPage = mosyGetLSData('systemDataLimit', '11')

  try {
    const response = await mosyGetData({
      endpoint: apiRoutes.devicepings.base,
      params: { 
        ... qstr, 
        pageNo : pageNo,
        pageSize : recordsPerPage,
        orderType : 'desc', 
        src : btoa(`getDevicePingsListData`)
        },
    });

    if (response.status === 'success') {
      //console.log('devicepings Data:', response.data);
      return response; //Return the data
    } else {
      console.log('Error fetching devicepings data:', response);
      MosyNotify({message:response.message, icon:'times-circle', iconColor :'text-danger'})
      
      return []; // Safe fallback
    }
  } catch (err) {

   MosyNotify({message:err, icon:'times-circle', iconColor :'text-danger'})

    console.log('Error:', err);
    return []; //  Even safer fallback
  }
}


export async function loadDevicePingsListData(customQueryStr, setters) {

    const gftDevicePings = MosySecureFilterEngine('device_pings');
    let finalFilterStr = (gftDevicePings);    

    if(customQueryStr!='')
    {
      finalFilterStr = customQueryStr;
    }

    setters.setDevicePingsLoading(true);
    
    const devicePingsListData = await getDevicePingsListData(finalFilterStr);
    
    setters.setDevicePingsLoading(false)
    setters.setDevicePingsListData(devicePingsListData?.data)

    setters.setDevicePingsListPageCount(devicePingsListData?.pagination?.page_count)


    return devicePingsListData

}
  
  
export async function devicePingsProfileData(customQueryStr, setters, router, customProfileData={}) {

    const devicePingsTokenId = mosyUrlParam('device_pings_dataNode');
    
    const deleteParam = mosyUrlParam('device_pings_delete');

    //manage  the staff_uptoken value  basically detect primkey
    let decodedDevicePingsToken = '0';
    if (devicePingsTokenId) {
      
      decodedDevicePingsToken = atob(devicePingsTokenId); // Decode the record_id
      setters.setDevicePingsUptoken(devicePingsTokenId);
      setters.setDevicePingsActionStatus('update_device_pings');
      
    }
    
    //override customQueryStr if there is an active staff_uptoken else use customQueryStr if any
    let rawDevicePingsQueryStr ={Node:btoa(decodedDevicePingsToken)}
    if(customQueryStr!='')
    {
      // if no device_pings_dataNode set , use customQueryStr
      if (!devicePingsTokenId) {
       rawDevicePingsQueryStr = customQueryStr
      }
    }

    const profileDataRecord = await initDevicePingsProfileData(rawDevicePingsQueryStr)

    if(deleteParam){
      popDeleteDialog(devicePingsTokenId, setters, router)
    }
    
    // Merge with custom injected values (custom wins)
    const finalProfileData = {
      ...profileDataRecord,
      ...customProfileData,    
    };
      

    setters.setDevicePingsNode(finalProfileData)
    
    
}
  
  

export function InteprateDevicePingsEvent(data) {
     
  //console.log(' DevicePings Child gave us:', data);

  const actionName = data?.actionName

  const childActionName = { [actionName]: true };

  if(childActionName.select_device_pings){

    if(data?.profile)
    {
    
    //const childStateSetters = data?.setters.childSetters

    const parentSetter = data?.setters.parentStateSetters 

    parentSetter?.setLocalEventSignature(magicRandomStr())
    parentSetter?.setParentUseEffectKey(magicRandomStr())
    parentSetter?.setActiveScrollId('DevicePingsProfileTray')

    
    mosyUpdateUrlParam('device_pings_dataNode', btoa(data?.token))
    
    const router = data?.router
      
    const url = data?.url

    router.push(url, { scroll: false });

    }else{

    //const childStateSetters = data?.setters.childSetters

    const parentSetter = data?.setters.parentStateSetters 

    parentSetter?.setDevicePingsCustomProfileQuery(data?.qstr)

    parentSetter?.setLocalEventSignature(magicRandomStr())
    parentSetter?.setParentUseEffectKey(magicRandomStr())
    parentSetter?.setActiveScrollId('DevicePingsProfileTray')

    
    mosyUpdateUrlParam('device_pings_dataNode', btoa(data?.token))
    
    }
  }

  if(childActionName.add_device_pings){

    const stateSetter =data?.setters.childStateSetters
    const parentStateSetter =data?.setters.parentStateSetters

    //console.log(`add device_pings `, data?.setters)

    if(stateSetter.setLocalEventSignature){
     stateSetter?.setLocalEventSignature(magicRandomStr())
    }

    if(parentStateSetter){
      if(parentStateSetter.setLocalEventSignature){
        parentStateSetter?.setLocalEventSignature(magicRandomStr())
        parentStateSetter?.setActiveScrollId('DevicePingsProfileTray')
      }
    }
     
  }

  if(childActionName.update_device_pings){
    const stateSetter =data?.setters.childStateSetters
    const parentStateSetter =data?.setters.parentStateSetters

    //console.log(`update device_pings `, data?.setters)

    if(stateSetter.setLocalEventSignature){
     stateSetter?.setLocalEventSignature(magicRandomStr())
    }

    if(parentStateSetter){
      if(parentStateSetter.setLocalEventSignature){
        parentStateSetter?.setLocalEventSignature(magicRandomStr())
        parentStateSetter?.setActiveScrollId('DevicePingsProfileTray')
        
      }
    }
  }

  if(childActionName.delete_device_pings){

    popDeleteDialog(btoa(data?.token), data?.setters)

 }

  
}


export function popDeleteDialog(deleteToken, setters, router, afterDeleteUrl='../devicepings/list')
{     

  //console.log(`popDeleteDialog`, setters)
  const childSetters = setters?.childStateSetters
  
  MosyAlertCard({
  
    icon : "trash",
  
    message: "Are you sure you want to delete this record?",

    autoDismissOnClick : false,
  
    onYes: () => {
  
      DeleteDevicePings(deleteToken).then(response=>{
  
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
       deleteUrlParam('device_pings_delete');
        
    }
  
  });

}