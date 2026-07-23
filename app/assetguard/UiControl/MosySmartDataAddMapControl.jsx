/**
 * Final FILE: create-deal.jsx
 * Auto Generated Frontend Functions
 */

import { MosyCard } from "../../components/MosyCard";



// ════════════════-════════════════════════════════════════════════
// FUNCTION: createDeal
// ════════════════════════════════════════════════════════════════
export function MosySmartDataMap({
    title,component:Component,stateitemsetters,parentTable,destTable,fieldsetstr, profileDataNode, dataInterpreter})   
{
 
   const profData = mosyGenerateCustomProfileData({
    parentData: profileDataNode,
    destTableTitle: title,
    destTable: destTable,
    mapString: fieldsetstr
})

console.log("profData",profData, profileDataNode)

   MosyCard("",<div className='col-md-12'>
    <Component
    dataIn={{ 
        showNavigationIsle:false,
        parentUseEffectKey: "MosySmartDataMap",
        customProfileData: profData
    }}
    dataOut={{setChildDataOut: dataInterpreter}} /></div>,true,"modal4","mosycard_wide");

}

export function mosyGenerateCustomProfileData({
    parentData = {},
    destTableTitle = "",
    destTable = "",
    mapString = ""
}) {

    let customProfileData = {};

    const mappings = mapString.split(",");

    mappings.forEach((item) => {

        // crm_companies:company_name|company_id:company_id
        const [
            sourceTable,
            sourceConfig,
            destColId
        ] = item.split(":");

        if(!sourceTable || !sourceConfig || !destColId) return;

        // company_name|company_id
        const [
            displayCol,
            sourceIdCol
        ] = sourceConfig.split("|");

        if(!displayCol || !sourceIdCol) return;

        // _crm_companies_company_name_company_id
        const sourceDataKey =
        `_${sourceTable}_${displayCol}_${sourceIdCol}`;

        // inject display value
        customProfileData[
            `_${sourceTable}_${displayCol}_${destColId}`
        ] =
        parentData[sourceDataKey] || "";

        // inject id value
        customProfileData[destColId] =
        parentData[sourceIdCol] || "";

    });

    // dynamic title key
    // crm_deals -> CrmDealsTitle

    const dynamicTitleKey =
    destTable
    .split("_")
    .map(word =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join("") + "Title";

    // interpolate {{contact_name}}
    let parsedTitle = destTableTitle;

    parsedTitle = parsedTitle.replace(
        /\{\{(.*?)\}\}/g,
        (match, fieldName) => {

            const cleanField =
            fieldName.trim();

            return parentData?.[cleanField] || "";

        }
    );

    // inject title
    customProfileData[dynamicTitleKey] =
    parsedTitle || "";

    return customProfileData;

}