/**
 * Final FILE: pinned-notes.jsx
 * Auto Generated Frontend Functions
 */

import { MosyCard , closeMosyCard} from '../../components/MosyCard';
import { mosyGetData, mosyGetLSData, mosyUrlParam } from '../../MosyUtils/hiveUtils';
import { getApiRoutes } from '../AppRoutes/apiRoutesHandler';
import { MosySecureFilterEngine } from '../DataControl/MosyFilterEngine';
import { filterDataByDate, MosyDateRangeFilter } from './componentControl';
import { MosyLiveSearch } from './customUI';

const apiRoutes = getApiRoutes();

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

// name_of_the_table => NameOfTheTable
export function mosyTableToCamelCase(tableName = '') {

    console.log("mosyTableToCamelCase", tableName);
    return tableName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
    
}



export function mosySnakeToCamelCase(text = '') {

    console.log("mosySnakeToCamelCase", text);

    return text.replace(/_([a-z])/g, function(match, letter) {
        return letter.toUpperCase();
    });

}
// crm_notes => crmnotes
export function mosyTableToRouteKey(tableName = '') {

    return tableName.replaceAll('_', '');

}

// ════════════════════════════════════════════════════════════════
// FUNCTION: smartDateFilter
// ════════════════════════════════════════════════════════════════

export function MosySmartDateFilter({title, customQueryStr, stateItemSetters, tableName, columnName, inputType="datetime-local"}) {
    //alert('smartDateFilter');

    filterDataByDate({inputType: inputType, label:`${title}`,
        callBack:({startDate, endDate})=>{
            
            console.log("smartDateFilter",startDate, endDate);
        
            const smartColFilter = {
                [`${columnName}_start`]: btoa(startDate),
                [`${columnName}_end`]: btoa(endDate),    
            }
        
            const customFilter = {
                
                ...customQueryStr,
                ...smartColFilter,
                ...MosySecureFilterEngine(tableName),
                
            }
              
            loadCustomListData(customFilter, stateItemSetters, tableName);

            closeMosyCard();
        
        }
    })
}

export function MosySmartMapFilter({title, customQueryStr, stateItemSetters, parentColName, childColName, displayField, parentTableName, childTableName}) {
    //alert('smartMapFilter');

    const routeKey = mosyTableToRouteKey(parentTableName);
    const childColCamelCase = mosySnakeToCamelCase(childColName);

    MosyLiveSearch({
        api: apiRoutes[routeKey].base,
        title,
        tableName: parentTableName,
        displayField,
        valueField: parentColName,
        actionName: "smartMapFilter",
        onSelectFull: (dataRes) => {
            console.log("smartMapFilter", `${dataRes[parentColName]}`, parentTableName, childTableName, parentColName, childColName);
        
            const smartColFilter = {
              [childColCamelCase]: btoa(dataRes[parentColName]),
            }
        
            const customFilter = {
                
                ...customQueryStr,
                ...smartColFilter,
                ...MosySecureFilterEngine(childTableName),
                
            }
              
            loadCustomListData(customFilter, stateItemSetters, childTableName);  
            
            closeMosyCard();
        }
    })

}

export function MosySmartTagColumnFilter({title, customQueryStr, stateItemSetters,parentColName, parentTableName})
{
    //alert('smartTagColumnFilter');
    const routeKey = mosyTableToRouteKey(parentTableName);
    const parentColCamelCase = mosySnakeToCamelCase(parentColName);

    MosyLiveSearch({
        api: apiRoutes[routeKey].base,
        title,
        tableName: parentTableName,
        displayField: parentColName,
        valueField: parentColName,
        actionName: "customTagFilter",
        actionData: {
            mosyFilterOptions: {
                groupBy: btoa(parentColCamelCase)
            }
        },
        onSelectFull: (dataRes) => {
            console.log("smartTagColumnFilter", dataRes);
        
            const smartColFilter = {
              [parentColCamelCase]: btoa(dataRes[parentColName]),
            }
        
            const customFilter = {
                
                ...customQueryStr,
                ...smartColFilter,
                ...MosySecureFilterEngine(parentTableName),
                
            }
             //2150/= 
            loadCustomListData(customFilter, stateItemSetters, parentTableName);  
            
            closeMosyCard();
        }
    })

}

export function MosySmartColumnFilter({customQueryStr, stateItemSetters, colName, colVal, tableName})
{
    //alert('smartColumnFilter');

    console.log("MosySmartColumnFilter", customQueryStr, stateItemSetters, colName, colVal, tableName);
    const smartColFilter = {
        [colName]: btoa(colVal),    
    }

    const customFilter = {
        
        ...customQueryStr,
        ...smartColFilter,
        ...MosySecureFilterEngine(tableName),
        
    }
      
    loadCustomListData(customFilter, stateItemSetters, tableName);

}

export async function loadCustomListData(customQueryStr, setters, tableName) {

    
    const tableCamelCase = mosyTableToCamelCase(tableName);

    const gftCustomFilter = MosySecureFilterEngine(tableName);

    let finalFilterStr = gftCustomFilter;    

    if(customQueryStr != '')
    {
        finalFilterStr = customQueryStr;
    }
    console.log("loadCustomListData", customQueryStr, tableName, tableCamelCase, setters);

    setters[`set${tableCamelCase}Loading`](true);
    
    const listData = await getListData(finalFilterStr, tableName);
    
    setters[`set${tableCamelCase}Loading`](false);

    setters[`set${tableCamelCase}ListData`](listData?.data);

    setters[`set${tableCamelCase}ListPageCount`](
        listData?.pagination?.page_count
    );

    return listData;

}

export async function getListData(qstr = {}, tableName) {

    const tableCamelCase = mosyTableToCamelCase(tableName);
    const routeKey = mosyTableToRouteKey(tableName);

    // manage pagination 
    const pageNo = mosyUrlParam(`q${tableName}_page`, '0');

    const recordsPerPage = mosyGetLSData('systemDataLimit', '11');

    try {

        const response = await mosyGetData({

            endpoint: apiRoutes[routeKey].base,

            params: { 

                ...qstr,

                pageNo : pageNo,

                pageSize : recordsPerPage,

                orderType : 'desc',

                src : btoa(`get${tableCamelCase}ListData`)
            },

        });

        if (response.status === 'success') {

            //console.log(`${tableCamelCase} Data:`, response.data);

            return response;

        } else {

            console.log(`Error fetching ${tableCamelCase} data:`, response);

            MosyNotify({
                message:response.message,
                icon:'times-circle',
                iconColor :'text-danger'
            });
      
            return [];

        }

    } catch (err) {

        MosyNotify({
            message:err,
            icon:'times-circle',
            iconColor :'text-danger'
        });

        console.log('Error:', err);

        return [];

    }
}
