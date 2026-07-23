
import { mosySqlDelete  , mosySqlInsert , mosySqlUpdate } from "../../../apiUtils/dataControl/dataUtils";

//insert users 
export async function AddUsers(newId, mutatedDataArray, body, authData)
{

  const result = await mosySqlInsert("users", mutatedDataArray, body);
   
  return result;
}


//update users 
export async function UpdateUsers(newId, mutatedDataArray, body, authData, whereStr)
{

  const result = await mosySqlUpdate("users", mutatedDataArray, body, whereStr);
  
  return result;
}


//delete users 
export async function DeleteUsers(tokenId, whereStr)
{  
  const result = await mosySqlDelete("users", whereStr);

  return result;
}

