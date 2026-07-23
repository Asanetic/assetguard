/**
 * Final FILE: completed-tasks.jsx
 * Auto Generated Frontend Functions
 */

import { MosyCard , closeMosyCard} from '../../../components/MosyCard';
import { MosySmartColumnFilter } from "../../UiControl/smartFilterUiControl";

/**
 * FILE: completed-tasks.jsx
 * AUTO GENERATED FRONTEND FUNCTION
 */

// ════════════════════════════════════════════════════════════════
// FUNCTION: filterCompletedTasks
// ════════════════════════════════════════════════════════════════
export function filterCompletedTasks({customQueryStr, stateItemSetters, colName, colVal, tableName}) 
{
    //alert("filterCompletedTasks");

    MosySmartColumnFilter({customQueryStr:customQueryStr, stateItemSetters:stateItemSetters, colName:colName, colVal:colVal, tableName:tableName});

}
