/**
 * Final FILE: pending-tasks.jsx
 * Auto Generated Frontend Functions
 */

import { MosyCard , closeMosyCard} from '../../../components/MosyCard';
import { MosySmartColumnFilter } from "../../UiControl/smartFilterUiControl";

/**
 * FILE: pending-tasks.jsx
 * AUTO GENERATED FRONTEND FUNCTION
 */

// ════════════════════════════════════════════════════════════════
// FUNCTION: filterPendingTasks
// ════════════════════════════════════════════════════════════════
export function filterPendingTasks({customQueryStr, stateItemSetters, colName, colVal, tableName}) 
{
    //alert("filterPendingTasks");

    MosySmartColumnFilter({customQueryStr:customQueryStr, stateItemSetters:stateItemSetters, colName:colName, colVal:colVal, tableName:tableName});

}
