
import { mosySqlDelete  , mosySqlInsert , mosySqlUpdate } from "../../../apiUtils/dataControl/dataUtils";

//insert asset_alarms 
export async function AddAssetAlarms(newId, mutatedDataArray, body, authData)
{

  const result = await mosySqlInsert("asset_alarms", mutatedDataArray, body);
   
  return result;
}


//update asset_alarms 
export async function UpdateAssetAlarms(newId, mutatedDataArray, body, authData, whereStr)
{

  const result = await mosySqlUpdate("asset_alarms", mutatedDataArray, body, whereStr);
  
  return result;
}


//delete asset_alarms 
export async function DeleteAssetAlarms(tokenId, whereStr)
{  
  const result = await mosySqlDelete("asset_alarms", whereStr);

  return result;
}

