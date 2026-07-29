import { base64Decode , base64Encode} from "../apiUtils/dataControl/dataUtils"

export function validateSelect(tblName, qParams) {

    let requestIsValid = true 

    return requestIsValid  

}

export function mosyDsfFilter(src, authData) {
    const filters = {
      global_filter: `hive_site_id='${authData?.hive_site_id}'`,
      // Add more table-specific filters here if needed
    };

    const mutatedFilterQuery = `${(filters[src] || filters.global_filter)}`
  
    // Return table-specific filter if it exists, else fall back to global filter
    return mutatedFilterQuery;

  }

  
export function mosyMutateQuery(tblName, searchParams, authData, tablePrimKey)
{

    const filterFull = searchParams.get("fullQ")
    const afterwhereStr = base64Decode(searchParams.get("aw"))
    const whereStr = base64Decode(searchParams.get("q"))
    const qsrc = base64Decode(searchParams.get("src"))

    let mutatedFilterStr =mosyDsfFilter(tblName, authData)

    let additionalQ= ""

    let gftFilterType = " WHERE "
    if(filterFull==="true"){
        gftFilterType = ` AND `
    }

    if(mutatedFilterStr=="")
    {
        gftFilterType=""
    }

    let finalAfterwhereStr = afterwhereStr

    if(afterwhereStr==="")
    {
      finalAfterwhereStr = `order by ${tablePrimKey} desc`
    }

    //load quotations
    if(qsrc=="getInactiveusersListData")
    {
      if(afterwhereStr=="")
      {
 
        additionalQ=" Where account_status !='active' "

      }else{
        additionalQ =" and  account_status !='active'"
      } 
        
    }

    if(qsrc=="getActiveappusersListData")
      {
        if(afterwhereStr=="")
        {
   
          additionalQ=" Where account_status ='active' "
  
        }else{
          additionalQ =" and  account_status ='active'"
        } 
          
      }    

    //load invoices
    if(qsrc=="subscriptions - qdataInput")
    {
        if(afterwhereStr=="")
        {
   
          additionalQ=" group by status"
  
        }else{
          additionalQ=" group by status"
        } 
          
    }
      
    if(qsrc=="invoice_payments - txt_invoice_id")
    {
      additionalQ =" and  invoice_type='Invoice'"
    }

    
    const combinedParam = base64Encode(`${whereStr}${gftFilterType} ${mutatedFilterStr}  ${additionalQ} ${finalAfterwhereStr}`)

   // console.log(`combinedParam ${base64Decode(combinedParam)} ${filterFull}`)

    return combinedParam

}

export function mutateInputArray(src, inputArray, postRequest, newrecordId, authData) {
    const mutated = { ...inputArray };

    
    // Replace or inject values based on rules
    if (authData.hive_site_id) {
      mutated.hive_site_id = authData.hive_site_id;
    }
  
    if (authData.hive_site_name) {
      mutated.hive_site_name = authData.hive_site_name;
    }

    if(src=="system_modules")
    {
      mutated.module_key = (postRequest.module_name)?.toLowerCase().replace(/[^a-zA-Z0-9]/g, "_")  || "Ke"
    }

    console.log(`mutateInputArraymutateInputArray`, mutated , newrecordId, postRequest.body)
    return mutated;
  }
  