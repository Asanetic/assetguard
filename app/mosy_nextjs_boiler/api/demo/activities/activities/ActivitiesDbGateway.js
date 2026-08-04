
import { mosySqlDelete  , mosySqlInsert , mosySqlUpdate } from "../../../apiUtils/dataControl/dataUtils";

//insert activities 
export async function AddActivities(newId, mutatedDataArray, body, authData)
{

  const result = await mosySqlInsert("activities", mutatedDataArray, body);
   
  return result;
}


//update activities 
export async function UpdateActivities(newId, mutatedDataArray, body, authData, whereStr)
{

  const result = await mosySqlUpdate("activities", mutatedDataArray, body, whereStr);
  
  return result;
}


//delete activities 
export async function DeleteActivities(tokenId, whereStr)
{  
  const result = await mosySqlDelete("activities", whereStr);

  return result;
}

