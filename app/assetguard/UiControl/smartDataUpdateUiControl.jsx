/**
 * Final FILE: archive-note.jsx
 * Auto Generated Frontend Functions
 */

import { getApiRoutes } from '../AppRoutes/apiRoutesHandler';
import { MosyCard , closeMosyCard} from '../../components/MosyCard';
import { closeMosyModal, MosyNotify, MosySnackWidget } from '../../MosyUtils/ActionModals';
import { magicRandomStr, mosyGetData, mosyPostData, mosyUrlParam } from '../../MosyUtils/hiveUtils';

import {
    LiveSearchDropdown,
    MosySelectField,
    MosySmartDataField,
    SmartDropdown,
} from './componentControl';
const apiRoutes = getApiRoutes();

/*
|--------------------------------------------------------------------------
| FIELD ENGINE
|--------------------------------------------------------------------------
|
| FORMAT:
|
| field|col|type|source
|
| TYPES:
| sf = MosySmartField
| ls = LiveSearch
|
|--------------------------------------------------------------------------
*/

function routeKeyBuilder(routeKey) {
    return routeKey
        .replaceAll("_", "")
        .replace(/\b\w/g, l => l.toLowerCase());
}   

function normalizeFieldsDsl(fieldList = "") {

    /*
    |--------------------------------------------------------------------------
    | STRING TO ARRAY
    |--------------------------------------------------------------------------
    */

    if(typeof fieldList === "string"){

        fieldList = fieldList
            .split(",")
            .map(function(item){

                return item.trim();

            })
            .filter(Boolean);

    }

    const defaults = {

        col        : "col-md-12 text-left",
        type       : "sf",
        source     : "",
        inputType  : "text",
        defaultVal : ""

    };

    /*
    |--------------------------------------------------------------------------
    | NORMALIZE
    |--------------------------------------------------------------------------
    */

    return fieldList.map(function(fieldStr){

        const parts =
            fieldStr.split("|");
            
//name|100|text|col-md-12|sf|source
//name|100|text|col-md-12|crm_contacts:contact_name:related_contact_id:record_id|source
const fieldParts =
    (parts[0] || "").split(":");

        const fieldName =
            fieldParts[0] || "";

        const fieldAlias =
            fieldParts[1] || "";

        return {

            raw :
                fieldStr,

            field :
                fieldName,

            label :
                fieldAlias,

                
            defaultVal :
                  parts[1] === "?"
                        ? "__USE_API_VALUE__"
                        : resolveDefault(
                            parts[1],
                            defaults.defaultVal
                        ),                        

            inputType :
                    resolveDefault(
                                parts[2],
                                defaults.inputType
                            ),
            col :
                resolveDefault(
                    `${parts[3]} text-left`,
                    defaults.col
                ),

            type :
                resolveDefault(
                    parts[4],
                    defaults.type
                ),

            source :
                resolveDefault(
                    parts[5],
                    defaults.source
                )

        };

    });

}


function buildFormFields(
    fieldsDsl = [],
    module = ""
) {

    return fieldsDsl.map(function(row){

        const field =
            row.field;

        const col =
            row.col;

        const type =
            row.type;

        const source =
            row.source;

        const inputType =
            row.inputType;

        const defaultVal =
            row.defaultVal;

        const label =
            row.label
            ||
            field
                .replaceAll("_", " ")
                .replace(/\b\w/g, function(l){
                    return l.toUpperCase();
                });

        /*
        |--------------------------------------------------------------------------
        | SMART FIELD
        |--------------------------------------------------------------------------
        */

        if(type === "sf"){

            return {

                component : "MosySmartField",

                props : {

                    module,

                    field,

                    label,

                    type : inputType,

                    valueKey : field,

                    defaultVal,

                    cellClass :
                        col + " hive_data_cell"

                }

            };
            
        }

        /*
        |--------------------------------------------------------------------------
        | LIVE SEARCH
        |--------------------------------------------------------------------------
        */

        if(type.includes(":")){

            const lsParts =
                type.split(":");

            // crm_contacts
            const tblName =
                lsParts[0] || "";

            // contact_name
            const displayField =
                lsParts[1] || "";

            // record_id
            const valueField =
                lsParts[2] || "record_id";

            // related_contact_id
            const hiddenInputName =
                lsParts[3] || "";

            /*
            |--------------------------------------------------------------------------
            | GENERATED
            |--------------------------------------------------------------------------
            */

            const inputName =
                `${tblName}_${displayField}_${hiddenInputName}`;

            return {

                component : "LiveSearchDropdown",

                props : {

                    /*
                    |--------------------------------------------------------------------------
                    | API
                    |--------------------------------------------------------------------------
                    */

                    apiEndpoint :
                        apiRoutes[routeKeyBuilder(tblName)].base,

                    tblName,

                    parentTable :
                        module,

                    /*
                    |--------------------------------------------------------------------------
                    | INPUTS
                    |--------------------------------------------------------------------------
                    */

                    inputName,

                    hiddenInputName,

                    /*
                    |--------------------------------------------------------------------------
                    | FIELDS
                    |--------------------------------------------------------------------------
                    */

                    valueField,

                    displayField,

                    /*
                    |--------------------------------------------------------------------------
                    | DISPLAY
                    |--------------------------------------------------------------------------
                    */

                    label,

                    colClass :
                        col,

                    /*
                    |--------------------------------------------------------------------------
                    | DEFAULTS
                    |--------------------------------------------------------------------------
                    */

                    valueKey :
                        hiddenInputName,

                    displayValueKey :
                        inputName

                }

            };

        }
        /*
        |--------------------------------------------------------------------------
        | SELECT COMPONENT
        |--------------------------------------------------------------------------
        |
        | EXAMPLE:
        |
        | task_status|?|text|col-md-12|Active;Inactive;Onprogress
        |
        |--------------------------------------------------------------------------
        */

        if(type.includes(";")){

            const selectOptions =
                type
                .split(";")
                .map(function(option){

                    return option.trim();

                })
                .filter(Boolean);

            return {

                component : "MosySelectField",

                props : {

                    module,

                    field,

                    label,

                    options :
                        selectOptions,

                    valueKey :
                        field,

                    defaultVal,

                    colClass :
                        col,

                    cellClass :
                        col + " hive_data_cell"

                }

            };

        }

        /*
        |--------------------------------------------------------------------------
        | DYNAMIC DROPDOWN
        |--------------------------------------------------------------------------
        |
        | EXAMPLE:
        |
        | task_type|?|text|col-md-4|dd
        |
        |--------------------------------------------------------------------------
        */

        if(type === "dd"){

            return {

                component : "SmartDropdown",

                props : {

                    module,

                    field,

                    label,

                    apiEndpoint :
                        apiRoutes[
                            routeKeyBuilder(module)
                        ]?.base || "",

                    idField :
                        "primkey",

                    /*
                    |--------------------------------------------------------------------------
                    | USE FIELD NAME
                    |--------------------------------------------------------------------------
                    */

                    labelField :
                        field,

                    inputName :
                        field,

                    valueKey :
                        field,

                    defaultVal,

                    colClass :
                        col

                }

            };

        }        

        return null;

    });

}

/*
|--------------------------------------------------------------------------
| DEFAULT RESOLVER
|--------------------------------------------------------------------------
*/

function resolveDefault(value, fallback){

    if(
        value === undefined ||
        value === null ||
        value === "" ||
        value === "?"
    ){
        return fallback;
    }

    return value;

}



/*
|--------------------------------------------------------------------------
| RENDER ENGINE
|--------------------------------------------------------------------------
*/

function renderDynamicFields({
    fields = [],
    data = {},
    onChange,
    hostParent
}) {

    return fields.map((fieldConfig, index) => {

        /*
        |--------------------------------------------------------------------------
        | MosySmartField
        |--------------------------------------------------------------------------
        */

        if(fieldConfig.component === "MosySmartField"){

            return (

                <MosySmartDataField
                key={index}
                module={fieldConfig.props.module}
                field={fieldConfig.props.field}
                label={fieldConfig.props.label}
                value={

                    fieldConfig.props.defaultVal === "__USE_API_VALUE__"
                
                    ?
                
                    (
                        data?.[
                            fieldConfig.props.valueKey
                        ] ?? ""
                    )
                
                    :
                
                    (
                        fieldConfig.props.defaultVal
                        ??
                        data?.[
                            fieldConfig.props.valueKey
                        ]
                        ??
                        ""
                    )
                
                }
                onChange={onChange}
                context={{ hostParent }}
                inputOverrides={{}}
                type={fieldConfig.props.type}
                cellOverrides={{
                    additionalClass:
                        fieldConfig.props.cellClass
                }}
                />

            );

        }

        /*
        |--------------------------------------------------------------------------
        | LiveSearchDropdown
        |--------------------------------------------------------------------------
        */

        if(fieldConfig.component === "LiveSearchDropdown"){

            return (

                <LiveSearchDropdown
                key={index}

                apiEndpoint={
                    fieldConfig.props.apiEndpoint
                }

                tblName={
                    fieldConfig.props.tblName
                }

                parentTable={
                    fieldConfig.props.parentTable
                }

                inputName={
                    fieldConfig.props.inputName
                }

                hiddenInputName={
                    fieldConfig.props.hiddenInputName
                }

                valueField={
                    fieldConfig.props.valueField
                }

                displayField={
                    fieldConfig.props.displayField
                }

                label={
                    fieldConfig.props.label
                }

                defaultValue={{
                    record_id:
                        data?.[
                            fieldConfig.props.valueKey
                        ] || "",
                
                    [
                        fieldConfig.props.displayField
                    ]:
                        data?.[
                            fieldConfig.props.displayValueKey
                        ] || ""
                }}

                onSelect={(id) =>
                    console.log(id)
                }

                onSelectFull={(dataRes) =>
                    console.log(dataRes)
                }

                onInputChange={onChange}

                defaultColSize={
                    fieldConfig.props.colClass
                }

                context={{ hostParent }}

                />

            );

        }

        /*
        |--------------------------------------------------------------------------
        | MosySelectField
        |--------------------------------------------------------------------------
        */

        if(fieldConfig.component === "MosySelectField"){

            return (

                <MosySelectField
                key={index}

                label={
                    fieldConfig.props.label
                }

                name={
                    fieldConfig.props.field
                }

                value={

                    data?.[
                        fieldConfig.props.valueKey
                    ]
                
                    ||
                
                    (
                        fieldConfig.props.defaultVal === "__USE_API_VALUE__"
                
                        ? ""
                
                        : fieldConfig.props.defaultVal
                    )
                
                    ||
                
                    ""
                
                }

                options={
                    fieldConfig.props.options
                }

                onChange={onChange}

                colClass={
                    fieldConfig.props.colClass
                }

                />

            );

        }        

        /*
        |--------------------------------------------------------------------------
        | SmartDropdown
        |--------------------------------------------------------------------------
        */

        if(fieldConfig.component === "SmartDropdown"){

            return (

                <div
                key={index}
                className={
                    `form-group ${fieldConfig.props.colClass} hive_data_cell`
                }
                >

                    <label className="d-none">

                        {fieldConfig.props.label}

                    </label>

                    <SmartDropdown

                        apiEndpoint={
                            fieldConfig.props.apiEndpoint
                        }

                        idField={
                            fieldConfig.props.idField
                        }

                        labelField={
                            fieldConfig.props.labelField
                        }

                        inputName={
                            fieldConfig.props.inputName
                        }

                        label={
                            fieldConfig.props.label
                        }

                        onSelect={(val) => {

                            onChange(
                                fieldConfig.props.field,
                                val
                            );

                        }}

                        defaultValue={

                            fieldConfig.props.defaultVal === "__USE_API_VALUE__"

                            ?

                            (
                                data?.[
                                    fieldConfig.props.valueKey
                                ] || ""
                            )

                            :

                            (
                                fieldConfig.props.defaultVal
                                ||
                                data?.[
                                    fieldConfig.props.valueKey
                                ]
                                ||
                                ""
                            )

                        }

                        />

                </div>

            );

        }

        return null;

    });

}

/*
|--------------------------------------------------------------------------
| MAIN FUNCTION
|--------------------------------------------------------------------------
*/

export async function initCustomProfileData(parentTable) { 

        const crmNotesTokenId = mosyUrlParam(`${parentTable}_dataNode`);
        //manage  the staff_uptoken value  basically detect primkey
        let decodedCrmNotesToken = '0';
        if (crmNotesTokenId) {
          
          decodedCrmNotesToken = atob(crmNotesTokenId); // Decode the record_id
        }
        
        let rawCrmNotesQueryStr ={Node:btoa(decodedCrmNotesToken)}

  MosyNotify({message : 'Refreshing data' , icon:'refresh', addTimer:false})

  try {
    // Fetch the  data with the given key
    const response = await mosyGetData({
      endpoint: apiRoutes[routeKeyBuilder(parentTable)].base,
      params: { 
      ...rawCrmNotesQueryStr,
      src : btoa(`initCrmNotesProfileData`)
      },
    });

    // Handle the successful response
    if (response.status === 'success') {
      //console.log('crmnotes Data:', response.data);  // Process the data

       closeMosyModal()

      return response.data?.[0] || {};  // Return the actual record

    } else {
          
      console.log('Error fetching crmnotes data:', response.message);  // Handle error
      MosyNotify({message:response.message, icon:'times-circle', iconColor :'text-danger'})

      closeMosyModal()

      return {}
    }
  } catch (err) {

    closeMosyModal()

    console.log('Error:', err);
    return {}
  }
}

export function MosySmartDataUpdate({
    title,
    component,
    stateitemsetters,
    parentTable,
    destTable,
    fieldsetstr,
    profileDataNode,
    dataInterpreter
}) {

    console.log('ARCHIVE NOTE', stateitemsetters);

    let resolvedModalTitle = title;

    /*
    |--------------------------------------------------------------------------
    | DSL
    |--------------------------------------------------------------------------
    */
    const hostParent ="customProfileData";
    const fieldsDsl = normalizeFieldsDsl(fieldsetstr);

    // const fieldsDsl = [

    //     "related_company_id|col-md-12 text-left|ls|crm_companies",

    //     "note_title|col-md-12 text-left|sf",
    //     "note_content|col-md-12 text-left|sf||textarea",

    //     "related_lead_id|col-md-12 text-left|ls|crm_leads",

    // ];

    /*
    |--------------------------------------------------------------------------
    | FORM OBJECT
    |--------------------------------------------------------------------------
    */

    const customProfileDataNode = {};

    /*
    |--------------------------------------------------------------------------
    | LOCAL SNACK STATE
    |--------------------------------------------------------------------------
    */

    let snackMessage = "";
    /*
    |--------------------------------------------------------------------------
    | FORM HANDLER
    |--------------------------------------------------------------------------
    */

    const handleDynamicInputChange =
        mosyDataInputChangeHandler(
            customProfileDataNode
        );

    /*
    |--------------------------------------------------------------------------
    | BUILD FIELDS
    |--------------------------------------------------------------------------
    */

    const formFields =
        buildFormFields(
            fieldsDsl,
            parentTable
        );

        formFields.forEach((fieldConfig) => {

            const field =
                fieldConfig?.props?.field;
        
            const defaultVal =
                fieldConfig?.props?.defaultVal;
        
            /*
            |--------------------------------------------------------------------------
            | HYDRATE DEFAULT VALUES
            |--------------------------------------------------------------------------
            */
        
            if(

                defaultVal !== undefined
                &&
                defaultVal !== null
                &&
                defaultVal !== ""
                &&
                defaultVal !== "__USE_API_VALUE__"
            
            ){
        
                customProfileDataNode[field] =
                    defaultVal;
        
            }
        
        });

    /*
    |--------------------------------------------------------------------------
    | SHOW SNACK
    |--------------------------------------------------------------------------
    */

    function showSnack(
        message = ""
    ) {

        snackMessage =
            message;

        /*
        |--------------------------------------------------------------------------
        | RE-RENDER
        |--------------------------------------------------------------------------
        */

        renderModal(
            customProfileDataNode
        );

        /*
        |--------------------------------------------------------------------------
        | AUTO HIDE
        |--------------------------------------------------------------------------
        */

        setTimeout(() => {

            snackMessage = "";

            // renderModal(
            //     customProfileDataNode
            // );
        }, 4000);

    }

    /*
    |--------------------------------------------------------------------------
    | PREPARE PAYLOAD
    |--------------------------------------------------------------------------
    */

    function prepareUpdatePayload() {

        const payload = {};

        /*
        |--------------------------------------------------------------------------
        | ONLY SEND DSL FIELDS
        |--------------------------------------------------------------------------
        */

        // fieldsDsl.forEach((row) => {

        //     const field =
        //         row.split("|")[0];

        //     payload[field] =
        //         customProfileDataNode?.[
        //             field
        //         ] || "";

        // });
        fieldsDsl.forEach((row) => {

            payload[row.field] =
                customProfileDataNode?.[
                    row.field
                ] || "";
        
        });
        /*
        |--------------------------------------------------------------------------
        | SYSTEM FIELDS
        |--------------------------------------------------------------------------
        */

        payload[`${parentTable}_dataNode`] =
            mosyUrlParam(
                `${parentTable}_dataNode`
            );

        payload[`${parentTable}_mosy_action`] =
            `update_${parentTable}`;

        return payload;

    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE
    |--------------------------------------------------------------------------
    */

    function updateData() {

        const payload =
            prepareUpdatePayload();

        console.log(
            "FINAL PAYLOAD",
            payload
        );

        MosyNotify({

            message:
                "Sending request",

            icon:
                "send"

        });

        updateCustomdata(payload,parentTable)
        .then((response) => {

            console.log(response);

            /*
            |--------------------------------------------------------------------------
            | SUCCESS
            |--------------------------------------------------------------------------
            */

            if (
                response.status === "success"
            ) {

                closeMosyModal();
                
                stateitemsetters.setLocalEventSignature(magicRandomStr())
                stateitemsetters.setSnackMessage(response.message || "Updated successfully")
                closeMosyCard("modal3")
 

            }

            /*
            |--------------------------------------------------------------------------
            | ERROR
            |--------------------------------------------------------------------------
            */

            else {

                MosyNotify({

                    message:
                        response.message ||
                        "Update failed",

                    icon:
                        "times-circle",

                    iconColor:
                        "text-danger"

                });

            }

        })
        .catch((err) => {

            console.log(err);

            MosyNotify({

                message:
                    "Something went wrong"+err,

                icon:
                    "times-circle",

                iconColor:
                    "text-danger"

            });

        });

    }

    /*
    |--------------------------------------------------------------------------
    | RENDER MODAL
    |--------------------------------------------------------------------------
    */

    function renderModal(data = {}) {

        const formBody = (

            <div className="row col-md-12 p-0 m-0">
                {/* TITLE */}

                <div className="col-md-12 mb-1">

                    <h4 className="h4 fw-bold pt-3">

                        {resolvedModalTitle}

                    </h4>

                </div>

        {/* BODY */}
                <div className="col-md-12">

                    {renderDynamicFields({

                        fields:
                            formFields,

                        data,

                        onChange:
                            handleDynamicInputChange,

                        hostParent

                    })}

                </div>

                {/* FOOTER */}

                <div className="col-md-12 text-right">

                    <button
                    className="btn btn-primary"
                    onClick={updateData}
                    >

                        Proceed

                    </button>

                </div>

                {/* SNACK */}

                {snackMessage &&(

                    <MosySnackWidget
                    curr_position='top'
                    bg='darkgreen'
                    content={
                        snackMessage
                    }

                    duration={4000}

                    type="custom"

                    />

                )}

            </div>

        );

        MosyCard(
            "",
            formBody,
            false,
            "modal3"
        );

    }

    /*
    |--------------------------------------------------------------------------
    | LOAD DATA
    |--------------------------------------------------------------------------
    */

    initCustomProfileData(parentTable)
    .then((responseParsedData) => {

        /*
        |--------------------------------------------------------------------------
        | KEEP SAME OBJECT REFERENCE
        |--------------------------------------------------------------------------
        */

            Object.assign(

                customProfileDataNode,

                responseParsedData

            );

                /*
                |--------------------------------------------------------------------------
                | RESOLVE DYNAMIC TITLE
                |--------------------------------------------------------------------------
                */

                resolvedModalTitle =
                title.replace(
                    /\{\{(.*?)\}\}/g,
                    function(match, key){

                        return (
                            responseParsedData?.[
                                key.trim()
                            ] || ""
                        );

                    }
                );

            console.log(
                "RESOLVED TITLE",
                resolvedModalTitle
            );

            /*
            |--------------------------------------------------------------------------
            | APPLY DEFAULT OVERRIDES
            |--------------------------------------------------------------------------
            */

            formFields.forEach((fieldConfig) => {

                const field =
                    fieldConfig?.props?.field;

                const defaultVal =
                    fieldConfig?.props?.defaultVal;

                /*
                |--------------------------------------------------------------------------
                | FORCE OVERRIDE
                |--------------------------------------------------------------------------
                */

                if(

                    defaultVal !== undefined
                    &&
                    defaultVal !== null
                    &&
                    defaultVal !== ""
                    &&
                    defaultVal !== "__USE_API_VALUE__"
                
                ){
                
                    customProfileDataNode[field] =
                        defaultVal;
                
                }

            });

        console.log(
            "INITIAL DATA",
            customProfileDataNode
        );

        /*
        |--------------------------------------------------------------------------
        | RENDER
        |--------------------------------------------------------------------------
        */

        renderModal(
            customProfileDataNode
        );

    });

}

export function mosyDataInputChangeHandler(
    targetObject,
    options = {}
) {

    const prefixToTrim =
        options.prefix || '';

    return function (
        eOrName,
        manualValue = null
    ) {

        let name;
        let value;

        /*
        |--------------------------------------------------------------------------
        | EVENT MODE
        |--------------------------------------------------------------------------
        */

        if (
            typeof eOrName === 'object' &&
            eOrName.target
        ) {

            name =
                eOrName.target.name;

            value =
                eOrName.target.value;

        }

        /*
        |--------------------------------------------------------------------------
        | MANUAL MODE
        |--------------------------------------------------------------------------
        */

        else {

            name =
                eOrName;

            value =
                manualValue;

        }

        /*
        |--------------------------------------------------------------------------
        | TRIM PREFIX
        |--------------------------------------------------------------------------
        */

        const trimmedName =
            name.replace(
                new RegExp(
                    `^${prefixToTrim}`
                ),
                ''
            );

        /*
        |--------------------------------------------------------------------------
        | UPDATE OBJECT
        |--------------------------------------------------------------------------
        */

        targetObject[
            trimmedName
        ] = value;

        console.log(
            "UPDATED OBJECT",
            targetObject
        );

    };

}

export async function updateCustomdata(customData,parentable){ 

  //console.log(`Form crm_notes update sent `)
  const routesline = routeKeyBuilder(parentable);

  console.log(`updateCustomdata ${routesline}`);

  return await mosyPostData({
    url: apiRoutes[routesline].base,
    method: 'PUT',
    isMultipart: false,
    data:customData
  });

}

