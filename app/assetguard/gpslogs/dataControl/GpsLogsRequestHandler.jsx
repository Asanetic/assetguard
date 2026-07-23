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
export async function insertGpsLogs() {
 //console.log(`Form gps_logs insert sent `)

  return await mosyPostFormData({
    formId: 'gps_logs_profile_form',
    url: apiRoutes.gpslogs.base,
    method: 'POST',
    isMultipart: false,
  });
}

//update record 
export async function updateGpsLogs() {

  //console.log(`Form gps_logs update sent `)

  return await mosyPostFormData({
    formId: 'gps_logs_profile_form',
    url: apiRoutes.gpslogs.base,
    method: 'PUT',
    isMultipart: false,
  });
}


///receive form actions from profile page  
export async function inteprateGpsLogsFormAction(e, setters) {
  e.preventDefault();

  const form = e.target;
  const formDataObj = new FormData(form);
  const actionType = formDataObj.get('gps_logs_mosy_action');
 
 //console.log(`Form gps_logs submission received action : ${actionType}`)

  try {
    let result = null;
    let actionMessage ='Record added succesfully!';

    if (actionType === 'add_gps_logs') {

      actionMessage ='Record added succesfully!';

      result = await insertGpsLogs();
    }

    if (actionType === 'update_gps_logs') {

      actionMessage ='Record updated succesfully!';

      result = await updateGpsLogs();
    }

    if (result?.status === 'success') {
      
      const gps_logsUptoken = btoa(result.gps_logs_dataNode || '');

      //set id key
      setters.setGpsLogsUptoken(gps_logsUptoken);
      
      //update url with new gps_logsUptoken
      mosyUpdateUrlParam('gps_logs_dataNode', gps_logsUptoken)

      setters.setGpsLogsActionStatus('update_gps_logs')
    
      setters.setSnackMessage(actionMessage);

      return {
        status: 'success',
        message: actionMessage,
        newToken: gps_logsUptoken,
        actionName : actionType,
        actionType : 'gps_logs_form_submission'
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


export async function initGpsLogsProfileData(rawQstr) { 

  MosyNotify({message : 'Refreshing Gps Logs' , icon:'refresh', addTimer:false})

  try {
    // Fetch the  data with the given key
    const response = await mosyGetData({
      endpoint: apiRoutes.gpslogs.base,
      params: { 
      ...rawQstr,
      src : btoa(`initGpsLogsProfileData`)
      },
    });

    // Handle the successful response
    if (response.status === 'success') {
      //console.log('gpslogs Data:', response.data);  // Process the data

       closeMosyModal()

      return response.data?.[0] || {};  // Return the actual record

    } else {
          
      console.log('Error fetching gpslogs data:', response.message);  // Handle error
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


export async function DeleteGpsLogs(token = '') {

    try {
      MosyNotify({message:"Sending delete request",icon:"send", addTimer : false})
    
      const response = await mosyGetData({
        endpoint: apiRoutes.gpslogs.delete,
        params: { 
          _gps_logs_delete_record: (token), 
          },
      });

      console.log('Token DeleteGpsLogs '+token)
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


export async function getGpsLogsListData(qstr = {}) {

  //manage pagination 
  const pageNo = mosyUrlParam('qgps_logs_page','0')
  const recordsPerPage = mosyGetLSData('systemDataLimit', '11')

  try {
    const response = await mosyGetData({
      endpoint: apiRoutes.gpslogs.base,
      params: { 
        ... qstr, 
        pageNo : pageNo,
        pageSize : recordsPerPage,
        orderType : 'desc', 
        src : btoa(`getGpsLogsListData`)
        },
    });

    if (response.status === 'success') {
      //console.log('gpslogs Data:', response.data);
      return response; //Return the data
    } else {
      console.log('Error fetching gpslogs data:', response);
      MosyNotify({message:response.message, icon:'times-circle', iconColor :'text-danger'})
      
      return []; // Safe fallback
    }
  } catch (err) {

   MosyNotify({message:err, icon:'times-circle', iconColor :'text-danger'})

    console.log('Error:', err);
    return []; //  Even safer fallback
  }
}


export async function loadGpsLogsListData(customQueryStr, setters) {

    const gftGpsLogs = MosySecureFilterEngine('gps_logs');
    let finalFilterStr = (gftGpsLogs);    

    if(customQueryStr!='')
    {
      finalFilterStr = customQueryStr;
    }

    setters.setGpsLogsLoading(true);
    
    const gpsLogsListData = await getGpsLogsListData(finalFilterStr);
    
    setters.setGpsLogsLoading(false)
    setters.setGpsLogsListData(gpsLogsListData?.data)

    setters.setGpsLogsListPageCount(gpsLogsListData?.pagination?.page_count)


    return gpsLogsListData

}
  
  
export async function gpsLogsProfileData(customQueryStr, setters, router, customProfileData={}) {

    const gpsLogsTokenId = mosyUrlParam('gps_logs_dataNode');
    
    const deleteParam = mosyUrlParam('gps_logs_delete');

    //manage  the staff_uptoken value  basically detect primkey
    let decodedGpsLogsToken = '0';
    if (gpsLogsTokenId) {
      
      decodedGpsLogsToken = atob(gpsLogsTokenId); // Decode the record_id
      setters.setGpsLogsUptoken(gpsLogsTokenId);
      setters.setGpsLogsActionStatus('update_gps_logs');
      
    }
    
    //override customQueryStr if there is an active staff_uptoken else use customQueryStr if any
    let rawGpsLogsQueryStr ={Node:btoa(decodedGpsLogsToken)}
    if(customQueryStr!='')
    {
      // if no gps_logs_dataNode set , use customQueryStr
      if (!gpsLogsTokenId) {
       rawGpsLogsQueryStr = customQueryStr
      }
    }

    const profileDataRecord = await initGpsLogsProfileData(rawGpsLogsQueryStr)

    if(deleteParam){
      popDeleteDialog(gpsLogsTokenId, setters, router)
    }
    
    // Merge with custom injected values (custom wins)
    const finalProfileData = {
      ...profileDataRecord,
      ...customProfileData,    
    };
      

    setters.setGpsLogsNode(finalProfileData)
    
    
}
  
  

export function InteprateGpsLogsEvent(data) {
     
  //console.log(' GpsLogs Child gave us:', data);

  const actionName = data?.actionName

  const childActionName = { [actionName]: true };

  if(childActionName.select_gps_logs){

    if(data?.profile)
    {
    
    //const childStateSetters = data?.setters.childSetters

    const parentSetter = data?.setters.parentStateSetters 

    parentSetter?.setLocalEventSignature(magicRandomStr())
    parentSetter?.setParentUseEffectKey(magicRandomStr())
    parentSetter?.setActiveScrollId('GpsLogsProfileTray')

    
    mosyUpdateUrlParam('gps_logs_dataNode', btoa(data?.token))
    
    const router = data?.router
      
    const url = data?.url

    router.push(url, { scroll: false });

    }else{

    //const childStateSetters = data?.setters.childSetters

    const parentSetter = data?.setters.parentStateSetters 

    parentSetter?.setGpsLogsCustomProfileQuery(data?.qstr)

    parentSetter?.setLocalEventSignature(magicRandomStr())
    parentSetter?.setParentUseEffectKey(magicRandomStr())
    parentSetter?.setActiveScrollId('GpsLogsProfileTray')

    
    mosyUpdateUrlParam('gps_logs_dataNode', btoa(data?.token))
    
    }
  }

  if(childActionName.add_gps_logs){

    const stateSetter =data?.setters.childStateSetters
    const parentStateSetter =data?.setters.parentStateSetters

    //console.log(`add gps_logs `, data?.setters)

    if(stateSetter.setLocalEventSignature){
     stateSetter?.setLocalEventSignature(magicRandomStr())
    }

    if(parentStateSetter){
      if(parentStateSetter.setLocalEventSignature){
        parentStateSetter?.setLocalEventSignature(magicRandomStr())
        parentStateSetter?.setActiveScrollId('GpsLogsProfileTray')
      }
    }
     
  }

  if(childActionName.update_gps_logs){
    const stateSetter =data?.setters.childStateSetters
    const parentStateSetter =data?.setters.parentStateSetters

    //console.log(`update gps_logs `, data?.setters)

    if(stateSetter.setLocalEventSignature){
     stateSetter?.setLocalEventSignature(magicRandomStr())
    }

    if(parentStateSetter){
      if(parentStateSetter.setLocalEventSignature){
        parentStateSetter?.setLocalEventSignature(magicRandomStr())
        parentStateSetter?.setActiveScrollId('GpsLogsProfileTray')
        
      }
    }
  }

  if(childActionName.delete_gps_logs){

    popDeleteDialog(btoa(data?.token), data?.setters)

 }

  
}


export function popDeleteDialog(deleteToken, setters, router, afterDeleteUrl='../gpslogs/list')
{     

  //console.log(`popDeleteDialog`, setters)
  const childSetters = setters?.childStateSetters
  
  MosyAlertCard({
  
    icon : "trash",
  
    message: "Are you sure you want to delete this record?",

    autoDismissOnClick : false,
  
    onYes: () => {
  
      DeleteGpsLogs(deleteToken).then(response=>{
  
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
       deleteUrlParam('gps_logs_delete');
        
    }
  
  });

}