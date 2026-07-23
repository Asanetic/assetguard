/**
 * Final FILE: active-users.jsx
 * Auto Generated Frontend Functions
 */

import { MosyCard , closeMosyCard} from '../../../components/MosyCard';
import { MosySmartColumnFilter } from "../../UiControl/smartFilterUiControl";

/**
 * FILE: active-users.jsx
 * AUTO GENERATED FRONTEND FUNCTION
 */

// ════════════════════════════════════════════════════════════════
// FUNCTION: filterActiveUsers
// ════════════════════════════════════════════════════════════════
export function filterActiveUsers({customQueryStr, stateItemSetters, colName, colVal, tableName}) 
{
    //alert("filterActiveUsers");

    MosySmartColumnFilter({customQueryStr:customQueryStr, stateItemSetters:stateItemSetters, colName:colName, colVal:colVal, tableName:tableName});

}
