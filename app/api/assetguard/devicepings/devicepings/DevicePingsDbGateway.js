
import { mosySqlDelete  , mosySqlInsert , mosySqlUpdate } from "../../../apiUtils/dataControl/dataUtils";

//insert device_pings 
export async function AddDevicePings(newId, mutatedDataArray, body, authData)
{

  const result = await mosySqlInsert("device_pings", mutatedDataArray, body);
   
  return result;
}


//update device_pings 
export async function UpdateDevicePings(newId, mutatedDataArray, body, authData, whereStr)
{

  const result = await mosySqlUpdate("device_pings", mutatedDataArray, body, whereStr);
  
  return result;
}


//delete device_pings 
export async function DeleteDevicePings(tokenId, whereStr)
{  
  const result = await mosySqlDelete("device_pings", whereStr);

  return result;
}

