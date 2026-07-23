'use client';
//hive / data utils
import { mosyPostFormData, mosyGetData, mosyUrlParam, mosyUpdateUrlParam , deleteUrlParam, magicRandomStr, mosyGetLSData  } from '../../../MosyUtils/hiveUtils';

//action modals 
import { MosyNotify , closeMosyModal, MosyAlertCard } from '../../../MosyUtils/ActionModals';

//filter util
import { MosyFilterEngine } from '../../DataControl/MosyFilterEngine';

import saAuthConfigs from '../../../auth/featureConfig/saAuthConfigs'; 


//insert data
export async function insertSubscriptionpayments() {
 //console.log(`Form billing_transactions insert sent `)

  return await mosyPostFormData({
    formId: 'billing_transactions_profile_form',
    url: '/api/emberbill/payments/subscriptionpayments',
    method: 'POST',
    isMultipart: true,
  });
}

//update record 
export async function updateSubscriptionpayments() {

  //console.log(`Form billing_transactions update sent `)

  return await mosyPostFormData({
    formId: 'billing_transactions_profile_form',
    url: '/api/emberbill/payments/subscriptionpayments',
    method: 'POST',
    isMultipart: true,
  });
}


///receive form actions from profile page  
export async function inteprateSubscriptionpaymentsFormAction(e, setters) {
  e.preventDefault();

  const form = e.target;
  const formDataObj = new FormData(form);
  const actionType = formDataObj.get('billing_transactions_mosy_action');
 
 //console.log(`Form billing_transactions submission received action : ${actionType}`)

  try {
    let result = null;
    let actionMessage ='Record added succesfully!';

    if (actionType === 'add_billing_transactions') {

      actionMessage ='Record added succesfully!';

      result = await insertSubscriptionpayments();
    }

    if (actionType === 'update_billing_transactions') {

      actionMessage ='Record updated succesfully!';

      result = await updateSubscriptionpayments();
    }

    if (result?.status === 'success') {
      
      const billing_transactionsUptoken = btoa(result.billing_transactions_uptoken || '');

      //set id key
      setters.setSubscriptionpaymentsUptoken(billing_transactionsUptoken);
      
      //update url with new billing_transactionsUptoken
      mosyUpdateUrlParam('billing_transactions_uptoken', billing_transactionsUptoken)

      setters.setSubscriptionpaymentsActionStatus('update_billing_transactions')
    
      setters.setSnackMessage(actionMessage);

      return {
        status: 'success',
        message: actionMessage,
        newToken: billing_transactionsUptoken,
        actionName : actionType,
        actionType : 'billing_transactions_form_submission'
      };
            
      
    } else {
      MosyNotify({message:"A small error occured. Kindly try again", iconColor :'text-danger'})
      
      return {
        status: 'error',
        message: result,
        actionName: actionType,
        newToken: null
      };
      
    }

  } catch (error) {
    console.error('Form error:', error);
    
    MosyNotify({message:`A small error occured.  ${error}`, iconColor :'text-danger'})
    
      return {
        status: 'error',
        message: result,
        actionName: actionType,
        newToken: null
      };
      
  } 
}


export async function initSubscriptionpaymentsProfileData(rawQstr) {

  //add the following data in response
  const rawMutations = {
               
    _app_list_app_name_app_id : [],

  }
  

  MosyNotify({message : 'Refreshing Subscription payments' , icon:'refresh', addTimer:false})

  const encodedMutations = btoa(JSON.stringify(rawMutations));

  try {
    // Fetch the  data with the given key
    const response = await mosyGetData({
      endpoint: '/api/emberbill/payments/subscriptionpayments',
      params: { 
      q: btoa(rawQstr),         
      mutations: encodedMutations,
      fullQ : true,
      aw : btoa(``),
      src : btoa(`initSubscriptionpaymentsProfileData`)
      },
    });

    // Handle the successful response
    if (response.status === 'success') {
      //console.log('payments Data:', response.data);  // Process the data

       closeMosyModal()

      return response.data?.[0] || {};  // Return the actual record

    } else {
          
      console.log('Error fetching payments data:', response.message);  // Handle error

      closeMosyModal()

      return {}
    }
  } catch (err) {

    closeMosyModal()

    console.log('Error:', err);
    return {}
  }
}


export async function DeleteSubscriptionpayments(token = '') {

    try {
      MosyNotify({message:"Sending delete request",icon:"send", addTimer : false})
    
      const response = await mosyGetData({
        endpoint: '/api/emberbill/payments/delete',
        params: { 
          _billing_transactions_delete_record: (token), 
          },
      });

      console.log('Token DeleteSubscriptionpayments '+token)
      if (response.status === 'success') {

        closeMosyModal();

        return response.data; // ✅ Return the data
      } else {
        console.error('Error deleting systemusers data:', response.message);
        closeMosyModal();
        
        return []; // Safe fallback
      }
    } catch (err) {
      console.error('Error:', err);
      closeMosyModal();
      
      return []; //  Even safer fallback
    }

}


export async function getSubscriptionpaymentsListData(qstr = "") {
   let fullWhere = true
   
    const sessionPrefix = saAuthConfigs.sessionPrefix;
    const userId = mosyGetLSData(`${sessionPrefix}_sa_authsess_user_id_val`)

    if(qstr=='')
    {
    fullWhere = true  
    qstr=btoa(`where BillRefNumber ='${userId}' `)
    }
  
  //add the following data in response
  const rawMutations = {
               
    _app_list_app_name_app_id : [],

  }
  
  const encodedMutations = btoa(JSON.stringify(rawMutations));

  //manage pagination 
  const pageNo = mosyUrlParam('qbilling_transactions_page','0')
  const recordsPerPage = mosyGetLSData('systemDataLimit', '11')

  try {
    const response = await mosyGetData({
      endpoint: 'https:eb.asanetic.com/api/emberbill/payments/history',
      params: { 
        q: qstr, 
        mutations: encodedMutations,
        fullQ : fullWhere,
        pagination : `l:qbilling_transactions_page:${recordsPerPage}:${pageNo}`,
        aw : btoa(`order by primkey desc`),
        src : btoa(`getSubscriptionpaymentsListData`)
        },
    });

    if (response.status === 'success') {
      //console.log('payments Data:', response.data);
      return response; // ✅ Return the data
    } else {
      console.log('Error fetching payments data:', response);
      return []; // Safe fallback
    }
  } catch (err) {
    console.log('Error:', err);
    return []; //  Even safer fallback
  }
}


export async function loadSubscriptionpaymentsListData(customQueryStr, setters) {

    const gftSubscriptionpayments = MosyFilterEngine('billing_transactions', true);
    let finalFilterStr = btoa(gftSubscriptionpayments);    

    if(customQueryStr!='')
    {
      finalFilterStr = customQueryStr;
    }

    setters.setSubscriptionpaymentsLoading(true);
    
    const subscriptionpaymentsListData = await getSubscriptionpaymentsListData(finalFilterStr);
    
    setters.setSubscriptionpaymentsLoading(false)
    setters.setSubscriptionpaymentsListData(subscriptionpaymentsListData?.data)

    setters.setSubscriptionpaymentsListPageCount(subscriptionpaymentsListData?.page_count)


    return subscriptionpaymentsListData

}
  
  
export async function subscriptionpaymentsProfileData(customQueryStr, setters, router, customProfileData={}) {

    const subscriptionpaymentsTokenId = mosyUrlParam('billing_transactions_uptoken');
    
    const deleteParam = mosyUrlParam('billing_transactions_delete');

    //manage  the staff_uptoken value  basically detect primkey
    let decodedSubscriptionpaymentsToken = '0';
    if (subscriptionpaymentsTokenId) {
      
      decodedSubscriptionpaymentsToken = atob(subscriptionpaymentsTokenId); // Decode the record_id
      setters.setSubscriptionpaymentsUptoken(subscriptionpaymentsTokenId);
      setters.setSubscriptionpaymentsActionStatus('update_billing_transactions');
      
    }
    
    //override customQueryStr if there is an active staff_uptoken else use customQueryStr if any
    let rawSubscriptionpaymentsQueryStr =`where primkey ='${decodedSubscriptionpaymentsToken}'`
    if(customQueryStr!='')
    {
      // if no billing_transactions_uptoken set , use customQueryStr
      if (!subscriptionpaymentsTokenId) {
       rawSubscriptionpaymentsQueryStr = customQueryStr
      }
    }

    const profileDataRecord = await initSubscriptionpaymentsProfileData(rawSubscriptionpaymentsQueryStr)

    if(deleteParam){
      popDeleteDialog(subscriptionpaymentsTokenId, setters, router)
    }
    
    // Merge with custom injected values (custom wins)
    const finalProfileData = {
      ...profileDataRecord,
      ...customProfileData,    
    };
      

    setters.setSubscriptionpaymentsNode(finalProfileData)
    
    
}
  
  

export function InteprateSubscriptionpaymentsEvent(data) {
     
  //console.log('🎯 Subscriptionpayments Child gave us:', data);

  const actionName = data?.actionName

  const childActionName = { [actionName]: true };

  if(childActionName.select_billing_transactions){

    if(data?.profile)
    {
      const router = data?.router
      
      const url = data?.url

      router.push(url, { scroll: false });

    }else{

    //const childStateSetters = data?.setters.childSetters

    const parentSetter = data?.setters.parentStateSetters 

    parentSetter?.setSubscriptionpaymentsCustomProfileQuery(data?.qstr)

    parentSetter?.setLocalEventSignature(magicRandomStr())
    parentSetter?.setParentUseEffectKey(magicRandomStr())
    
    mosyUpdateUrlParam('billing_transactions_uptoken', btoa(data?.token))
    
    }
  }

  if(childActionName.add_billing_transactions){

    const stateSetter =data?.setters.childStateSetters
    const parentStateSetter =data?.setters.parentStateSetters

    //console.log(`add billing_transactions `, data?.setters)

    if(stateSetter.setLocalEventSignature){
     stateSetter?.setLocalEventSignature(magicRandomStr())
    }

    if(parentStateSetter){
      if(parentStateSetter.setLocalEventSignature){
        parentStateSetter?.setLocalEventSignature(magicRandomStr())
      }
    }
     
  }

  if(childActionName.update_billing_transactions){
    const stateSetter =data?.setters.childStateSetters
    const parentStateSetter =data?.setters.parentStateSetters

    //console.log(`update billing_transactions `, data?.setters)

    if(stateSetter.setLocalEventSignature){
     stateSetter?.setLocalEventSignature(magicRandomStr())
    }

    if(parentStateSetter){
      if(parentStateSetter.setLocalEventSignature){
        parentStateSetter?.setLocalEventSignature(magicRandomStr())
      }
    }
  }

  if(childActionName.delete_billing_transactions){

    popDeleteDialog(btoa(data?.token), data?.setters)

 }

  
}


export function popDeleteDialog(deleteToken, setters, router, afterDeleteUrl='../payments/list')
{     

  //console.log(`popDeleteDialog`, setters)
  const childSetters = setters?.childStateSetters
  
  MosyAlertCard({
  
    icon : "trash",
  
    message: "Are you sure you want to delete this record?",

    autoDismissOnClick : false,
  
    onYes: () => {
  
      DeleteSubscriptionpayments(deleteToken).then(data=>{
  
        childSetters?.setSnackMessage("Record deleted succesfully!")
        childSetters?.setParentUseEffectKey(magicRandomStr());
        childSetters?.setLocalEventSignature(magicRandomStr());

        if(router){
          router.push(`${afterDeleteUrl}?snack_alert=Record Deleted successfully!`)
        }
                  
      })
  
    },
  
    onNo: () => {
  
      // Remove the param from the URL
       closeMosyModal()
       deleteUrlParam('billing_transactions_delete');
        
    }
  
  });

}