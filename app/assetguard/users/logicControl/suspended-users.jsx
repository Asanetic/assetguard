/**
 * Final FILE: suspended-users.jsx
 * Auto Generated Frontend Functions
 */

import { MosyCard , closeMosyCard} from '../../../components/MosyCard';
import { MosySmartColumnFilter } from "../../UiControl/smartFilterUiControl";

/**
 * FILE: suspended-users.jsx
 * AUTO GENERATED FRONTEND FUNCTION
 */

// ════════════════════════════════════════════════════════════════
// FUNCTION: filterSuspendedUsers
// ════════════════════════════════════════════════════════════════
export function filterSuspendedUsers({customQueryStr, stateItemSetters, colName, colVal, tableName}) 
{
    //alert("filterSuspendedUsers");

    MosySmartColumnFilter({customQueryStr:customQueryStr, stateItemSetters:stateItemSetters, colName:colName, colVal:colVal, tableName:tableName});

}
