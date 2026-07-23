
import { mosySqlDelete  , mosySqlInsert , mosySqlUpdate } from "../../../apiUtils/dataControl/dataUtils";

//insert system_users 
export async function AddMyaccount(newId, mutatedDataArray, body, authData)
{

  const result = await mosySqlInsert("system_users", mutatedDataArray, body,"txt_");
   
  return result;
}


//update system_users 
export async function UpdateMyaccount(newId, mutatedDataArray, body, authData, whereStr)
{

  const result = await mosySqlUpdate("system_users", mutatedDataArray, body, whereStr,"txt_");
  
  return result;
}


//delete system_users 
export async function DeleteMyaccount(tokenId, whereStr)
{  
  const result = await mosySqlDelete("system_users", whereStr);

  return result;
}

