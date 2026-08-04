<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>

<title>App Mapper Generator</title>

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"/>

<style>

body{
    margin:0;
    padding:30px;
    background:#f5f7fb;
    font-family:Arial, Helvetica, sans-serif;
}

.elforge_mapper_v1_container{
    max-width:1100px;
    margin:auto;
}

.elforge_mapper_v1_card{
    background:#fff;
    border-radius:18px;
    padding:25px;
    box-shadow:0 10px 30px rgba(0,0,0,0.08);
}

.elforge_mapper_v1_title{
    font-size:28px;
    margin-bottom:10px;
    font-weight:700;
}

.elforge_mapper_v1_sub{
    color:#666;
    margin-bottom:25px;
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



.elforge_mapper_v1_btn{
    margin-top:18px;
    border:none;
    background:#111827;
    color:white;
    padding:14px 25px;
    border-radius:12px;
    cursor:pointer;
    font-size:15px;
    transition:0.2s;
}

.elforge_mapper_v1_btn:hover{
    transform:translateY(-2px);
}

.elforge_mapper_v1_output{
    margin-top:25px;
    background:#0f172a;
    color:#d1fae5;
    padding:20px;
    border-radius:14px;
    overflow:auto;
    min-height:250px;
    white-space:pre-wrap;
    font-size:14px;
}

.elforge_mapper_v1_example{
    margin-top:15px;
    background:#eef2ff;
    padding:14px;
    border-radius:12px;
    color:#444;
    font-size:14px;
}

.elforge_mapper_v1_actions{
    display:flex;
    gap:12px;
    flex-wrap:wrap;
    margin-top:18px;
}

.elforge_mapper_v1_btn_copy{
    background:#1d4ed8;
}

.elforge_mapper_v1_btn_download{
    background:#059669;
}

</style>
</head>
<body>

<div class="elforge_mapper_v1_container">

    <div class="elforge_mapper_v1_card">

        <div class="elforge_mapper_v1_title">
            App Mapper Generator
        </div>

        <div class="elforge_mapper_v1_sub">
            Type mapping strings and auto-generate JSON structure for PHP.
        </div>

        <textarea 
            id="mapperInput"
            class="elforge_event_mapper_v1_textarea"
            placeholder="Enter mapping strings..."
        >subscriptions:subscription_name|asset_id:record_id:assets(Asset Profile),record_id:context_id:payments,account_id:record_id:app_users,record_id:subscription_id:asset_pricingg</textarea>

<!-- ACTION BUTTONS -->

<div class="elforge_mapper_v1_actions">

    <button 
        class="elforge_mapper_v1_btn"
        onclick="generateMapper()"
    >
        <i class="fa fa-bolt"></i>
        Generate PHP
    </button>

    <button 
        class="elforge_mapper_v1_btn elforge_mapper_v1_btn_copy"
        onclick="copyMapperOutput()"
    >
        <i class="fa fa-copy"></i>
        Copy Result
    </button>

    <button 
        class="elforge_mapper_v1_btn elforge_mapper_v1_btn_download"
        onclick="downloadMapperOutput()"
    >
        <i class="fa fa-download"></i>
        Download Result
    </button>

</div>

        <div class="elforge_mapper_v1_example">
            <b>Format:</b><br><br>
table_name:display_column|

source_column:relation_column:relation_table(Optional Title),
source_column:relation_column:relation_table,
source_column:relation_column:relation_table
        </div>

        <div id="mapperOutput" class="elforge_mapper_v1_output"></div>

    </div>

</div>
<script>

/*
|--------------------------------------------------------------------------
| LOCAL STORAGE AUTO SAVE
|--------------------------------------------------------------------------
*/

const mapperStorageKey =
    "elforge_mapper_input_v1";

/*
|--------------------------------------------------------------------------
| Restore Saved Content
|--------------------------------------------------------------------------
*/

window.addEventListener("DOMContentLoaded", function(){

    const savedInput =
        localStorage.getItem(mapperStorageKey);

    if(savedInput){

        document.getElementById("mapperInput").value =
            savedInput;

    }

    /*
    |--------------------------------------------------------------------------
    | Auto Generate On Load
    |--------------------------------------------------------------------------
    */

    generateMapper();

});

/*
|--------------------------------------------------------------------------
| Auto Save While Typing
|--------------------------------------------------------------------------
*/

document.addEventListener("input", function(e){

    if(e.target.id === "mapperInput"){

        localStorage.setItem(
            mapperStorageKey,
            e.target.value
        );

    }

});

</script>
  
  
<script>
function generateMapper(){

    const input =
        document.getElementById("mapperInput").value;

    const AppMapper = {};

    /*
    |--------------------------------------------------------------------------
    | Default Actions
    |--------------------------------------------------------------------------
    */

    const defaultActions = function(tableName){

        return {

            addTolist: true,
            addToProfile: true,

            actionName:
                "View " +
                tableName
                    .replaceAll("_"," ")
                    .replace(/\b\w/g, function(l){
                        return l.toUpperCase();
                    }),

            isMultigrid: false,

            /*
            |--------------------------------------------------------------------------
            | Enabled By Default
            |--------------------------------------------------------------------------
            */

            linkProfile: true,
            linkMinilist: true

        };

    };

    /*
    |--------------------------------------------------------------------------
    | Parse Parent Blocks
    |--------------------------------------------------------------------------
    */

    const parentBlocks = input
        .split("\n")
        .map(function(item){
            return item.trim();
        })
        .filter(function(item){
            return item !== "";
        });

    parentBlocks.forEach(function(block){

        const parts =
            block.split("|");

        const parentPart =
            parts[0] || "";

        const relationsPart =
            parts[1] || "";

        /*
        |--------------------------------------------------------------------------
        | Parent Parsing
        |--------------------------------------------------------------------------
        */

        const parentInfo =
            parentPart.split(":");

        const parentTable =
            (parentInfo[0] || "").trim();


        const displayName =
    		(parentInfo[1] || "name").trim();
      

        if(!parentTable){
            return;
        }

        AppMapper[parentTable] = {

            display_name: displayName,

            relations: {}

        };

        /*
        |--------------------------------------------------------------------------
        | No Relations
        |--------------------------------------------------------------------------
        */

        if(!relationsPart){
            return;
        }

        /*
        |--------------------------------------------------------------------------
        | SIMPLE RELATION PARSER
        |--------------------------------------------------------------------------
        |
        | asset_id:record_id:assets
        | record_id:context_id:payments
        |
        */

        const relationGroups =
            relationsPart
            .split(",")
            .map(function(group){
                return group.trim();
            })
            .filter(function(group){
                return group !== "";
            });

        relationGroups.forEach(function(group){

            /*
            |--------------------------------------------------------------------------
            | Extract Title
            |--------------------------------------------------------------------------
            */

            let dataTitle = "";

            const titleMatch =
                group.match(/\((.*?)\)/);

            if(titleMatch){

                dataTitle =
                    titleMatch[1];

                group =
                    group.replace(titleMatch[0], "");

            }

            /*
            |--------------------------------------------------------------------------
            | Extract Flags
            |--------------------------------------------------------------------------
            */

            let flags = [];

            const flagMatch =
                group.match(/\[(.*?)\]/);

            if(flagMatch){

                flags =
                    flagMatch[1]
                    .split(",")
                    .map(function(f){
                        return f.trim();
                    });

                group =
                    group.replace(flagMatch[0], "");

            }

            /*
            |--------------------------------------------------------------------------
            | Parse Relation
            |--------------------------------------------------------------------------
            */

            const relationParts =
                group.split(":");

            const sourceCol =
                (relationParts[0] || "").trim();

            const relationCol =
                (relationParts[1] || "").trim();

            const relationTable =
                (relationParts[2] || "").trim();

            /*
            |--------------------------------------------------------------------------
            | Validation
            |--------------------------------------------------------------------------
            */

            if(
                !sourceCol ||
                !relationCol ||
                !relationTable
            ){
                return;
            }

            /*
            |--------------------------------------------------------------------------
            | Default Actions
            |--------------------------------------------------------------------------
            */

            const actions =
                defaultActions(relationTable);

            /*
            |--------------------------------------------------------------------------
            | Apply Flags
            |--------------------------------------------------------------------------
            */

            flags.forEach(function(flag){

                switch(flag){

                    case "multi":
                        actions.isMultigrid = true;
                    break;

                    case "profile":
                        actions.linkProfile = true;
                    break;

                    case "mini":
                        actions.linkMinilist = true;
                    break;

                    case "noprof":
                        actions.linkProfile = false;
                    break;

                    case "nolist":
                        actions.linkMinilist = false;
                    break;

                }

            });

            /*
            |--------------------------------------------------------------------------
            | Build Relation
            |--------------------------------------------------------------------------
            */

            AppMapper[parentTable]
            .relations[relationTable] = {

                /*
                |--------------------------------------------------------------------------
                | Source Column On Parent Table
                |--------------------------------------------------------------------------
                */

                parent_value_col: sourceCol,

                /*
                |--------------------------------------------------------------------------
                | Relation Filter Column
                |--------------------------------------------------------------------------
                */

                child_col: relationCol,

                DataTitle:
                    dataTitle ||
                    relationTable
                        .replaceAll("_"," ")
                        .replace(/\b\w/g, function(l){
                            return l.toUpperCase();
                        }),

                actions: actions

            };

        });

    });

    /*
    |--------------------------------------------------------------------------
    | Generate PHP
    |--------------------------------------------------------------------------
    */

    document.getElementById("mapperOutput").innerHTML =
        generatePHPMapper(AppMapper);

}




/*
|--------------------------------------------------------------------------
| Indent Helper
|--------------------------------------------------------------------------
*/

function tab(level){

    return "    ".repeat(level);

}

function strtoCamelCase(string, capitalizeFirst = false){

    const parts =
        string
        .toLowerCase()
        .split("_");

    let camelCased =
        capitalizeFirst
            ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
            : parts[0];

    for(let i = 1; i < parts.length; i++){

        camelCased +=
            parts[i].charAt(0).toUpperCase() +
            parts[i].slice(1);

    }

    return camelCased;

}



/*
|--------------------------------------------------------------------------
| Generate PHP Mapper
|--------------------------------------------------------------------------
*/

function generatePHPMapper(AppMapper){

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    function formatTitle(str){

        return str
            .replaceAll("_"," ")
            .replace(/\b\w/g, function(l){
                return l.toUpperCase();
            });

    }

    function buildRoute(tableName){

        return "apiRoutes." +
            tableName.replaceAll("_","") +
            ".base";

    }

    function tab(level){

        return "    ".repeat(level);

    }

    /*
    |--------------------------------------------------------------------------
    | Output Buffers
    |--------------------------------------------------------------------------
    */

    let interlinkLists =
`
///Ai Notes  append mini list for interlinked data eg farmers & collections dont remove commented code replace instead 
$interlink_mapping_lists=[

`;

    let interlinkProfiles =
`
///Ai Notes append mini profile for interlinked data dont remove commented code replace instead
$interlink_mapping_profile=[

`;

let connectionMapping =
`
///Ai Notes universal database connection mapping
$connection_col_mapping=[

`;

let listDropDownMapper =
`
  
///Ai Notes on each row you add more actions eg, view collections, send message dont remove commented code replace instead
$list_drop_down_mappper=[

`;
  

let profileActionButtons= 
`
/// Ai Notes buttons you want on the profile /form page dont remove commented code replace instead 
$profile_mapper_buttons_list_=[

`;
    
  

    /*
    |--------------------------------------------------------------------------
    | Connection Mapping Object
    |--------------------------------------------------------------------------
    */

    let connectionMapObject = {};

    /*
    |--------------------------------------------------------------------------
    | Loop Parent Tables
    |--------------------------------------------------------------------------
    */

    Object.keys(AppMapper).forEach(function(parentTable){

        const parentData =
            AppMapper[parentTable];

        const relations =
            parentData.relations || {};
      
          /*
    |--------------------------------------------------------------------------
    | SKIP EMPTY
    |--------------------------------------------------------------------------
    */

      if(Object.keys(relations).length === 0){
          return;
      }

        /*
        |--------------------------------------------------------------------------
        | LIST GROUP START
        |--------------------------------------------------------------------------
        */

        interlinkLists +=
            tab(1) + `"${parentTable}"=>[\n\n`;

        /*
        |--------------------------------------------------------------------------
        | PROFILE GROUP START
        |--------------------------------------------------------------------------
        */

        interlinkProfiles +=
            tab(1) + `"${parentTable}"=>[\n\n`;

        /*
        |--------------------------------------------------------------------------
        | Loop Child Relations
        |--------------------------------------------------------------------------
        */
                                         
        var filterStrIndex =0;
                                         
        Object.keys(relations).forEach(function(childTable){

            const relation =
                relations[childTable];

            const actions =
                relation.actions || {};

            const childCol =
                relation.child_col || "record_id";
          
            const alias =
                childTable.replaceAll("_","");
          
            const title =
                relation.DataTitle ||
                formatTitle(childTable);

            /*
            |--------------------------------------------------------------------------
            | Filter String
            |--------------------------------------------------------------------------
            */
          
            filterStrIndex++
              
              

            const filterStr =
                "{" +
                 strtoCamelCase(childCol) +
                ":btoa(" +
                parentTable +
                "Node?." +
                relation.parent_value_col +
                ")"+tab(filterStrIndex)+"}";

            /*
            |--------------------------------------------------------------------------
            | LIST ITEM
            |--------------------------------------------------------------------------
            */

            interlinkLists +=
                tab(2) + `"${parentTable}_${childTable}"=>[\n` +

                tab(3) + `"filter_str"=>"${filterStr}",\n` +
                tab(3) + `"module_name"=>"${strtoCamelCase(childTable, true)}",\n` +
                tab(3) + `"list_title"=>"${title}",\n` +
                tab(3) + `"event_name"=>"",\n` +
                tab(3) + `"custom"=>false,\n` +
                tab(3) + `"external"=>true,\n` +
                tab(3) + `"enabled"=>${actions.linkMinilist ? "true" : "false"},\n` +
                tab(3) + `"alias"=>'${alias}',\n` +
                tab(3) + `"event_path"=>"",\n` +
                tab(3) + `"module_path"=>"",\n` +
                tab(3) + `"list_url"=>"",\n` +
                tab(3) + `"profile_url"=>"",\n` +

                tab(2) + `],\n\n`;

            /*
            |--------------------------------------------------------------------------
            | PROFILE ITEM
            |--------------------------------------------------------------------------
            */

            interlinkProfiles +=
                tab(2) + `"${parentTable}_${childTable}"=>[\n` +

                tab(3) + `"filter_str"=>"${filterStr}",\n` +
                tab(3) + `"module_name"=>"${strtoCamelCase(childTable, true)}",\n` +
                tab(3) + `"profile_title"=>"${title}",\n` +
                tab(3) + `"custom"=>false,\n` +
                tab(3) + `"external"=>true,\n` +
                tab(3) + `"enabled"=>${actions.linkProfile ? "true" : "false"},\n` +
                tab(3) + `"alias"=>"${alias}",\n` +
                tab(3) + `"event_name"=>"",\n` +
                tab(3) + `"event_path"=>"",\n` +
                tab(3) + `"list_table_name"=>"${childTable}",\n` +

                tab(2) + `],\n\n`;

          
          

            /*
            |--------------------------------------------------------------------------
            | CONNECTION OBJECT
            |--------------------------------------------------------------------------
            */

            /*
            |--------------------------------------------------------------------------
            | GROUP BY CURRENT TABLE
            |--------------------------------------------------------------------------
            */

            if(!connectionMapObject[parentTable]){

                connectionMapObject[parentTable] = {};

            }

            /*
            |--------------------------------------------------------------------------
            | KEY = SOURCE COLUMN
            |--------------------------------------------------------------------------
            */

            connectionMapObject[parentTable][relation.parent_value_col] =
                childTable +
                ":" +
                childCol +
                ":" +
                AppMapper[childTable]?.display_name +
                ":" +
                buildRoute(childTable);
          

        });

        /*
        |--------------------------------------------------------------------------
        | CLOSE LIST GROUP
        |--------------------------------------------------------------------------
        */

        interlinkLists +=
            tab(1) + `],\n\n`;

        /*
        |--------------------------------------------------------------------------
        | CLOSE PROFILE GROUP
        |--------------------------------------------------------------------------
        */

        interlinkProfiles +=
            tab(1) + `],\n\n`;

    });
  
          
          
            Object.keys(AppMapper).forEach(function(parentTable){

                const parentData =
                    AppMapper[parentTable];

                const relations =
                    parentData.relations || {};

                if(Object.keys(relations).length === 0){
                    return;
                }
              
                /*
                |--------------------------------------------------------------------------
                | DROPDOWN PARENT START
                |--------------------------------------------------------------------------
                */

                listDropDownMapper +=
                    tab(1) + `"${parentTable}"=>[\n\n`;
                                                 
                profileActionButtons +=
                    tab(1) + `"${parentTable}"=>[\n\n`;
                /*
                |--------------------------------------------------------------------------
                | CHILD LOOP
                |--------------------------------------------------------------------------
                */

                Object.keys(relations).forEach(function(childTable){

                    const relation =
                        relations[childTable];

                    const childCol =
                        relation.child_col || "record_id";

                    const alias =
                        childTable.replaceAll("_","");

                    const title =
                        relation.DataTitle ||
                        formatTitle(childTable);

                    /*
                    |--------------------------------------------------------------------------
                    | ACTION ITEM
                    |--------------------------------------------------------------------------
                    */
                  
                  listDropDownMapper +=

                      tab(2) + `"list : ${title}"=>[\n` +

                      tab(3) + `"fe"=>"view${strtoCamelCase(childTable, true)}({childCol:\`${strtoCamelCase(childCol)}\`,parentColVal:list${parentTable}_result.${ relation.parent_value_col},parentName:list${parentTable}_result.${parentData.display_name}})",\n` +

                      tab(3) + `"file"=>"${childTable}-automapper",\n` +
                	  tab(3) + `"module_name"=>"${strtoCamelCase(childTable, true)}",\n` +                                                         
                      tab(3) + `"functionType"=>"autoMapper",\n` +
                      tab(3) + `"parentName"=>"${strtoCamelCase(childTable, true)}List",\n` +
                      tab(3) + `"parentTable"=>"${parentTable}",\n` +
                      tab(3) + `"childTable"=>"${childTable}",\n` +
                      tab(3) + `"fileTitle"=>"${title}",\n` +
                      tab(3) + `"alias"=>"${alias}",\n` +
                      tab(3) + `"functionType"=>"autoMapper",\n` +
                      tab(3) + `"basepath"=>"../../${alias}/logicControl"\n` +

                      tab(2) + `],\n\n`;
                  
                  
                  profileActionButtons +=

                      tab(2) + `"list : View ${title}"=>[\n` +
                	  tab(3) + `"module_name"=>"${strtoCamelCase(childTable, true)}",\n` +                                                         
                      tab(3) + `"fe"=>"view${strtoCamelCase(childTable, true)}({childCol:\`${strtoCamelCase(childCol)}\`,parentColVal:${parentTable}Node.${ relation.parent_value_col},parentName:${parentTable}Node.${parentData.display_name}})",\n` +
                      tab(3) + `"alias"=>"${alias}",\n` +
                      tab(3) + `"file"=>"${childTable}-automapper",\n` +
                      tab(3) + `"functionType"=>"autoMapper",\n` +
                      tab(3) + `"parentName"=>"${strtoCamelCase(childTable, true)}List",\n` +
                      tab(3) + `"parentTable"=>"${parentTable}",\n` +
                      tab(3) + `"childTable"=>"${childTable}",\n` +
                      tab(3) + `"fileTitle"=>"${title}",\n` +
                      tab(3) + `"functionType"=>"autoMapper",\n` +
                      tab(3) + `"basepath"=>"../../${alias}/logicControl"\n` +

                      tab(2) + `],\n\n`;                  
                  
                  
 
                });

                /*
                |--------------------------------------------------------------------------
                | DROPDOWN PARENT END
                |--------------------------------------------------------------------------
                */

                listDropDownMapper +=  tab(1) + `],\n\n`;
                profileActionButtons +=  tab(1) + `],\n\n`;

            });
          
  
  

    /*
    |--------------------------------------------------------------------------
    | Render Connection Mapping
    |--------------------------------------------------------------------------
    */

    Object.keys(connectionMapObject)
    .forEach(function(childTable){

        connectionMapping +=
            tab(1) + `"${childTable}"=>[\n`;

        Object.keys(connectionMapObject[childTable])
        .forEach(function(childCol){

            connectionMapping +=
                tab(2) +
                `"${childCol}" => "${connectionMapObject[childTable][childCol]}",\n`;

        });

        connectionMapping +=
            tab(1) + `],\n\n`;

    });

    /*
    |--------------------------------------------------------------------------
    | Close Arrays
    |--------------------------------------------------------------------------
    */

    interlinkLists += `];`;

    interlinkProfiles += `];`;

    connectionMapping += `];`;

    listDropDownMapper += `];`;
    profileActionButtons += `];`;

    /*
    |--------------------------------------------------------------------------
    | Custom Profile Data Mapping
    |--------------------------------------------------------------------------
    */

    let customProfileDataObject = {};

    Object.keys(AppMapper).forEach(function(parentTable){

        const parentData =
            AppMapper[parentTable];

        const relations =
            parentData.relations || {};

        Object.keys(relations).forEach(function(childTable){

            const relation =
                relations[childTable];

            const parentCol =
                relation.parent_value_col;

            const childCol =
                relation.child_col;

            const parentDisplay =
                parentData.display_name;

            /*
            |--------------------------------------------------------------------------
            | INIT CHILD TABLE
            |--------------------------------------------------------------------------
            */

            if(!customProfileDataObject[childTable]){

                customProfileDataObject[childTable] = [];

            }

            /*
            |--------------------------------------------------------------------------
            | PUSH RELATION
            |--------------------------------------------------------------------------
            */

            customProfileDataObject[childTable].push({

                key:
                    `_${parentTable}_${parentDisplay}_${childCol}`,

                value:
                    `${parentTable}Node?.${parentDisplay}`

            });

            customProfileDataObject[childTable].push({

                key:
                    childCol,

                value:
                    `${parentTable}Node?.${parentCol}`

            });

        });

    });

    /*
    |--------------------------------------------------------------------------
    | RENDER FINAL STRING
    |--------------------------------------------------------------------------
    */

    /*
    |--------------------------------------------------------------------------
    | Custom Profile Data Mapping
    |--------------------------------------------------------------------------
    */

    let customProfileDataMap =
    `

    ///Auto generated profile data map
    $customProfileDataMap=[

    `;

    Object.keys(AppMapper).forEach(function(parentTable){

        const parentData =
            AppMapper[parentTable];

        const relations =
            parentData.relations || {};

        if(Object.keys(relations).length === 0){
            return;
        }

        customProfileDataMap +=
            tab(1) + `"${parentTable}"=>[\n\n`;

        Object.keys(relations).forEach(function(childTable){

            const relation =
                relations[childTable];

            const parentCol =
                relation.parent_value_col;

            const childCol =
                relation.child_col;

            const parentDisplay =
                parentData.display_name;

            customProfileDataMap +=
                tab(2) + `"${childTable}"=>[\n` +

                tab(3) +
                `"_${parentTable}_${parentDisplay}_${childCol}"=>"${parentTable}Node?.${parentDisplay}",\n` +

                tab(3) +
                `"${childCol}"=>"${parentTable}Node?.${parentCol}",\n` +

                tab(2) + `],\n\n`;

        });

        customProfileDataMap +=
            tab(1) + `],\n\n`;

    });

    customProfileDataMap += `];`;
  
  

    /*
    |--------------------------------------------------------------------------
    | Final Output
    |--------------------------------------------------------------------------
    */

    return `

${interlinkLists}


${interlinkProfiles}


${connectionMapping}

${listDropDownMapper}

${profileActionButtons}

${customProfileDataMap}

`;

}

                                       
                                       

/*
|--------------------------------------------------------------------------
| Auto Run
|--------------------------------------------------------------------------
*/

generateMapper();

/*
|--------------------------------------------------------------------------
| Copy Result
|--------------------------------------------------------------------------
*/

function copyMapperOutput(){

    const output =
        document.getElementById("mapperOutput")
        .innerText;

    navigator.clipboard.writeText(output)
    .then(function(){

        alert("Mapper copied successfully.");

    });

}

/*
|--------------------------------------------------------------------------
| Download Result
|--------------------------------------------------------------------------
*/

function downloadMapperOutput(){

    const output =
        document.getElementById("mapperOutput")
        .innerText;

    const input =
        document.getElementById("mapperInput")
        .value;

    /*
    |--------------------------------------------------------------------------
    | Build Full Export
    |--------------------------------------------------------------------------
    */

    const exportContent = `
<?php\n
/*
|--------------------------------------------------------------------------
| Generated Mapping String
|--------------------------------------------------------------------------
*/

/*
\n${input}\n 
*/



/*
|--------------------------------------------------------------------------
| Generated PHP Mapper
|--------------------------------------------------------------------------
*/

${output}
\n
?>
`;

    /*
    |--------------------------------------------------------------------------
    | Create File
    |--------------------------------------------------------------------------
    */

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
        "gmap.php";

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    URL.revokeObjectURL(url);

}

</script>
  
</body>
</html>