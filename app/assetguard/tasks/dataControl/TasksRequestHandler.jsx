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
export async function insertTasks() {
 //console.log(`Form tasks insert sent `)

  return await mosyPostFormData({
    formId: 'tasks_profile_form',
    url: apiRoutes.tasks.base,
    method: 'POST',
    isMultipart: true,
  });
}

//update record 
export async function updateTasks() {

  //console.log(`Form tasks update sent `)

  return await mosyPostFormData({
    formId: 'tasks_profile_form',
    url: apiRoutes.tasks.base,
    method: 'PUT',
    isMultipart: true,
  });
}


///receive form actions from profile page  
export async function inteprateTasksFormAction(e, setters) {
  e.preventDefault();

  const form = e.target;
  const formDataObj = new FormData(form);
  const actionType = formDataObj.get('tasks_mosy_action');
 
 //console.log(`Form tasks submission received action : ${actionType}`)

  try {
    let result = null;
    let actionMessage ='Record added succesfully!';

    if (actionType === 'add_tasks') {

      actionMessage ='Record added succesfully!';

      result = await insertTasks();
    }

    if (actionType === 'update_tasks') {

      actionMessage ='Record updated succesfully!';

      result = await updateTasks();
    }

    if (result?.status === 'success') {
      
      const tasksUptoken = btoa(result.tasks_dataNode || '');

      //set id key
      setters.setTasksUptoken(tasksUptoken);
      
      //update url with new tasksUptoken
      mosyUpdateUrlParam('tasks_dataNode', tasksUptoken)

      setters.setTasksActionStatus('update_tasks')
    
      setters.setSnackMessage(actionMessage);

      return {
        status: 'success',
        message: actionMessage,
        newToken: tasksUptoken,
        actionName : actionType,
        actionType : 'tasks_form_submission'
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


export async function initTasksProfileData(rawQstr) { 

  MosyNotify({message : 'Refreshing Tasks' , icon:'refresh', addTimer:false})

  try {
    // Fetch the  data with the given key
    const response = await mosyGetData({
      endpoint: apiRoutes.tasks.base,
      params: { 
      ...rawQstr,
      src : btoa(`initTasksProfileData`)
      },
    });

    // Handle the successful response
    if (response.status === 'success') {
      //console.log('tasks Data:', response.data);  // Process the data

       closeMosyModal()

      return response.data?.[0] || {};  // Return the actual record

    } else {
          
      console.log('Error fetching tasks data:', response.message);  // Handle error
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


export async function DeleteTasks(token = '') {

    try {
      MosyNotify({message:"Sending delete request",icon:"send", addTimer : false})
    
      const response = await mosyGetData({
        endpoint: apiRoutes.tasks.delete,
        params: { 
          _tasks_delete_record: (token), 
          },
      });

      console.log('Token DeleteTasks '+token)
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


export async function getTasksListData(qstr = {}) {

  //manage pagination 
  const pageNo = mosyUrlParam('qtasks_page','0')
  const recordsPerPage = mosyGetLSData('systemDataLimit', '11')

  try {
    const response = await mosyGetData({
      endpoint: apiRoutes.tasks.base,
      params: { 
        ... qstr, 
        pageNo : pageNo,
        pageSize : recordsPerPage,
        orderType : 'desc', 
        src : btoa(`getTasksListData`)
        },
    });

    if (response.status === 'success') {
      //console.log('tasks Data:', response.data);
      return response; //Return the data
    } else {
      console.log('Error fetching tasks data:', response);
      MosyNotify({message:response.message, icon:'times-circle', iconColor :'text-danger'})
      
      return []; // Safe fallback
    }
  } catch (err) {

   MosyNotify({message:err, icon:'times-circle', iconColor :'text-danger'})

    console.log('Error:', err);
    return []; //  Even safer fallback
  }
}


export async function loadTasksListData(customQueryStr, setters) {

    const gftTasks = MosySecureFilterEngine('tasks');
    let finalFilterStr = (gftTasks);    

    if(customQueryStr!='')
    {
      finalFilterStr = customQueryStr;
    }

    setters.setTasksLoading(true);
    
    const tasksListData = await getTasksListData(finalFilterStr);
    
    setters.setTasksLoading(false)
    setters.setTasksListData(tasksListData?.data)

    setters.setTasksListPageCount(tasksListData?.pagination?.page_count)


    return tasksListData

}
  
  
export async function tasksProfileData(customQueryStr, setters, router, customProfileData={}) {

    const tasksTokenId = mosyUrlParam('tasks_dataNode');
    
    const deleteParam = mosyUrlParam('tasks_delete');

    //manage  the staff_uptoken value  basically detect primkey
    let decodedTasksToken = '0';
    if (tasksTokenId) {
      
      decodedTasksToken = atob(tasksTokenId); // Decode the record_id
      setters.setTasksUptoken(tasksTokenId);
      setters.setTasksActionStatus('update_tasks');
      
    }
    
    //override customQueryStr if there is an active staff_uptoken else use customQueryStr if any
    let rawTasksQueryStr ={Node:btoa(decodedTasksToken)}
    if(customQueryStr!='')
    {
      // if no tasks_dataNode set , use customQueryStr
      if (!tasksTokenId) {
       rawTasksQueryStr = customQueryStr
      }
    }

    const profileDataRecord = await initTasksProfileData(rawTasksQueryStr)

    if(deleteParam){
      popDeleteDialog(tasksTokenId, setters, router)
    }
    
    // Merge with custom injected values (custom wins)
    const finalProfileData = {
      ...profileDataRecord,
      ...customProfileData,    
    };
      

    setters.setTasksNode(finalProfileData)
    
    
}
  
  

export function InteprateTasksEvent(data) {
     
  //console.log(' Tasks Child gave us:', data);

  const actionName = data?.actionName

  const childActionName = { [actionName]: true };

  if(childActionName.select_tasks){

    if(data?.profile)
    {
    
    //const childStateSetters = data?.setters.childSetters

    const parentSetter = data?.setters.parentStateSetters 

    parentSetter?.setLocalEventSignature(magicRandomStr())
    parentSetter?.setParentUseEffectKey(magicRandomStr())
    parentSetter?.setActiveScrollId('TasksProfileTray')

    
    mosyUpdateUrlParam('tasks_dataNode', btoa(data?.token))
    
    const router = data?.router
      
    const url = data?.url

    router.push(url, { scroll: false });

    }else{

    //const childStateSetters = data?.setters.childSetters

    const parentSetter = data?.setters.parentStateSetters 

    parentSetter?.setTasksCustomProfileQuery(data?.qstr)

    parentSetter?.setLocalEventSignature(magicRandomStr())
    parentSetter?.setParentUseEffectKey(magicRandomStr())
    parentSetter?.setActiveScrollId('TasksProfileTray')

    
    mosyUpdateUrlParam('tasks_dataNode', btoa(data?.token))
    
    }
  }

  if(childActionName.add_tasks){

    const stateSetter =data?.setters.childStateSetters
    const parentStateSetter =data?.setters.parentStateSetters

    //console.log(`add tasks `, data?.setters)

    if(stateSetter.setLocalEventSignature){
     stateSetter?.setLocalEventSignature(magicRandomStr())
    }

    if(parentStateSetter){
      if(parentStateSetter.setLocalEventSignature){
        parentStateSetter?.setLocalEventSignature(magicRandomStr())
        parentStateSetter?.setActiveScrollId('TasksProfileTray')
      }
    }
     
  }

  if(childActionName.update_tasks){
    const stateSetter =data?.setters.childStateSetters
    const parentStateSetter =data?.setters.parentStateSetters

    //console.log(`update tasks `, data?.setters)

    if(stateSetter.setLocalEventSignature){
     stateSetter?.setLocalEventSignature(magicRandomStr())
    }

    if(parentStateSetter){
      if(parentStateSetter.setLocalEventSignature){
        parentStateSetter?.setLocalEventSignature(magicRandomStr())
        parentStateSetter?.setActiveScrollId('TasksProfileTray')
        
      }
    }
  }

  if(childActionName.delete_tasks){

    popDeleteDialog(btoa(data?.token), data?.setters)

 }

  
}


export function popDeleteDialog(deleteToken, setters, router, afterDeleteUrl='../tasks/list')
{     

  //console.log(`popDeleteDialog`, setters)
  const childSetters = setters?.childStateSetters
  
  MosyAlertCard({
  
    icon : "trash",
  
    message: "Are you sure you want to delete this record?",

    autoDismissOnClick : false,
  
    onYes: () => {
  
      DeleteTasks(deleteToken).then(response=>{
  
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
       deleteUrlParam('tasks_delete');
        
    }
  
  });

}