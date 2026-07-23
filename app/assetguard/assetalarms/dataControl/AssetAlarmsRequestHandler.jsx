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
export async function insertAssetAlarms() {
 //console.log(`Form asset_alarms insert sent `)

  return await mosyPostFormData({
    formId: 'asset_alarms_profile_form',
    url: apiRoutes.assetalarms.base,
    method: 'POST',
    isMultipart: false,
  });
}

//update record 
export async function updateAssetAlarms() {

  //console.log(`Form asset_alarms update sent `)

  return await mosyPostFormData({
    formId: 'asset_alarms_profile_form',
    url: apiRoutes.assetalarms.base,
    method: 'PUT',
    isMultipart: false,
  });
}


///receive form actions from profile page  
export async function inteprateAssetAlarmsFormAction(e, setters) {
  e.preventDefault();

  const form = e.target;
  const formDataObj = new FormData(form);
  const actionType = formDataObj.get('asset_alarms_mosy_action');
 
 //console.log(`Form asset_alarms submission received action : ${actionType}`)

  try {
    let result = null;
    let actionMessage ='Record added succesfully!';

    if (actionType === 'add_asset_alarms') {

      actionMessage ='Record added succesfully!';

      result = await insertAssetAlarms();
    }

    if (actionType === 'update_asset_alarms') {

      actionMessage ='Record updated succesfully!';

      result = await updateAssetAlarms();
    }

    if (result?.status === 'success') {
      
      const asset_alarmsUptoken = btoa(result.asset_alarms_dataNode || '');

      //set id key
      setters.setAssetAlarmsUptoken(asset_alarmsUptoken);
      
      //update url with new asset_alarmsUptoken
      mosyUpdateUrlParam('asset_alarms_dataNode', asset_alarmsUptoken)

      setters.setAssetAlarmsActionStatus('update_asset_alarms')
    
      setters.setSnackMessage(actionMessage);

      return {
        status: 'success',
        message: actionMessage,
        newToken: asset_alarmsUptoken,
        actionName : actionType,
        actionType : 'asset_alarms_form_submission'
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


export async function initAssetAlarmsProfileData(rawQstr) { 

  MosyNotify({message : 'Refreshing Asset Alarms' , icon:'refresh', addTimer:false})

  try {
    // Fetch the  data with the given key
    const response = await mosyGetData({
      endpoint: apiRoutes.assetalarms.base,
      params: { 
      ...rawQstr,
      src : btoa(`initAssetAlarmsProfileData`)
      },
    });

    // Handle the successful response
    if (response.status === 'success') {
      //console.log('assetalarms Data:', response.data);  // Process the data

       closeMosyModal()

      return response.data?.[0] || {};  // Return the actual record

    } else {
          
      console.log('Error fetching assetalarms data:', response.message);  // Handle error
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


export async function DeleteAssetAlarms(token = '') {

    try {
      MosyNotify({message:"Sending delete request",icon:"send", addTimer : false})
    
      const response = await mosyGetData({
        endpoint: apiRoutes.assetalarms.delete,
        params: { 
          _asset_alarms_delete_record: (token), 
          },
      });

      console.log('Token DeleteAssetAlarms '+token)
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


export async function getAssetAlarmsListData(qstr = {}) {

  //manage pagination 
  const pageNo = mosyUrlParam('qasset_alarms_page','0')
  const recordsPerPage = mosyGetLSData('systemDataLimit', '11')

  try {
    const response = await mosyGetData({
      endpoint: apiRoutes.assetalarms.base,
      params: { 
        ... qstr, 
        pageNo : pageNo,
        pageSize : recordsPerPage,
        orderType : 'desc', 
        src : btoa(`getAssetAlarmsListData`)
        },
    });

    if (response.status === 'success') {
      //console.log('assetalarms Data:', response.data);
      return response; //Return the data
    } else {
      console.log('Error fetching assetalarms data:', response);
      MosyNotify({message:response.message, icon:'times-circle', iconColor :'text-danger'})
      
      return []; // Safe fallback
    }
  } catch (err) {

   MosyNotify({message:err, icon:'times-circle', iconColor :'text-danger'})

    console.log('Error:', err);
    return []; //  Even safer fallback
  }
}


export async function loadAssetAlarmsListData(customQueryStr, setters) {

    const gftAssetAlarms = MosySecureFilterEngine('asset_alarms');
    let finalFilterStr = (gftAssetAlarms);    

    if(customQueryStr!='')
    {
      finalFilterStr = customQueryStr;
    }

    setters.setAssetAlarmsLoading(true);
    
    const assetAlarmsListData = await getAssetAlarmsListData(finalFilterStr);
    
    setters.setAssetAlarmsLoading(false)
    setters.setAssetAlarmsListData(assetAlarmsListData?.data)

    setters.setAssetAlarmsListPageCount(assetAlarmsListData?.pagination?.page_count)


    return assetAlarmsListData

}
  
  
export async function assetAlarmsProfileData(customQueryStr, setters, router, customProfileData={}) {

    const assetAlarmsTokenId = mosyUrlParam('asset_alarms_dataNode');
    
    const deleteParam = mosyUrlParam('asset_alarms_delete');

    //manage  the staff_uptoken value  basically detect primkey
    let decodedAssetAlarmsToken = '0';
    if (assetAlarmsTokenId) {
      
      decodedAssetAlarmsToken = atob(assetAlarmsTokenId); // Decode the record_id
      setters.setAssetAlarmsUptoken(assetAlarmsTokenId);
      setters.setAssetAlarmsActionStatus('update_asset_alarms');
      
    }
    
    //override customQueryStr if there is an active staff_uptoken else use customQueryStr if any
    let rawAssetAlarmsQueryStr ={Node:btoa(decodedAssetAlarmsToken)}
    if(customQueryStr!='')
    {
      // if no asset_alarms_dataNode set , use customQueryStr
      if (!assetAlarmsTokenId) {
       rawAssetAlarmsQueryStr = customQueryStr
      }
    }

    const profileDataRecord = await initAssetAlarmsProfileData(rawAssetAlarmsQueryStr)

    if(deleteParam){
      popDeleteDialog(assetAlarmsTokenId, setters, router)
    }
    
    // Merge with custom injected values (custom wins)
    const finalProfileData = {
      ...profileDataRecord,
      ...customProfileData,    
    };
      

    setters.setAssetAlarmsNode(finalProfileData)
    
    
}
  
  

export function InteprateAssetAlarmsEvent(data) {
     
  //console.log(' AssetAlarms Child gave us:', data);

  const actionName = data?.actionName

  const childActionName = { [actionName]: true };

  if(childActionName.select_asset_alarms){

    if(data?.profile)
    {
    
    //const childStateSetters = data?.setters.childSetters

    const parentSetter = data?.setters.parentStateSetters 

    parentSetter?.setLocalEventSignature(magicRandomStr())
    parentSetter?.setParentUseEffectKey(magicRandomStr())
    parentSetter?.setActiveScrollId('AssetAlarmsProfileTray')

    
    mosyUpdateUrlParam('asset_alarms_dataNode', btoa(data?.token))
    
    const router = data?.router
      
    const url = data?.url

    router.push(url, { scroll: false });

    }else{

    //const childStateSetters = data?.setters.childSetters

    const parentSetter = data?.setters.parentStateSetters 

    parentSetter?.setAssetAlarmsCustomProfileQuery(data?.qstr)

    parentSetter?.setLocalEventSignature(magicRandomStr())
    parentSetter?.setParentUseEffectKey(magicRandomStr())
    parentSetter?.setActiveScrollId('AssetAlarmsProfileTray')

    
    mosyUpdateUrlParam('asset_alarms_dataNode', btoa(data?.token))
    
    }
  }

  if(childActionName.add_asset_alarms){

    const stateSetter =data?.setters.childStateSetters
    const parentStateSetter =data?.setters.parentStateSetters

    //console.log(`add asset_alarms `, data?.setters)

    if(stateSetter.setLocalEventSignature){
     stateSetter?.setLocalEventSignature(magicRandomStr())
    }

    if(parentStateSetter){
      if(parentStateSetter.setLocalEventSignature){
        parentStateSetter?.setLocalEventSignature(magicRandomStr())
        parentStateSetter?.setActiveScrollId('AssetAlarmsProfileTray')
      }
    }
     
  }

  if(childActionName.update_asset_alarms){
    const stateSetter =data?.setters.childStateSetters
    const parentStateSetter =data?.setters.parentStateSetters

    //console.log(`update asset_alarms `, data?.setters)

    if(stateSetter.setLocalEventSignature){
     stateSetter?.setLocalEventSignature(magicRandomStr())
    }

    if(parentStateSetter){
      if(parentStateSetter.setLocalEventSignature){
        parentStateSetter?.setLocalEventSignature(magicRandomStr())
        parentStateSetter?.setActiveScrollId('AssetAlarmsProfileTray')
        
      }
    }
  }

  if(childActionName.delete_asset_alarms){

    popDeleteDialog(btoa(data?.token), data?.setters)

 }

  
}


export function popDeleteDialog(deleteToken, setters, router, afterDeleteUrl='../assetalarms/list')
{     

  //console.log(`popDeleteDialog`, setters)
  const childSetters = setters?.childStateSetters
  
  MosyAlertCard({
  
    icon : "trash",
  
    message: "Are you sure you want to delete this record?",

    autoDismissOnClick : false,
  
    onYes: () => {
  
      DeleteAssetAlarms(deleteToken).then(response=>{
  
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
       deleteUrlParam('asset_alarms_delete');
        
    }
  
  });

}