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
export async function insertDeviceList() {
 //console.log(`Form device_list insert sent `)

  return await mosyPostFormData({
    formId: 'device_list_profile_form',
    url: apiRoutes.devicelist.base,
    method: 'POST',
    isMultipart: false,
  });
}

//update record 
export async function updateDeviceList() {

  //console.log(`Form device_list update sent `)

  return await mosyPostFormData({
    formId: 'device_list_profile_form',
    url: apiRoutes.devicelist.base,
    method: 'PUT',
    isMultipart: false,
  });
}


///receive form actions from profile page  
export async function inteprateDeviceListFormAction(e, setters) {
  e.preventDefault();

  const form = e.target;
  const formDataObj = new FormData(form);
  const actionType = formDataObj.get('device_list_mosy_action');
 
 //console.log(`Form device_list submission received action : ${actionType}`)

  try {
    let result = null;
    let actionMessage ='Record added succesfully!';

    if (actionType === 'add_device_list') {

      actionMessage ='Record added succesfully!';

      result = await insertDeviceList();
    }

    if (actionType === 'update_device_list') {

      actionMessage ='Record updated succesfully!';

      result = await updateDeviceList();
    }

    if (result?.status === 'success') {
      
      const device_listUptoken = btoa(result.device_list_dataNode || '');

      //set id key
      setters.setDeviceListUptoken(device_listUptoken);
      
      //update url with new device_listUptoken
      mosyUpdateUrlParam('device_list_dataNode', device_listUptoken)

      setters.setDeviceListActionStatus('update_device_list')
    
      setters.setSnackMessage(actionMessage);

      return {
        status: 'success',
        message: actionMessage,
        newToken: device_listUptoken,
        actionName : actionType,
        actionType : 'device_list_form_submission'
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


export async function initDeviceListProfileData(rawQstr) { 

  MosyNotify({message : 'Refreshing Device List' , icon:'refresh', addTimer:false})

  try {
    // Fetch the  data with the given key
    const response = await mosyGetData({
      endpoint: apiRoutes.devicelist.base,
      params: { 
      ...rawQstr,
      src : btoa(`initDeviceListProfileData`)
      },
    });

    // Handle the successful response
    if (response.status === 'success') {
      //console.log('devicelist Data:', response.data);  // Process the data

       closeMosyModal()

      return response.data?.[0] || {};  // Return the actual record

    } else {
          
      console.log('Error fetching devicelist data:', response.message);  // Handle error
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


export async function DeleteDeviceList(token = '') {

    try {
      MosyNotify({message:"Sending delete request",icon:"send", addTimer : false})
    
      const response = await mosyGetData({
        endpoint: apiRoutes.devicelist.delete,
        params: { 
          _device_list_delete_record: (token), 
          },
      });

      console.log('Token DeleteDeviceList '+token)
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


export async function getDeviceListListData(qstr = {}) {

  //manage pagination 
  const pageNo = mosyUrlParam('qdevice_list_page','0')
  const recordsPerPage = mosyGetLSData('systemDataLimit', '11')

  try {
    const response = await mosyGetData({
      endpoint: apiRoutes.devicelist.base,
      params: { 
        ... qstr, 
        pageNo : pageNo,
        pageSize : recordsPerPage,
        orderType : 'desc', 
        src : btoa(`getDeviceListListData`)
        },
    });

    if (response.status === 'success') {
      //console.log('devicelist Data:', response.data);
      return response; //Return the data
    } else {
      console.log('Error fetching devicelist data:', response);
      MosyNotify({message:response.message, icon:'times-circle', iconColor :'text-danger'})
      
      return []; // Safe fallback
    }
  } catch (err) {

   MosyNotify({message:err, icon:'times-circle', iconColor :'text-danger'})

    console.log('Error:', err);
    return []; //  Even safer fallback
  }
}


export async function loadDeviceListListData(customQueryStr, setters) {

    const gftDeviceList = MosySecureFilterEngine('device_list');
    let finalFilterStr = (gftDeviceList);    

    if(customQueryStr!='')
    {
      finalFilterStr = customQueryStr;
    }

    setters.setDeviceListLoading(true);
    
    const deviceListListData = await getDeviceListListData(finalFilterStr);
    
    setters.setDeviceListLoading(false)
    setters.setDeviceListListData(deviceListListData?.data)

    setters.setDeviceListListPageCount(deviceListListData?.pagination?.page_count)


    return deviceListListData

}
  
  
export async function deviceListProfileData(customQueryStr, setters, router, customProfileData={}) {

    const deviceListTokenId = mosyUrlParam('device_list_dataNode');
    
    const deleteParam = mosyUrlParam('device_list_delete');

    //manage  the staff_uptoken value  basically detect primkey
    let decodedDeviceListToken = '0';
    if (deviceListTokenId) {
      
      decodedDeviceListToken = atob(deviceListTokenId); // Decode the record_id
      setters.setDeviceListUptoken(deviceListTokenId);
      setters.setDeviceListActionStatus('update_device_list');
      
    }
    
    //override customQueryStr if there is an active staff_uptoken else use customQueryStr if any
    let rawDeviceListQueryStr ={Node:btoa(decodedDeviceListToken)}
    if(customQueryStr!='')
    {
      // if no device_list_dataNode set , use customQueryStr
      if (!deviceListTokenId) {
       rawDeviceListQueryStr = customQueryStr
      }
    }

    const profileDataRecord = await initDeviceListProfileData(rawDeviceListQueryStr)

    if(deleteParam){
      popDeleteDialog(deviceListTokenId, setters, router)
    }
    
    // Merge with custom injected values (custom wins)
    const finalProfileData = {
      ...profileDataRecord,
      ...customProfileData,    
    };
      

    setters.setDeviceListNode(finalProfileData)
    
    
}
  
  

export function InteprateDeviceListEvent(data) {
     
  //console.log(' DeviceList Child gave us:', data);

  const actionName = data?.actionName

  const childActionName = { [actionName]: true };

  if(childActionName.select_device_list){

    if(data?.profile)
    {
    
    //const childStateSetters = data?.setters.childSetters

    const parentSetter = data?.setters.parentStateSetters 

    parentSetter?.setLocalEventSignature(magicRandomStr())
    parentSetter?.setParentUseEffectKey(magicRandomStr())
    parentSetter?.setActiveScrollId('DeviceListProfileTray')

    
    mosyUpdateUrlParam('device_list_dataNode', btoa(data?.token))
    
    const router = data?.router
      
    const url = data?.url

    router.push(url, { scroll: false });

    }else{

    //const childStateSetters = data?.setters.childSetters

    const parentSetter = data?.setters.parentStateSetters 

    parentSetter?.setDeviceListCustomProfileQuery(data?.qstr)

    parentSetter?.setLocalEventSignature(magicRandomStr())
    parentSetter?.setParentUseEffectKey(magicRandomStr())
    parentSetter?.setActiveScrollId('DeviceListProfileTray')

    
    mosyUpdateUrlParam('device_list_dataNode', btoa(data?.token))
    
    }
  }

  if(childActionName.add_device_list){

    const stateSetter =data?.setters.childStateSetters
    const parentStateSetter =data?.setters.parentStateSetters

    //console.log(`add device_list `, data?.setters)

    if(stateSetter.setLocalEventSignature){
     stateSetter?.setLocalEventSignature(magicRandomStr())
    }

    if(parentStateSetter){
      if(parentStateSetter.setLocalEventSignature){
        parentStateSetter?.setLocalEventSignature(magicRandomStr())
        parentStateSetter?.setActiveScrollId('DeviceListProfileTray')
      }
    }
     
  }

  if(childActionName.update_device_list){
    const stateSetter =data?.setters.childStateSetters
    const parentStateSetter =data?.setters.parentStateSetters

    //console.log(`update device_list `, data?.setters)

    if(stateSetter.setLocalEventSignature){
     stateSetter?.setLocalEventSignature(magicRandomStr())
    }

    if(parentStateSetter){
      if(parentStateSetter.setLocalEventSignature){
        parentStateSetter?.setLocalEventSignature(magicRandomStr())
        parentStateSetter?.setActiveScrollId('DeviceListProfileTray')
        
      }
    }
  }

  if(childActionName.delete_device_list){

    popDeleteDialog(btoa(data?.token), data?.setters)

 }

  
}


export function popDeleteDialog(deleteToken, setters, router, afterDeleteUrl='../devicelist/list')
{     

  //console.log(`popDeleteDialog`, setters)
  const childSetters = setters?.childStateSetters
  
  MosyAlertCard({
  
    icon : "trash",
  
    message: "Are you sure you want to delete this record?",

    autoDismissOnClick : false,
  
    onYes: () => {
  
      DeleteDeviceList(deleteToken).then(response=>{
  
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
       deleteUrlParam('device_list_delete');
        
    }
  
  });

}