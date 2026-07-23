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
export async function insertPageManifest() {
 //console.log(`Form page_manifest_ insert sent `)

  return await mosyPostFormData({
    formId: 'page_manifest__profile_form',
    url: apiRoutes.pagemanifest.base,
    method: 'POST',
    isMultipart: false,
  });
}

//update record 
export async function updatePageManifest() {

  //console.log(`Form page_manifest_ update sent `)

  return await mosyPostFormData({
    formId: 'page_manifest__profile_form',
    url: apiRoutes.pagemanifest.base,
    method: 'PUT',
    isMultipart: false,
  });
}


///receive form actions from profile page  
export async function intepratePageManifestFormAction(e, setters) {
  e.preventDefault();

  const form = e.target;
  const formDataObj = new FormData(form);
  const actionType = formDataObj.get('page_manifest__mosy_action');
 
 //console.log(`Form page_manifest_ submission received action : ${actionType}`)

  try {
    let result = null;
    let actionMessage ='Record added succesfully!';

    if (actionType === 'add_page_manifest_') {

      actionMessage ='Record added succesfully!';

      result = await insertPageManifest();
    }

    if (actionType === 'update_page_manifest_') {

      actionMessage ='Record updated succesfully!';

      result = await updatePageManifest();
    }

    if (result?.status === 'success') {
      
      const page_manifest_Uptoken = btoa(result.page_manifest__dataNode || '');

      //set id key
      setters.setPageManifestUptoken(page_manifest_Uptoken);
      
      //update url with new page_manifest_Uptoken
      mosyUpdateUrlParam('page_manifest__dataNode', page_manifest_Uptoken)

      setters.setPageManifestActionStatus('update_page_manifest_')
    
      setters.setSnackMessage(actionMessage);

      return {
        status: 'success',
        message: actionMessage,
        newToken: page_manifest_Uptoken,
        actionName : actionType,
        actionType : 'page_manifest__form_submission'
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


export async function initPageManifestProfileData(rawQstr) { 

  MosyNotify({message : 'Refreshing Page Manifest ' , icon:'refresh', addTimer:false})

  try {
    // Fetch the  data with the given key
    const response = await mosyGetData({
      endpoint: apiRoutes.pagemanifest.base,
      params: { 
      ...rawQstr,
      src : btoa(`initPageManifestProfileData`)
      },
    });

    // Handle the successful response
    if (response.status === 'success') {
      //console.log('pagemanifest Data:', response.data);  // Process the data

       closeMosyModal()

      return response.data?.[0] || {};  // Return the actual record

    } else {
          
      console.log('Error fetching pagemanifest data:', response.message);  // Handle error
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


export async function DeletePageManifest(token = '') {

    try {
      MosyNotify({message:"Sending delete request",icon:"send", addTimer : false})
    
      const response = await mosyGetData({
        endpoint: apiRoutes.pagemanifest.delete,
        params: { 
          _page_manifest__delete_record: (token), 
          },
      });

      console.log('Token DeletePageManifest '+token)
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


export async function getPageManifestListData(qstr = {}) {

  //manage pagination 
  const pageNo = mosyUrlParam('qpage_manifest__page','0')
  const recordsPerPage = mosyGetLSData('systemDataLimit', '11')

  try {
    const response = await mosyGetData({
      endpoint: apiRoutes.pagemanifest.base,
      params: { 
        ... qstr, 
        pageNo : pageNo,
        pageSize : recordsPerPage,
        orderType : 'desc', 
        src : btoa(`getPageManifestListData`)
        },
    });

    if (response.status === 'success') {
      //console.log('pagemanifest Data:', response.data);
      return response; //Return the data
    } else {
      console.log('Error fetching pagemanifest data:', response);
      MosyNotify({message:response.message, icon:'times-circle', iconColor :'text-danger'})
      
      return []; // Safe fallback
    }
  } catch (err) {

   MosyNotify({message:err, icon:'times-circle', iconColor :'text-danger'})

    console.log('Error:', err);
    return []; //  Even safer fallback
  }
}


export async function loadPageManifestListData(customQueryStr, setters) {

    const gftPageManifest = MosySecureFilterEngine('page_manifest_');
    let finalFilterStr = (gftPageManifest);    

    if(customQueryStr!='')
    {
      finalFilterStr = customQueryStr;
    }

    setters.setPageManifestLoading(true);
    
    const pageManifestListData = await getPageManifestListData(finalFilterStr);
    
    setters.setPageManifestLoading(false)
    setters.setPageManifestListData(pageManifestListData?.data)

    setters.setPageManifestListPageCount(pageManifestListData?.pagination?.page_count)


    return pageManifestListData

}
  
  
export async function pageManifestProfileData(customQueryStr, setters, router, customProfileData={}) {

    const pageManifestTokenId = mosyUrlParam('page_manifest__dataNode');
    
    const deleteParam = mosyUrlParam('page_manifest__delete');

    //manage  the staff_uptoken value  basically detect primkey
    let decodedPageManifestToken = '0';
    if (pageManifestTokenId) {
      
      decodedPageManifestToken = atob(pageManifestTokenId); // Decode the record_id
      setters.setPageManifestUptoken(pageManifestTokenId);
      setters.setPageManifestActionStatus('update_page_manifest_');
      
    }
    
    //override customQueryStr if there is an active staff_uptoken else use customQueryStr if any
    let rawPageManifestQueryStr ={Node:btoa(decodedPageManifestToken)}
    if(customQueryStr!='')
    {
      // if no page_manifest__dataNode set , use customQueryStr
      if (!pageManifestTokenId) {
       rawPageManifestQueryStr = customQueryStr
      }
    }

    const profileDataRecord = await initPageManifestProfileData(rawPageManifestQueryStr)

    if(deleteParam){
      popDeleteDialog(pageManifestTokenId, setters, router)
    }
    
    // Merge with custom injected values (custom wins)
    const finalProfileData = {
      ...profileDataRecord,
      ...customProfileData,    
    };
      

    setters.setPageManifestNode(finalProfileData)
    
    
}
  
  

export function IntepratePageManifestEvent(data) {
     
  //console.log(' PageManifest Child gave us:', data);

  const actionName = data?.actionName

  const childActionName = { [actionName]: true };

  if(childActionName.select_page_manifest_){

    if(data?.profile)
    {
    
    //const childStateSetters = data?.setters.childSetters

    const parentSetter = data?.setters.parentStateSetters 

    parentSetter?.setLocalEventSignature(magicRandomStr())
    parentSetter?.setParentUseEffectKey(magicRandomStr())
    parentSetter?.setActiveScrollId('PageManifestProfileTray')

    
    mosyUpdateUrlParam('page_manifest__dataNode', btoa(data?.token))
    
    const router = data?.router
      
    const url = data?.url

    router.push(url, { scroll: false });

    }else{

    //const childStateSetters = data?.setters.childSetters

    const parentSetter = data?.setters.parentStateSetters 

    parentSetter?.setPageManifestCustomProfileQuery(data?.qstr)

    parentSetter?.setLocalEventSignature(magicRandomStr())
    parentSetter?.setParentUseEffectKey(magicRandomStr())
    parentSetter?.setActiveScrollId('PageManifestProfileTray')

    
    mosyUpdateUrlParam('page_manifest__dataNode', btoa(data?.token))
    
    }
  }

  if(childActionName.add_page_manifest_){

    const stateSetter =data?.setters.childStateSetters
    const parentStateSetter =data?.setters.parentStateSetters

    //console.log(`add page_manifest_ `, data?.setters)

    if(stateSetter.setLocalEventSignature){
     stateSetter?.setLocalEventSignature(magicRandomStr())
    }

    if(parentStateSetter){
      if(parentStateSetter.setLocalEventSignature){
        parentStateSetter?.setLocalEventSignature(magicRandomStr())
        parentStateSetter?.setActiveScrollId('PageManifestProfileTray')
      }
    }
     
  }

  if(childActionName.update_page_manifest_){
    const stateSetter =data?.setters.childStateSetters
    const parentStateSetter =data?.setters.parentStateSetters

    //console.log(`update page_manifest_ `, data?.setters)

    if(stateSetter.setLocalEventSignature){
     stateSetter?.setLocalEventSignature(magicRandomStr())
    }

    if(parentStateSetter){
      if(parentStateSetter.setLocalEventSignature){
        parentStateSetter?.setLocalEventSignature(magicRandomStr())
        parentStateSetter?.setActiveScrollId('PageManifestProfileTray')
        
      }
    }
  }

  if(childActionName.delete_page_manifest_){

    popDeleteDialog(btoa(data?.token), data?.setters)

 }

  
}


export function popDeleteDialog(deleteToken, setters, router, afterDeleteUrl='../pagemanifest/list')
{     

  //console.log(`popDeleteDialog`, setters)
  const childSetters = setters?.childStateSetters
  
  MosyAlertCard({
  
    icon : "trash",
  
    message: "Are you sure you want to delete this record?",

    autoDismissOnClick : false,
  
    onYes: () => {
  
      DeletePageManifest(deleteToken).then(response=>{
  
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
       deleteUrlParam('page_manifest__delete');
        
    }
  
  });

}