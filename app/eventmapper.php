<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>

<title>Elforge Event Mapper</title>

<link rel="stylesheet"
href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"/>

<style>

body{
    margin:0;
    padding:30px;
    background:#f4f7fb;
    font-family:Arial, Helvetica, sans-serif;
}

.elforge_event_mapper_v1_container{
    max-width:1300px;
    margin:auto;
}

.elforge_event_mapper_v1_card{
    background:#ffffff;
    border-radius:22px;
    padding:25px;
    box-shadow:0 15px 40px rgba(0,0,0,0.08);
}

.elforge_event_mapper_v1_badge{
    display:inline-block;
    background:#111827;
    color:#fff;
    font-size:12px;
    padding:6px 14px;
    border-radius:999px;
    margin-bottom:15px;
}

.elforge_event_mapper_v1_title{
    font-size:34px;
    font-weight:700;
    margin-bottom:10px;
    color:#111827;
}

.elforge_event_mapper_v1_sub{
    color:#6b7280;
    line-height:1.7;
    margin-bottom:30px;
    font-size:15px;
}

.elforge_event_mapper_v1_stack{
    display:flex;
    flex-direction:column;
    gap:22px;
}

.elforge_event_mapper_v1_box{
    background:#f8fafc;
    border-radius:18px;
    padding:20px;
}

.elforge_event_mapper_v1_label{
    font-size:14px;
    font-weight:700;
    margin-bottom:12px;
    color:#111827;
}

 

.elforge_event_mapper_v1_textarea{
    width:100%;
    min-height:80vh;
    border:none;
    outline:none;
    resize:vertical;

    border-radius:18px;

    padding:
        28px
        24px
        28px
        75px;

    box-sizing:border-box;

font-family:
    "Georgia",
    "Times New Roman",
    serif;

font-size:18px;

line-height:42px;

letter-spacing:0.2px;

font-weight:400;
    /*
    |--------------------------------------------------------------------------
    | PAPER FEEL
    |--------------------------------------------------------------------------
    */

background-color:#fffdf5;
color:#3f3a34;
    /*
    |--------------------------------------------------------------------------
    | NOTEBOOK LINES
    |--------------------------------------------------------------------------
    */

    background-image:

        /* LEFT RED MARGIN LINE */
        linear-gradient(
            to right,
            transparent 0px,
            transparent 58px,
            rgba(220,38,38,0.28) 58px,
            rgba(220,38,38,0.28) 60px,
            transparent 60px
        ),

        /* HORIZONTAL LINES */
        repeating-linear-gradient(
            to bottom,
            transparent 0px,
            transparent 36px,
            rgba(59,130,246,0.12) 37px,
            rgba(59,130,246,0.12) 38px
        );

    /*
    |--------------------------------------------------------------------------
    | DEPTH
    |--------------------------------------------------------------------------
    */

    /*box-shadow:
        inset 0 1px 2px rgba(255,255,255,0.8),
        inset 0 -1px 2px rgba(0,0,0,0.03),
        0 15px 35px rgba(0,0,0,0.06);*/

    border:1px solid rgba(0,0,0,0.05);

    transition:0.25s ease;
}

.elforge_event_mapper_v1_textarea::selection{
    background:rgba(59,130,246,0.18);
}

/*
|--------------------------------------------------------------------------
| FOCUS FEEL
|--------------------------------------------------------------------------
*/

.elforge_event_mapper_v1_textarea:focus{

    transform:translateY(-1px);

    box-shadow:
        inset 0 1px 2px rgba(255,255,255,0.9),
        0 20px 45px rgba(0,0,0,0.09);

    border:1px solid rgba(59,130,246,0.15);

}

/*
|--------------------------------------------------------------------------
| SCROLLBAR
|--------------------------------------------------------------------------
*/

.elforge_event_mapper_v1_textarea::-webkit-scrollbar{
    width:10px;
}

.elforge_event_mapper_v1_textarea::-webkit-scrollbar-thumb{
    background:#d1d5db;
    border-radius:999px;
}

.elforge_event_mapper_v1_textarea::-webkit-scrollbar-track{
    background:transparent;
}


.elforge_event_mapper_v1_output{
    width:100%;
    min-height:450px;
    border:none;
    outline:none;
    resize:vertical;
    border-radius:16px;
    background:#0f172a;
    padding:20px;
    box-sizing:border-box;
    font-size:13px;
    line-height:1.9;
    color:#d1fae5;
    overflow:auto;
    white-space:pre-wrap;
    font-family:Consolas, monospace;
}

.elforge_event_mapper_v1_actions{
    display:flex;
    flex-wrap:wrap;
    gap:14px;
    justify-content:center;
}

.elforge_event_mapper_v1_btn{
    border:none;
    outline:none;
    padding:15px 24px;
    border-radius:14px;
    cursor:pointer;
    font-size:14px;
    font-weight:700;
    transition:0.2s;
    color:#fff;
    display:flex;
    align-items:center;
    gap:10px;
}

.elforge_event_mapper_v1_btn:hover{
    transform:translateY(-2px);
}

.elforge_event_mapper_v1_btn_generate{
    background:#111827;
}

.elforge_event_mapper_v1_btn_copy{
    background:#2563eb;
}

.elforge_event_mapper_v1_btn_download{
    background:#059669;
}

.elforge_event_mapper_v1_btn_clear{
    background:#dc2626;
}

.elforge_event_mapper_v1_example{
    margin-top:25px;
    background:#eef2ff;
    border-radius:18px;
    padding:20px;
    color:#374151;
    line-height:1.9;
    font-size:14px;
}

.elforge_event_mapper_v1_code{
    display:block;
    margin-top:10px;
    background:#fff;
    border-radius:12px;
    padding:15px;
    font-family:Consolas, monospace;
    overflow:auto;
    color:#111827;
}

@media(max-width:768px){

    body{
        padding:15px;
    }

    .elforge_event_mapper_v1_title{
        font-size:28px;
    }

    .elforge_event_mapper_v1_actions{
        flex-direction:column;
    }

    .elforge_event_mapper_v1_btn{
        width:100%;
        justify-content:center;
    }

}

</style>
</head>
<body>

<div class="elforge_event_mapper_v1_container">

    <div class="elforge_event_mapper_v1_card">

        <div class="elforge_event_mapper_v1_badge">
            Elforge Compiler Tool
        </div>

        <div class="elforge_event_mapper_v1_title">
            Event Mapper Generator
        </div>

        <div class="elforge_event_mapper_v1_sub">
            Convert compact event mapping syntax into structured PHP arrays
            for list actions, profile actions, and dynamic module behavior.
        </div>

        <div class="elforge_event_mapper_v1_stack">
        <div id="eventMapperPreviewButtons"></div>

        <hr>
            <!-- INPUT -->

            <div class="elforge_event_mapper_v1_box">

                <div class="elforge_event_mapper_v1_label">
                    Mapping Input
                </div>

<textarea
id="eventMapperInput"
class="elforge_event_mapper_v1_textarea"
placeholder="Type mapper syntax here..."
>app_users:user-filter:list|userid,'date','primkey'|copy,Filter by date,filterByDate,../logicControl

app_users:user-notify:profile|{userRecordId:app_usersNode?.record_id,username:app_usersNode?.full_name}|envelope,Send message,senduserMessage,../logicControl

subscriptions:user-filter:list|subscriptionId,status|bolt,Renew Subscription,renewSubscription,../logicControl</textarea>

            </div>

            <!-- BUTTONS -->

            <div class="elforge_event_mapper_v1_actions">

                <button
                    class="elforge_event_mapper_v1_btn elforge_event_mapper_v1_btn_generate"
                    onclick="generateEventMapper()"
                >
                    <i class="fa fa-bolt"></i>
                    Generate Mapper
                </button>

                <button
                    class="elforge_event_mapper_v1_btn elforge_event_mapper_v1_btn_copy"
                    onclick="copyEventMapperOutput()"
                >
                    <i class="fa fa-copy"></i>
                    Copy Output
                </button>

                <button
                    class="elforge_event_mapper_v1_btn elforge_event_mapper_v1_btn_download"
                    onclick="downloadEventMapperOutput()"
                >
                    <i class="fa fa-download"></i>
                    Export map events
                </button>

   

            </div>

            <!-- OUTPUT -->

            <div class="elforge_event_mapper_v1_box">

                <div class="elforge_event_mapper_v1_label">
                    Generated PHP Mapper
                </div>

                <div
                    id="eventMapperOutput"
                    class="elforge_event_mapper_v1_output"
                ></div>

            </div>

        </div>

        <!-- EXAMPLES -->

        <div class="elforge_event_mapper_v1_example">

            <b>Mapper Format</b>

            <span class="elforge_event_mapper_v1_code">
<!-- =========================================================
ACTION STRING STRUCTURE DOCUMENTATION
========================================================= -->

<section class="container py-5">

    <div class="row justify-content-center">

        <div class="col-md-10">

            <div class="card shadow-sm border-0 rounded-4">

                <div class="card-body p-5">

                    <h1 class="mb-4 fw-bold">
                        Action String Structure Guide
                    </h1>

                    <p class="text-muted mb-5">
                        Quick reference for building DataMap and DataQuery action strings.
                    </p>


                    <!-- ================================================= -->
                    <!-- BUTTON STRUCTURE -->
                    <!-- ================================================= -->

                    <h3 class="mt-4 mb-3">
                        1. Button Action Structure
                    </h3>

<pre class="bg-dark text-light p-4 rounded-4 overflow-auto">
table_name:action_key:view_type|'value'|icon,
Button Label,
function_name,
path
</pre>

                    <h5 class="mt-4">
                        Example
                    </h5>

<pre class="bg-light p-4 rounded-4 border overflow-auto">
crm_tasks:mark-complete:profile|'record_id'|check,
Mark Complete,
markTaskComplete,
../logicControl
</pre>

                    <table class="table table-bordered mt-4">
                        <thead class="table-light">
                            <tr>
                                <th>Part</th>
                                <th>Description</th>
                            </tr>
                        </thead>

                        <tbody>

                            <tr>
                                <td>table_name</td>
                                <td>Main module table</td>
                            </tr>

                            <tr>
                                <td>action_key</td>
                                <td>Unique action identifier</td>
                            </tr>

                            <tr>
                                <td>view_type</td>
                                <td>profile or list</td>
                            </tr>

                            <tr>
                                <td>'value'</td>
                                <td>Dynamic passed value</td>
                            </tr>

                            <tr>
                                <td>icon</td>
                                <td>Lucide / icon key</td>
                            </tr>

                            <tr>
                                <td>Button Label</td>
                                <td>Displayed UI label</td>
                            </tr>

                            <tr>
                                <td>function_name</td>
                                <td>Connected logic function</td>
                            </tr>

                            <tr>
                                <td>path</td>
                                <td>Import/function path</td>
                            </tr>

                        </tbody>
                    </table>


                    <!-- ================================================= -->
                    <!-- FUNCTION STRUCTURE -->
                    <!-- ================================================= -->

                    <h3 class="mt-5 mb-3">
                        2. Function Logic Structure
                    </h3>

<pre class="bg-dark text-light p-4 rounded-4 overflow-auto">
@functionName:FunctionType:table=
Title,
config
</pre>

                    <h5 class="mt-4">
                        Example
                    </h5>

<pre class="bg-light p-4 rounded-4 border overflow-auto">
@createCompanyDeal:DataMapAdd:crm_deals=
Add Deal,
crm_companies:company_name|record_id:company_id
</pre>


                    <!-- ================================================= -->
                    <!-- DATAMAP ADD -->
                    <!-- ================================================= -->

                    <h3 class="mt-5 mb-3">
                        3. DataMapAdd Structure
                    </h3>

<pre class="bg-dark text-light p-4 rounded-4 overflow-auto">
@functionName:DataMapAdd:table=
Title,
sourceTable:displayColumn|valueColumn:saveColumn
</pre>

                    <h5 class="mt-4">
                        Example
                    </h5>

<pre class="bg-light p-4 rounded-4 border overflow-auto">
@createCompanyContact:DataMapAdd:crm_contacts=
Add Contact,
crm_companies:company_name|record_id:company_id
</pre>


                    <!-- ================================================= -->
                    <!-- DATAMAP UPDATE -->
                    <!-- ================================================= -->

                    <h3 class="mt-5 mb-3">
                        4. DataMapUpdate Structure
                    </h3>

<pre class="bg-dark text-light p-4 rounded-4 overflow-auto">
@functionName:DataMapUpdate:table=
Title,
column|value
</pre>

                    <h5 class="mt-4">
                        Example
                    </h5>

<pre class="bg-light p-4 rounded-4 border overflow-auto">
@publishAsset:DataMapUpdate:assets=
Publish Asset,
status|Published
</pre>


                    <!-- ================================================= -->
                    <!-- INPUT FIELD STRUCTURE -->
                    <!-- ================================================= -->

                    <h3 class="mt-5 mb-3">
                        5. Input Field Structure
                    </h3>

<pre class="bg-dark text-light p-4 rounded-4 overflow-auto">
column:Label|defaultValue|inputType|placeholder|options
</pre>

                    <h5 class="mt-4">
                        Example
                    </h5>

<pre class="bg-light p-4 rounded-4 border overflow-auto">
task_status:Task Status|?|text|?|Complete;Pending;Overdue
</pre>

                    <table class="table table-bordered mt-4">
                        <thead class="table-light">
                            <tr>
                                <th>Part</th>
                                <th>Description</th>
                            </tr>
                        </thead>

                        <tbody>

                            <tr>
                                <td>column</td>
                                <td>Database column name</td>
                            </tr>

                            <tr>
                                <td>Label</td>
                                <td>Input label</td>
                            </tr>

                            <tr>
                                <td>defaultValue</td>
                                <td>Default field value</td>
                            </tr>

                            <tr>
                                <td>inputType</td>
                                <td>text, date, textarea, datetime-local etc</td>
                            </tr>

                            <tr>
                                <td>placeholder</td>
                                <td>Input placeholder</td>
                            </tr>

                            <tr>
                                <td>options</td>
                                <td>Select/dropdown values separated by ;</td>
                            </tr>

                        </tbody>
                    </table>


                    <!-- ================================================= -->
                    <!-- RELATIONAL FIELD -->
                    <!-- ================================================= -->

                    <h3 class="mt-5 mb-3">
                        6. Relational Field Structure
                    </h3>

<pre class="bg-dark text-light p-4 rounded-4 overflow-auto">
table:displayColumn:valueColumn:saveColumn
</pre>

                    <h5 class="mt-4">
                        Example
                    </h5>

<pre class="bg-light p-4 rounded-4 border overflow-auto">
system_users:name:record_id:assigned_user_id
</pre>


                    <!-- ================================================= -->
                    <!-- DATAQUERYCOL -->
                    <!-- ================================================= -->

                    <h3 class="mt-5 mb-3">
                        7. DataQueryCol Structure
                    </h3>

<pre class="bg-dark text-light p-4 rounded-4 overflow-auto">
@functionName:DataQueryCol:table=
column,value
</pre>

                    <h5 class="mt-4">
                        Example
                    </h5>

<pre class="bg-light p-4 rounded-4 border overflow-auto">
@filterOverdueTasks:DataQueryCol:crm_tasks=
taskStatus,overdue
</pre>


                    <!-- ================================================= -->
                    <!-- DATAQUERYGROUPCOL -->
                    <!-- ================================================= -->

                    <h3 class="mt-5 mb-3">
                        8. DataQueryGroupCol Structure
                    </h3>

<pre class="bg-dark text-light p-4 rounded-4 overflow-auto">
@functionName:DataQueryGroupCol:table=
Title,
column
</pre>

                    <h5 class="mt-4">
                        Example
                    </h5>

<pre class="bg-light p-4 rounded-4 border overflow-auto">
@queryTasksStatus:DataQueryGroupCol:crm_tasks=
Group by status,
task_status
</pre>


                    <!-- ================================================= -->
                    <!-- DATAQUERYMAP -->
                    <!-- ================================================= -->

                    <h3 class="mt-5 mb-3">
                        9. DataQueryMap Structure
                    </h3>

<pre class="bg-dark text-light p-4 rounded-4 overflow-auto">
@functionName:DataQueryMap:table=
Title,
table:displayColumn|valueColumn:targetColumn
</pre>

                    <h5 class="mt-4">
                        Example
                    </h5>

<pre class="bg-light p-4 rounded-4 border overflow-auto">
@filterTaskByCompany:DataQueryMap:crm_tasks=
Filter Companies,
crm_companies:company_name|record_id:related_company_id
</pre>


                    <!-- ================================================= -->
                    <!-- DATAQUERYDATE -->
                    <!-- ================================================= -->

                    <h3 class="mt-5 mb-3">
                        10. DataQueryDate Structure
                    </h3>

<pre class="bg-dark text-light p-4 rounded-4 overflow-auto">
@functionName:DataQueryDate:table=
Title,
column,
type
</pre>

                    <h5 class="mt-4">
                        Example
                    </h5>

<pre class="bg-light p-4 rounded-4 border overflow-auto">
@filterPaymentByDate:DataQueryDate:payments=
Filter Date,
paidAt,
date
</pre>


                    <!-- ================================================= -->
                    <!-- QUICK CHEAT SHEET -->
                    <!-- ================================================= -->

                    <h3 class="mt-5 mb-3">
                        11. Quick Cheat Sheet
                    </h3>

<pre class="bg-dark text-light p-4 rounded-4 overflow-auto">
BUTTON
------------------------------------------------
table:key:view|'value'|icon,
Label,
function,
path


FUNCTION
------------------------------------------------
@function:type:table=
Title,
config


RELATION MAP
------------------------------------------------
table:display|value:save


INPUT FIELD
------------------------------------------------
column:label|default|type|placeholder|options


QUERY COLUMN
------------------------------------------------
column,value


SELECT OPTIONS
------------------------------------------------
Active;Pending;Suspended
</pre>

                </div>

            </div>

        </div>

    </div>

</section>            </span>

            <br>

            <b>Example</b>

            <span class="elforge_event_mapper_v1_code">
app_users:user-filter:list|userid,date|copy,Filter by date,filterByDate,../logicControl
            </span>

        </div>

    </div>

</div>

<script>

/*
|--------------------------------------------------------------------------
| STORAGE KEY
|--------------------------------------------------------------------------
*/

const eventMapperStorageKey =
    "elforge_event_mapper_v4";

/*
|--------------------------------------------------------------------------
| RESTORE
|--------------------------------------------------------------------------
*/

window.addEventListener(
    "DOMContentLoaded",
    function(){

        const saved =
            localStorage.getItem(
                eventMapperStorageKey
            );

        if(saved){

            document.getElementById(
                "eventMapperInput"
            ).value = saved;

        }

        generateEventMapper();

    }
);

/*
|--------------------------------------------------------------------------
| AUTO SAVE
|--------------------------------------------------------------------------
*/

document.addEventListener(
    "input",
    function(e){

        if(
            e.target.id ===
            "eventMapperInput"
        ){

            localStorage.setItem(
                eventMapperStorageKey,
                e.target.value
            );

        }

    }
);

/*
|--------------------------------------------------------------------------
| GENERATE EVENT MAPPER
|--------------------------------------------------------------------------
*/

const mapperTemplates = {

    DataMapAdd: `
# Create a related record

@functionName:DataMapAdd:table_name=

Describe what this action does.

table_name:display_col|source_col:target_col
`,

    DataMapUpdate: `
# Update existing data

@functionName:DataMapUpdate:table_name=

Explain the update flow.

column_name:Label|default_value
`,

    DataQueryCol: `
# Query records by a single column

@functionName:DataQueryCol:table_name=

Explain query purpose.

column_name,value
`,

    DataQueryMap: `
# Query using mapped relation

@functionName:DataQueryMap:table_name=

Explain relation filter.

related_table:display_name|record_id:target_col
`,

    ProfileAction: `
# Profile action

table_name:file_name:profile|
'record_id'|
icon,Button Title,functionName,../logicControl
`,

    ListAction: `
# List action

table_name:file_name:list|
'all'|
icon,Button Title,functionName,../logicControl
`

};


const ignoredLineStarters = [
    "#",
    "//",
    "*",
    "--",
    ";",
    "\"",
    "NOTE:",
    "INFO:"
];

function insertTemplate(templateKey){

    const textarea =
        document.getElementById(
            "eventMapperInput"
        );

    const template =
        mapperTemplates[templateKey] || "";

    textarea.value += "\n\n" + template;

    generateEventMapper();

}


function generateEventMapper()
{

    const input =
        document
        .getElementById(
            "eventMapperInput"
        )
        .value;

    const lines =
        input
        .split("\n")
        .map(function(line){

            return line.trim();

        })
        .filter(function(line){

            if(line === ""){
                return false;
            }

            /*
            |--------------------------------------------------------------------------
            | IGNORE COMMENT / STORY LINES
            |--------------------------------------------------------------------------
            */

            const shouldIgnore =
                ignoredLineStarters.some(function(symbol){

                    return line.startsWith(symbol);

                });

            return !shouldIgnore;

        });

    const EventMap = {};

      let lastActionRef = null;

    lines.forEach(function(line){

        /*
        |--------------------------------------------------------------------------
        | FUNCTION META PARSER
        |--------------------------------------------------------------------------
        */

        if(line.startsWith("@")){

            if(!lastActionRef){
                return;
            }

            /*
            |--------------------------------------------------------------------------
            | REMOVE @
            |--------------------------------------------------------------------------
            */

            const cleanLine =
                line.substring(1);

            /*
            |--------------------------------------------------------------------------
            | SPLIT
            |--------------------------------------------------------------------------
            */

            const equalIndex =
                cleanLine.indexOf("=");

            let leftMeta = "";
            let logicFlow = "";

            if(equalIndex !== -1){

                leftMeta =
                    cleanLine.substring(
                        0,
                        equalIndex
                    ).trim();

                logicFlow =
                    cleanLine.substring(
                        equalIndex + 1
                    ).trim();

            }else{

                leftMeta =
                    cleanLine.trim();

            }

        const leftMetaParts =
            leftMeta.split(":");

        const funName =
            (leftMetaParts[0] || "").trim();

        const funType =
            (leftMetaParts[1] || "").trim();

        const destTable =
            (leftMetaParts[2] || "").trim();
          
            /*
            |--------------------------------------------------------------------------
            | ASSIGN TO LAST ACTION
            |--------------------------------------------------------------------------
            */

            lastActionRef.funName =
                funName;

            lastActionRef.logicFlow =
                logicFlow;

            lastActionRef.funType =
                funType;
          
            lastActionRef.destTable =
                destTable;
          
            return;

        }

        /*
        |--------------------------------------------------------------------------
        | NORMAL ACTION PARSER
        |--------------------------------------------------------------------------
        */

        const splitLine =
            line.split("|");

        if(splitLine.length < 3){

            return;

        }

        const left =
            splitLine[0].trim();

        const args =
            splitLine[1].trim();

        const right =
            splitLine[2].trim();

        /*
        |--------------------------------------------------------------------------
        | LEFT SIDE
        |--------------------------------------------------------------------------
        */

        const leftParts =
            left.split(":");

        const tableName =
            (leftParts[0] || "")
            .trim();

        const fileName =
            (leftParts[1] || "")
            .trim();

        const typeName =
            (leftParts[2] || "")
            .trim();

        if(
            !tableName ||
            !fileName ||
            !typeName
        ){

            return;

        }

        /*
        |--------------------------------------------------------------------------
        | RIGHT SIDE
        |--------------------------------------------------------------------------
        */

        const rightParts =
            right.split(",");

        const icon =
            (rightParts[0] || "")
            .trim();

        const title =
            (rightParts[1] || "")
            .trim();

        const functionName =
            (rightParts[2] || "")
            .trim();

        const basePath =
            (rightParts[3] || "")
            .trim();

        if(
            !icon ||
            !title ||
            !functionName
        ){

            return;

        }

        /*
        |--------------------------------------------------------------------------
        | INIT TABLE
        |--------------------------------------------------------------------------
        */

        if(!EventMap[tableName]){

            EventMap[tableName] = {};

        }

        /*
        |--------------------------------------------------------------------------
        | INIT TYPE
        |--------------------------------------------------------------------------
        */

        if(
            !EventMap
            [tableName]
            [typeName]
        ){

            EventMap
            [tableName]
            [typeName] = {};

        }

        /*
        |--------------------------------------------------------------------------
        | ACTION KEY
        |--------------------------------------------------------------------------
        */

        const actionKey =
            `${icon}: ${title}`;

        /*
        |--------------------------------------------------------------------------
        | ASSIGN
        |--------------------------------------------------------------------------
        */

        EventMap
        [tableName]
        [typeName]
        [actionKey] = {

            fe:
                `${functionName}(${args})`,

            be:
                `${functionName}()`,

            file:
                fileName,

            funName:
                functionName,

            logicFlow:
                "",

            funType:
                "",

            basePath:
                basePath

        };

        /*
        |--------------------------------------------------------------------------
        | SAVE LAST ACTION REF
        |--------------------------------------------------------------------------
        */

        lastActionRef =
            EventMap
            [tableName]
            [typeName]
            [actionKey];

    });

    /*
    |--------------------------------------------------------------------------
    | GENERATE PHP
    |--------------------------------------------------------------------------
    */

  /*
|--------------------------------------------------------------------------
| PREVIEW BUTTONS GROUPED BY TABLE + TYPE
|--------------------------------------------------------------------------
*/

const groupedButtons = {};

lines.forEach(function(line){

    const splitLine = line.split("|");

    if(splitLine.length < 3){
        return;
    }

    /*
    |--------------------------------------------------------------------------
    | LEFT
    |--------------------------------------------------------------------------
    */

    const left = splitLine[0].trim();

    const leftParts = left.split(":");

    const tableName =
        (leftParts[0] || "").trim();

    const typeName =
        (leftParts[2] || "").trim();

    /*
    |--------------------------------------------------------------------------
    | RIGHT
    |--------------------------------------------------------------------------
    */

    const right = splitLine[2].trim();

    const rightParts = right.split(",");

    const icon =
        (rightParts[0] || "").trim();

    const title =
        (rightParts[1] || "").trim();

    const functionName =
        (rightParts[2] || "").trim();

    if(
        !icon ||
        !title ||
        !functionName
    ){
        return;
    }

    /*
    |--------------------------------------------------------------------------
    | INIT TABLE
    |--------------------------------------------------------------------------
    */

    if(!groupedButtons[tableName]){

        groupedButtons[tableName] = {
            list: [],
            profile: []
        };

    }

    /*
    |--------------------------------------------------------------------------
    | BUTTON HTML
    |--------------------------------------------------------------------------
    */

    const buttonHtml = `

    <div
        onclick="alert('${functionName}')"
        style="
        background:#fff;
        color:#000;
        padding:14px 18px;
        border-radius:14px;
        border:1px solid #d1d5db;
        cursor:pointer;
        display:flex;
        align-items:center;
        gap:10px;
        font-size:14px;
        font-weight:700;
        box-shadow:0 10px 25px rgba(0,0,0,0.06);
        transition:0.2s;
        "
    >

        <i class="fa fa-${icon}"></i>

        ${title}

    </div>

    `;

    if(groupedButtons[tableName][typeName]){

        groupedButtons[tableName][typeName]
        .push(buttonHtml);

    }

});

/*
|--------------------------------------------------------------------------
| FINAL HTML
|--------------------------------------------------------------------------
*/

let previewButtonsHtml = "";

Object.keys(groupedButtons)
.forEach(function(tableName,index){

    const accordionId =
        `accordion_${index}`;

    previewButtonsHtml += `

    <div style="
    margin-bottom:22px;
    background:#fff;
    border-radius:18px;
    overflow:hidden;
    border:1px solid #e5e7eb;
    box-shadow:0 10px 30px rgba(0,0,0,0.05);
    ">

        <!-- HEADER -->

        <div
            onclick="
                const body =
                document.getElementById('${accordionId}');

                body.style.display =
                body.style.display === 'none'
                ? 'block'
                : 'none';
            "
            style="
            padding:18px 22px;
            cursor:pointer;
            display:flex;
            justify-content:space-between;
            align-items:center;
            background:#f9fafb;
            font-weight:800;
            font-size:15px;
            "
        >

            <div>
                <i class='fa fa-database'></i>
                ${tableName}
            </div>

            <div>
                <i class='fa fa-chevron-down'></i>
            </div>

        </div>

        <!-- BODY -->

        <div
            id="${accordionId}"
            style="
            padding:22px;
            display:block;
            "
        >

    `;

    /*
    |--------------------------------------------------------------------------
    | LIST ACTIONS
    |--------------------------------------------------------------------------
    */

    if(groupedButtons[tableName].list.length > 0){

        previewButtonsHtml += `

        <div style="margin-bottom:28px;">

            <div style="
            font-size:12px;
            font-weight:800;
            margin-bottom:14px;
            color:#6b7280;
            letter-spacing:1px;
            ">
                LIST ACTIONS
            </div>

            <div style="
            display:flex;
            flex-wrap:wrap;
            gap:12px;
            ">
                ${groupedButtons[tableName].list.join("")}
            </div>

        </div>

        `;

    }

    /*
    |--------------------------------------------------------------------------
    | PROFILE ACTIONS
    |--------------------------------------------------------------------------
    */

    if(groupedButtons[tableName].profile.length > 0){

        previewButtonsHtml += `

        <div>

            <div style="
            font-size:12px;
            font-weight:800;
            margin-bottom:14px;
            color:#6b7280;
            letter-spacing:1px;
            ">
                PROFILE ACTIONS
            </div>

            <div style="
            display:flex;
            flex-wrap:wrap;
            gap:12px;
            ">
                ${groupedButtons[tableName].profile.join("")}
            </div>

        </div>

        `;

    }

    previewButtonsHtml += `

        </div>

    </div>

    `;

});

document.getElementById(
    "eventMapperPreviewButtons"
).innerHTML = previewButtonsHtml;
  
  
    let php =
'$eventMappingArray=[\n\n';

    Object.keys(EventMap)
    .forEach(function(tableName){

        php +=
`    "${tableName}"=>[\n\n`;

        Object.keys(EventMap[tableName])
        .forEach(function(typeName){

            php +=
`        "${typeName}"=>[\n\n`;

            Object.keys(
                EventMap[tableName][typeName]
            )
            .forEach(function(actionKey){

                const item =
                    EventMap
                    [tableName]
                    [typeName]
                    [actionKey];

                php +=
`            "${actionKey}" => [\n`;

                php +=
`                "fe" => "${item.fe}",\n`;

                php +=
`                "be" => "${item.be}",\n`;

                php +=
`                "file" => "${item.file}",\n`;
                php +=
                `                "funName" => "${item.funName}",\n`;
                php +=
`                "destTable" => "${item.destTable}",\n`;
                                
                php +=
                `                "logicFlow" => "${item.logicFlow}",\n`;

                php +=
                `                "functionType" => "${item.funType}"`;
                                                                

                if(item.basePath){

                    php +=
`,\n                "basePath"=>"${item.basePath}"`;

                }

                php +=
`\n            ],\n\n`;

            });

            php +=
`        ],\n\n`;

        });

        php +=
`    ],\n\n`;

    });

    php += `];`;

    /*
    |--------------------------------------------------------------------------
    | OUTPUT
    |--------------------------------------------------------------------------
    */

    document.getElementById(
        "eventMapperOutput"
    ).innerText = php;

}

/*
|--------------------------------------------------------------------------
| COPY
|--------------------------------------------------------------------------
*/

function copyEventMapperOutput()
{

    const output =
        document
        .getElementById(
            "eventMapperOutput"
        )
        .innerText;

    navigator.clipboard
    .writeText(output);

    alert(
        "Mapper copied successfully."
    );

}

/*
|--------------------------------------------------------------------------
| DOWNLOAD
|--------------------------------------------------------------------------
*/

function downloadEventMapperOutput()
{

    const output =
        document
        .getElementById(
            "eventMapperOutput"
        )
        .innerText;

    const input =
        document
        .getElementById(
            "eventMapperInput"
        )
        .value;

    const exportContent =

"<?php\n\n" +

"/*\n" +
"|--------------------------------------------------------------------------\n" +
"| Generated Event Mapping String\n" +
"|--------------------------------------------------------------------------\n" +
"*/\n\n" +

"/*\n\n" +

input +

"\n\n*/\n\n" +

"/*\n" +
"|--------------------------------------------------------------------------\n" +
"| Generated Event Mapper Array\n" +
"|--------------------------------------------------------------------------\n" +
"*/\n\n" +

output +

"\n\n?>";

    const blob =
        new Blob(
            [exportContent],
            {
                type: "text/plain"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement("a");

    a.href = url;

    a.download =
        "eventmap.php";

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    URL.revokeObjectURL(url);

}

/*
|--------------------------------------------------------------------------
| CLEAR
|--------------------------------------------------------------------------
*/

function clearEventMapper()
{

    document.getElementById(
        "eventMapperInput"
    ).value = "";

    localStorage.removeItem(
        eventMapperStorageKey
    );

    generateEventMapper();

}

/*
|--------------------------------------------------------------------------
| AUTO RUN
|--------------------------------------------------------------------------
*/

generateEventMapper();

</script>

</body>
</html>