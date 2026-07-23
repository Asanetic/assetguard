<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>

<title>Elforge Schema Compiler</title>

<link
rel="stylesheet"
href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
/>

<style>

body{
    margin:0;
    padding:30px;
    background:#f3f6fb;
    font-family:Arial, Helvetica, sans-serif;
}

/* =========================================================
CONTAINER
========================================================= */

.elforge_schema_compiler_v1_container{
    max-width:1450px;
    margin:auto;
}

.elforge_schema_compiler_v1_card{
    background:#ffffff;
    border-radius:28px;
    padding:28px;
    box-shadow:0 20px 60px rgba(0,0,0,0.08);
}

/* =========================================================
TOPBAR
========================================================= */

.elforge_schema_compiler_v1_topbar{
    display:flex;
    justify-content:space-between;
    align-items:center;
    flex-wrap:wrap;
    gap:15px;
    margin-bottom:20px;
}

.elforge_schema_compiler_v1_badge{
    display:inline-flex;
    align-items:center;
    gap:10px;
    background:#111827;
    color:#fff;
    padding:8px 16px;
    border-radius:999px;
    font-size:13px;
    font-weight:700;
}

.elforge_schema_compiler_v1_compile_status{
    background:#ecfdf5;
    color:#065f46;
    padding:10px 16px;
    border-radius:14px;
    font-size:13px;
    font-weight:700;
}

/* =========================================================
TITLE
========================================================= */

.elforge_schema_compiler_v1_title{
    font-size:38px;
    font-weight:800;
    color:#111827;
    margin-bottom:12px;
}

.elforge_schema_compiler_v1_sub{
    color:#6b7280;
    line-height:1.8;
    font-size:15px;
    margin-bottom:30px;
    max-width:900px;
}

/* =========================================================
TOOLBAR
========================================================= */

.elforge_schema_compiler_v1_toolbar{
    display:flex;
    flex-wrap:wrap;
    gap:12px;
    margin-bottom:25px;
}

.elforge_schema_compiler_v1_tool{
    background:#eef2ff;
    color:#3730a3;
    border:none;
    border-radius:14px;
    padding:12px 18px;
    cursor:pointer;
    font-size:13px;
    font-weight:700;
    transition:0.2s;
}

.elforge_schema_compiler_v1_tool:hover{
    transform:translateY(-2px);
    background:#dbeafe;
}

/* =========================================================
GRID
========================================================= */

.elforge_schema_compiler_v1_grid{
    display:grid;
    grid-template-columns:1.1fr 0.9fr;
    gap:24px;
    margin-bottom:25px;
}

.elforge_schema_compiler_v1_box{
    background:#f8fafc;
    border-radius:22px;
    padding:22px;
}

.elforge_schema_compiler_v1_box_header{
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin-bottom:18px;
}

.elforge_schema_compiler_v1_label{
    font-size:15px;
    font-weight:800;
    color:#111827;
}

.elforge_schema_compiler_v1_small{
    font-size:12px;
    color:#6b7280;
}

/* =========================================================
TEXTAREA
========================================================= */

.elforge_schema_compiler_v1_textarea{
    width:100%;
    min-height:620px;
    border:none;
    outline:none;
    resize:vertical;
    border-radius:18px;
    background:#eef2f7;
    padding:20px;
    box-sizing:border-box;
    font-size:14px;
    line-height:1.9;
    color:#111827;
    font-family:Consolas, monospace;
}

/* =========================================================
PREVIEW
========================================================= */

.elforge_schema_compiler_v1_preview{
    background:#0f172a;
    border-radius:20px;
    padding:25px;
    min-height:620px;
    box-sizing:border-box;
    overflow:auto;
}

/* =========================================================
TABLE CARD
========================================================= */

.elforge_schema_compiler_v1_table_group{
    margin-bottom:24px;
}

.elforge_schema_compiler_v1_table_title{
    display:flex;
    align-items:center;
    gap:12px;
    color:#fff;
    font-weight:700;
    font-size:16px;
    padding:14px 18px;
    border-radius:14px;
    background:rgba(255,255,255,0.06);
    margin-bottom:14px;
}

.elforge_schema_compiler_v1_field{
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:10px;
    padding:12px 14px;
    border-radius:12px;
    background:rgba(255,255,255,0.03);
    margin-bottom:8px;
}

.elforge_schema_compiler_v1_field_name{
    color:#e2e8f0;
    font-size:14px;
}

.elforge_schema_compiler_v1_field_type{
    background:#1e293b;
    color:#93c5fd;
    padding:6px 10px;
    border-radius:999px;
    font-size:11px;
    font-weight:700;
}

/* =========================================================
ACTIONS
========================================================= */

.elforge_schema_compiler_v1_actions{
    display:flex;
    flex-wrap:wrap;
    gap:14px;
    justify-content:center;
    margin-bottom:25px;
}

.elforge_schema_compiler_v1_btn{
    border:none;
    outline:none;
    padding:15px 24px;
    border-radius:16px;
    cursor:pointer;
    font-size:14px;
    font-weight:700;
    transition:0.2s;
    color:#fff;
    display:flex;
    align-items:center;
    gap:10px;
}

.elforge_schema_compiler_v1_btn:hover{
    transform:translateY(-2px);
}

.elforge_schema_compiler_v1_btn_generate{
    background:#111827;
}

.elforge_schema_compiler_v1_btn_copy{
    background:#2563eb;
}

.elforge_schema_compiler_v1_btn_download{
    background:#059669;
}

.elforge_schema_compiler_v1_btn_clear{
    background:#dc2626;
}

/* =========================================================
OUTPUT
========================================================= */

.elforge_schema_compiler_v1_output{
    width:100%;
    min-height:380px;
    border:none;
    outline:none;
    resize:vertical;
    border-radius:18px;
    background:#0f172a;
    padding:22px;
    box-sizing:border-box;
    font-size:13px;
    line-height:1.9;
    color:#d1fae5;
    overflow:auto;
    white-space:pre-wrap;
    font-family:Consolas, monospace;
}

@media(max-width:1100px){

    .elforge_schema_compiler_v1_grid{
        grid-template-columns:1fr;
    }

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


</style>
</head>
<body>

<div class="elforge_schema_compiler_v1_container">

    <div class="elforge_schema_compiler_v1_card">

        <!-- TOPBAR -->

        <div class="elforge_schema_compiler_v1_topbar">

            <div class="elforge_schema_compiler_v1_badge">
                <i class="fa fa-database"></i>
                Elforge Schema Compiler
            </div>

            <div class="elforge_schema_compiler_v1_compile_status">
                <i class="fa fa-check-circle"></i>
                4 Tables Parsed
            </div>

        </div>

        <!-- TITLE -->

        <div class="elforge_schema_compiler_v1_title">
            Business Domain Schema Generator
        </div>

        <div class="elforge_schema_compiler_v1_sub">
            Convert structured business notes into semantic database schemas,
            PHP table scripts, UI blueprints and reusable domain architecture.
        </div>

        <!-- TOOLBAR -->

        <div class="elforge_schema_compiler_v1_toolbar">

            <button class="elforge_schema_compiler_v1_tool">
                text
            </button>

            <button class="elforge_schema_compiler_v1_tool">
                money
            </button>

            <button class="elforge_schema_compiler_v1_tool">
                longtext
            </button>

            <button class="elforge_schema_compiler_v1_tool">
                relationship
            </button>

            <button class="elforge_schema_compiler_v1_tool">
                timestamps
            </button>

        </div>

        <!-- GRID -->

        <div class="elforge_schema_compiler_v1_grid">

            <!-- INPUT -->

            <div class="elforge_schema_compiler_v1_box">

                <div class="elforge_schema_compiler_v1_box_header">

                    <div class="elforge_schema_compiler_v1_label">
                        Business Structure Notes
                    </div>

                    <div class="elforge_schema_compiler_v1_small">
                        Semantic Schema DSL
                    </div>

                </div>

<textarea
class="elforge_event_mapper_v1_textarea"
placeholder="Type schema notes here..."
>

@Client Accounts

client name
phone number
email address
profile photo:image
remarks:longtext
account balance:money


@Invoices

invoice number
client id
invoice amount:money
invoice status
due date:date
remarks:longtext

</textarea>

            </div>

            <!-- PREVIEW -->

            <div class="elforge_schema_compiler_v1_box">

                <div class="elforge_schema_compiler_v1_box_header">

                    <div class="elforge_schema_compiler_v1_label">
                        Live Database Structure
                    </div>

                    <div class="elforge_schema_compiler_v1_small">
                        Real Time Semantic Preview
                    </div>

                </div>

                <div class="elforge_schema_compiler_v1_preview">

                    <!-- TABLE -->

                    <div class="elforge_schema_compiler_v1_table_group">

                        <div class="elforge_schema_compiler_v1_table_title">
                            <i class="fa fa-table"></i>
                            Client Accounts
                        </div>

                        <div class="elforge_schema_compiler_v1_field">

                            <div class="elforge_schema_compiler_v1_field_name">
                                client_name
                            </div>

                            <div class="elforge_schema_compiler_v1_field_type">
                                varchar(500)
                            </div>

                        </div>

                        <div class="elforge_schema_compiler_v1_field">

                            <div class="elforge_schema_compiler_v1_field_name">
                                profile_photo
                            </div>

                            <div class="elforge_schema_compiler_v1_field_type">
                                image
                            </div>

                        </div>

                        <div class="elforge_schema_compiler_v1_field">

                            <div class="elforge_schema_compiler_v1_field_name">
                                remarks
                            </div>

                            <div class="elforge_schema_compiler_v1_field_type">
                                longtext
                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </div>

        <!-- ACTIONS -->

        <div class="elforge_schema_compiler_v1_actions">

            <button
            class="elforge_schema_compiler_v1_btn elforge_schema_compiler_v1_btn_generate">
                <i class="fa fa-bolt"></i>
                Generate Schema
            </button>

            <button
            class="elforge_schema_compiler_v1_btn elforge_schema_compiler_v1_btn_copy">
                <i class="fa fa-copy"></i>
                Copy Output
            </button>

            <button
            class="elforge_schema_compiler_v1_btn elforge_schema_compiler_v1_btn_download">
                <i class="fa fa-download"></i>
                Download PHP
            </button>

            <button
            class="elforge_schema_compiler_v1_btn elforge_schema_compiler_v1_btn_clear">
                <i class="fa fa-trash"></i>
                Clear
            </button>

        </div>

        <!-- OUTPUT -->

        <div class="elforge_schema_compiler_v1_box">

            <div class="elforge_schema_compiler_v1_box_header">

                <div class="elforge_schema_compiler_v1_label">
                    Generated Schema Output
                </div>

                <div class="elforge_schema_compiler_v1_small">
                    PHP Table Scripts
                </div>

            </div>

<div class="elforge_schema_compiler_v1_output">

$client_accounts_table_script = "

`primkey` int(11) PRIMARY KEY AUTO_INCREMENT,
`record_id` varchar(100) NOT NULL,

`client_name` varchar(500),
`phone_number` varchar(50),
`email_address` varchar(255),
`profile_photo` text,
`remarks` longtext,
`account_balance` decimal(10,2),

`created_at` datetime DEFAULT CURRENT_TIMESTAMP

";

$client_accounts_table = 'client_accounts';

create_table(
    $mysqliconn,
    $dbname,
    $client_accounts_table,
    $client_accounts_table_script
);

</div>

        </div>

    </div>

</div>
<script>

/* =========================================================
STORAGE
========================================================= */

const schemaCompilerStorageKey =
    "elforge_schema_compiler_v1";

/* =========================================================
ELEMENTS
========================================================= */

const schemaInput =
    document.querySelector(
        ".elforge_event_mapper_v1_textarea"
    );

const schemaPreview =
    document.querySelector(
        ".elforge_schema_compiler_v1_preview"
    );

const schemaOutput =
    document.querySelector(
        ".elforge_schema_compiler_v1_output"
    );

const compileStatus =
    document.querySelector(
        ".elforge_schema_compiler_v1_compile_status"
    );

/* =========================================================
TYPE MAP
========================================================= */

const schemaTypeMap = {

    text : "varchar(500)",

    longtext : "longtext",

    money : "decimal(10,2)",

    decimal : "decimal(10,2)",

    date : "datetime",

    datetime : "datetime",

    image : "text",

    email : "varchar(255)",

    phone : "varchar(50)",

    status : "varchar(50)"

};

/* =========================================================
RESTORE
========================================================= */

window.addEventListener(
    "DOMContentLoaded",
    function(){

        const saved =
            localStorage.getItem(
                schemaCompilerStorageKey
            );

        if(saved){

            schemaInput.value = saved;

        }

        generateSchemaCompiler();

    }
);

/* =========================================================
AUTO SAVE
========================================================= */

schemaInput.addEventListener(
    "input",
    function(){

        localStorage.setItem(
            schemaCompilerStorageKey,
            schemaInput.value
        );

        generateSchemaCompiler();

    }
);

/* =========================================================
NORMALIZE STRING
========================================================= */

function normalizeSchemaKey(input = "")
{

    return input
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");

}

/* =========================================================
DETECT SEMANTIC TYPES
========================================================= */

function detectSemanticType(fieldName = "")
{

    fieldName =
        fieldName.toLowerCase();

    if(fieldName.includes("email")){

        return "varchar(255)";

    }

    if(
        fieldName.includes("phone")
        ||
        fieldName.includes("telephone")
    ){

        return "varchar(50)";

    }

    if(
        fieldName.includes("amount")
        ||
        fieldName.includes("balance")
        ||
        fieldName.includes("price")
    ){

        return "decimal(10,2)";

    }

    if(
        fieldName.includes("date")
        ||
        fieldName.includes("_at")
    ){

        return "datetime";

    }

    if(
        fieldName.includes("photo")
        ||
        fieldName.includes("image")
    ){

        return "text";

    }

    return "varchar(500)";

}

/* =========================================================
GENERATE SCHEMA
========================================================= */

function generateSchemaCompiler()
{

    const rawInput =
        schemaInput.value;

    /*
    |--------------------------------------------------------------------------
    | SPLIT TABLE BLOCKS
    |--------------------------------------------------------------------------
    */

    const blocks =
        rawInput
        .split("@")
        .map(function(block){

            return block.trim();

        })
        .filter(function(block){

            return block !== "";

        });

    /*
    |--------------------------------------------------------------------------
    | STORAGE
    |--------------------------------------------------------------------------
    */

    let previewHTML = "";

    let finalPHPOutput = "";

    let totalTables = 0;

    /*
    |--------------------------------------------------------------------------
    | LOOP TABLES
    |--------------------------------------------------------------------------
    */

    blocks.forEach(function(block){

        const lines =
            block
            .split("\n")
            .map(function(line){

                return line.trim();

            })
            .filter(function(line){

                return line !== "";

            });

        if(lines.length === 0){

            return;

        }

        /*
        |--------------------------------------------------------------------------
        | TABLE NAME
        |--------------------------------------------------------------------------
        */

        const rawTableName =
            lines[0];

        const tableName =
            normalizeSchemaKey(
                rawTableName
            );

        totalTables++;

        /*
        |--------------------------------------------------------------------------
        | TABLE PREVIEW
        |--------------------------------------------------------------------------
        */

        let tablePreviewFields = "";

        /*
        |--------------------------------------------------------------------------
        | SQL STORAGE
        |--------------------------------------------------------------------------
        */

        let sqlFields = `
\`primkey\` int(11) PRIMARY KEY AUTO_INCREMENT,
\`record_id\` varchar(100) NOT NULL,
`;


        /* =========================================================
        LOOP FIELDS
        ========================================================= */

        lines.slice(1).forEach(function(fieldLine){

            /*
            |--------------------------------------------------------------------------
            | CLEAN LINE
            |--------------------------------------------------------------------------
            */

            fieldLine =
                fieldLine.trim();

            /*
            |--------------------------------------------------------------------------
            | SKIP EMPTY
            |--------------------------------------------------------------------------
            */

            if(fieldLine === ""){

                return;

            }

            /*
            |--------------------------------------------------------------------------
            | SKIP COMMENT / SPECIAL CHAR LINES
            |--------------------------------------------------------------------------
            */

            const firstChar =
                fieldLine.charAt(0);

            /*
            |--------------------------------------------------------------------------
            | ALLOW ONLY @
            |--------------------------------------------------------------------------
            */

            if(

                firstChar !== "@"

                &&

                /[^a-zA-Z0-9]/.test(firstChar)

            ){

                return;

            }

            /*
            |--------------------------------------------------------------------------
            | SPLIT TYPE
            |--------------------------------------------------------------------------
            */

            const splitField =
                fieldLine.split(":");

            const rawFieldName =
                (splitField[0] || "")
                .trim();

            const explicitType =
                (splitField[1] || "")
                .trim()
                .toLowerCase();

            /*
            |--------------------------------------------------------------------------
            | NORMALIZE FIELD
            |--------------------------------------------------------------------------
            */

            const fieldName =
                normalizeSchemaKey(
                    rawFieldName
                );

            /*
            |--------------------------------------------------------------------------
            | DETERMINE SQL TYPE
            |--------------------------------------------------------------------------
            */

            let sqlType = "";

            if(explicitType){

                sqlType =
                    schemaTypeMap[
                        explicitType
                    ]
                    ||
                    explicitType;

            }
            else{

                sqlType =
                    detectSemanticType(
                        fieldName
                    );

            }

            /*
            |--------------------------------------------------------------------------
            | SQL FIELD
            |--------------------------------------------------------------------------
            */

            sqlFields +=
        `\n\`${fieldName}\` ${sqlType},`;

            /*
            |--------------------------------------------------------------------------
            | PREVIEW FIELD
            |--------------------------------------------------------------------------
            */

            tablePreviewFields +=
        `
        <div class="elforge_schema_compiler_v1_field">

            <div class="elforge_schema_compiler_v1_field_name">
                ${fieldName}
            </div>

            <div class="elforge_schema_compiler_v1_field_type">
                ${sqlType}
            </div>

        </div>
        `;

        });
      

        /*
        |--------------------------------------------------------------------------
        | AUTO TIMESTAMPS
        |--------------------------------------------------------------------------
        */

        /*
        |--------------------------------------------------------------------------
        | AUTO SYSTEM FIELDS
        |--------------------------------------------------------------------------
        */

        sqlFields += `

\`created_at\` datetime DEFAULT CURRENT_TIMESTAMP,
\`updated_at\` datetime DEFAULT CURRENT_TIMESTAMP,
\`hive_site_id\` varchar(100),
\`hive_site_name\` varchar(255)

        `;

        /*
        |--------------------------------------------------------------------------
        | FINAL PHP
        |--------------------------------------------------------------------------
        */

        finalPHPOutput +=
`
$${tableName}_table_script = "

${sqlFields}

";

$${tableName}_table = '${tableName}';

create_table(

    $mysqliconn,
    $dbname,
    $${tableName}_table,
    $${tableName}_table_script

);




`;

        /*
        |--------------------------------------------------------------------------
        | PREVIEW HTML
        |--------------------------------------------------------------------------
        */

        previewHTML +=
`
<div class="elforge_schema_compiler_v1_table_group">

    <div class="elforge_schema_compiler_v1_table_title">

        <i class="fa fa-table"></i>

        ${rawTableName}

    </div>

    ${tablePreviewFields}

</div>
`;

    });

    /*
    |--------------------------------------------------------------------------
    | RENDER PREVIEW
    |--------------------------------------------------------------------------
    */

    schemaPreview.innerHTML =
        previewHTML;

    /*
    |--------------------------------------------------------------------------
    | OUTPUT
    |--------------------------------------------------------------------------
    */

    schemaOutput.innerText =
        finalPHPOutput;

    /*
    |--------------------------------------------------------------------------
    | STATUS
    |--------------------------------------------------------------------------
    */

    compileStatus.innerHTML =
`
<i class="fa fa-check-circle"></i>
${totalTables} Tables Parsed
`;

}

/* =========================================================
COPY OUTPUT
========================================================= */

function copySchemaOutput()
{

    navigator.clipboard.writeText(
        schemaOutput.innerText
    );

    alert(
        "Schema copied successfully."
    );

}

/* =========================================================
CLEAR
========================================================= */

function clearSchemaCompiler()
{

    schemaInput.value = "";

    localStorage.removeItem(
        schemaCompilerStorageKey
    );

    generateSchemaCompiler();

}

/* =========================================================
BUTTON EVENTS
========================================================= */

document
.querySelector(
    ".elforge_schema_compiler_v1_btn_generate"
)
.addEventListener(
    "click",
    generateSchemaCompiler
);

document
.querySelector(
    ".elforge_schema_compiler_v1_btn_copy"
)
.addEventListener(
    "click",
    copySchemaOutput
);

document
.querySelector(
    ".elforge_schema_compiler_v1_btn_clear"
)
.addEventListener(
    "click",
    clearSchemaCompiler
);

document
.querySelector(
    ".elforge_schema_compiler_v1_btn_download"
)
.addEventListener(
    "click",
    downloadSchemaOutput
);


/* =========================================================
AUTO START
========================================================= */

generateSchemaCompiler();

/* =========================================================
DOWNLOAD OUTPUT
========================================================= */

function downloadSchemaOutput()
{

    const output =
        schemaOutput.innerText;

    const blob =
        new Blob(

            [output],

            {
                type:"text/plain"
            }

        );

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement("a");

    a.href =
        url;

    a.download =
        "appsqldna.php";

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    URL.revokeObjectURL(url);

}

</script>
</body>
</html>