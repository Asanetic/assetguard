<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>

<title>Elforge Navigation Compiler</title>

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

.elforge_nav_compiler_v1_container{
    max-width:1450px;
    margin:auto;
}

.elforge_nav_compiler_v1_card{
    background:#ffffff;
    border-radius:28px;
    padding:28px;
    box-shadow:0 20px 60px rgba(0,0,0,0.08);
}

.elforge_nav_compiler_v1_topbar{
    display:flex;
    justify-content:space-between;
    align-items:center;
    flex-wrap:wrap;
    gap:15px;
    margin-bottom:20px;
}

.elforge_nav_compiler_v1_badge{
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

.elforge_nav_compiler_v1_compile_status{
    background:#ecfdf5;
    color:#065f46;
    padding:10px 16px;
    border-radius:14px;
    font-size:13px;
    font-weight:700;
}

.elforge_nav_compiler_v1_title{
    font-size:38px;
    font-weight:800;
    color:#111827;
    margin-bottom:12px;
}

.elforge_nav_compiler_v1_sub{
    color:#6b7280;
    line-height:1.8;
    font-size:15px;
    margin-bottom:30px;
    max-width:900px;
}

.elforge_nav_compiler_v1_toolbar{
    display:flex;
    flex-wrap:wrap;
    gap:12px;
    margin-bottom:25px;
}

.elforge_nav_compiler_v1_tool{
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

.elforge_nav_compiler_v1_tool:hover{
    transform:translateY(-2px);
    background:#dbeafe;
}

.elforge_nav_compiler_v1_grid{
    display:grid;
    grid-template-columns:1.1fr 0.9fr;
    gap:24px;
    margin-bottom:25px;
}

.elforge_nav_compiler_v1_box{
    background:#f8fafc;
    border-radius:22px;
    padding:22px;
}

.elforge_nav_compiler_v1_box_header{
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin-bottom:18px;
    gap:10px;
}

.elforge_nav_compiler_v1_label{
    font-size:15px;
    font-weight:800;
    color:#111827;
}

.elforge_nav_compiler_v1_small{
    font-size:12px;
    color:#6b7280;
}

.elforge_nav_compiler_v1_textarea{
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

.elforge_nav_compiler_v1_preview{
    background:#0f172a;
    border-radius:20px;
    padding:25px;
    min-height:620px;
    box-sizing:border-box;
    overflow:auto;
}

.elforge_nav_compiler_v1_sidebar{
    width:100%;
}

.elforge_nav_compiler_v1_menu_group{
    margin-bottom:22px;
}

.elforge_nav_compiler_v1_menu_title{
    display:flex;
    align-items:center;
    gap:12px;
    color:#f8fafc;
    font-weight:700;
    font-size:15px;
    padding:14px 16px;
    border-radius:14px;
    background:rgba(255,255,255,0.05);
    margin-bottom:10px;
}

.elforge_nav_compiler_v1_menu_items{
    padding-left:12px;
}

.elforge_nav_compiler_v1_menu_item{
    display:flex;
    align-items:center;
    gap:10px;
    padding:12px 14px;
    border-radius:12px;
    color:#cbd5e1;
    font-size:14px;
    margin-bottom:6px;
    transition:0.2s;
    cursor:pointer;
}

.elforge_nav_compiler_v1_menu_item:hover{
    background:rgba(255,255,255,0.06);
    color:#fff;
}

.elforge_nav_compiler_v1_single_link{
    display:flex;
    align-items:center;
    gap:12px;
    padding:15px 16px;
    border-radius:14px;
    color:#fff;
    background:#2563eb;
    font-weight:700;
    margin-bottom:15px;
}

.elforge_nav_compiler_v1_actions{
    display:flex;
    flex-wrap:wrap;
    gap:14px;
    justify-content:center;
    margin-bottom:25px;
}

.elforge_nav_compiler_v1_btn{
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

.elforge_nav_compiler_v1_btn:hover{
    transform:translateY(-2px);
}

.elforge_nav_compiler_v1_btn_generate{
    background:#111827;
}

.elforge_nav_compiler_v1_btn_copy{
    background:#2563eb;
}

.elforge_nav_compiler_v1_btn_download{
    background:#059669;
}

.elforge_nav_compiler_v1_btn_clear{
    background:#dc2626;
}

.elforge_nav_compiler_v1_output_tabs{
    display:flex;
    flex-wrap:wrap;
    gap:12px;
    margin-bottom:18px;
}

.elforge_nav_compiler_v1_tab{
    background:#e2e8f0;
    border-radius:12px;
    padding:10px 16px;
    font-size:13px;
    font-weight:700;
    color:#334155;
    cursor:pointer;
}

.elforge_nav_compiler_v1_tab_active{
    background:#111827;
    color:#fff;
}

.elforge_nav_compiler_v1_output{
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

.elforge_nav_compiler_v1_examples{
    margin-top:25px;
    background:#eef2ff;
    border-radius:22px;
    padding:24px;
}

.elforge_nav_compiler_v1_examples_title{
    font-size:16px;
    font-weight:800;
    color:#111827;
    margin-bottom:18px;
}

.elforge_nav_compiler_v1_code{
    display:block;
    background:#fff;
    border-radius:14px;
    padding:18px;
    margin-bottom:16px;
    overflow:auto;
    line-height:1.9;
    color:#111827;
    font-family:Consolas, monospace;
    font-size:13px;
}

@media(max-width:1100px){

    .elforge_nav_compiler_v1_grid{
        grid-template-columns:1fr;
    }

}

@media(max-width:768px){

    body{
        padding:15px;
    }

    .elforge_nav_compiler_v1_title{
        font-size:30px;
    }

    .elforge_nav_compiler_v1_actions{
        flex-direction:column;
    }

    .elforge_nav_compiler_v1_btn{
        width:100%;
        justify-content:center;
    }

    .elforge_nav_compiler_v1_topbar{
        flex-direction:column;
        align-items:flex-start;
    }

}

</style>
</head>
<body>

<div class="elforge_nav_compiler_v1_container">

    <div class="elforge_nav_compiler_v1_card">

        <!-- TOP -->

        <div class="elforge_nav_compiler_v1_topbar">

            <div class="elforge_nav_compiler_v1_badge">
                <i class="fa fa-code"></i>
                Elforge Navigation Compiler
            </div>

            <div class="elforge_nav_compiler_v1_compile_status">
                <i class="fa fa-check-circle"></i>
                12 Navigation Nodes Parsed
            </div>

        </div>

        <!-- TITLE -->

        <div class="elforge_nav_compiler_v1_title">
            Sidebar Navigation Generator
        </div>

        <div class="elforge_nav_compiler_v1_sub">
            Convert compact navigation DSL syntax into dynamic sidebar
            configuration arrays, live sidebar previews, and reusable
            navigation architecture.
        </div>

        <!-- TOOLBAR -->

        <div class="elforge_nav_compiler_v1_toolbar">

            <button class="elforge_nav_compiler_v1_tool">
                submenu
            </button>

            <button class="elforge_nav_compiler_v1_tool">
                link
            </button>

            <button class="elforge_nav_compiler_v1_tool">
                divider
            </button>

            <button class="elforge_nav_compiler_v1_tool">
                header
            </button>

        </div>

        <!-- GRID -->

        <div class="elforge_nav_compiler_v1_grid">

            <!-- INPUT -->

            <div class="elforge_nav_compiler_v1_box">

                <div class="elforge_nav_compiler_v1_box_header">

                    <div class="elforge_nav_compiler_v1_label">
                        Navigation DSL Input
                    </div>

                    <div class="elforge_nav_compiler_v1_small">
                        Elforge Syntax
                    </div>

                </div>

<textarea
class="elforge_nav_compiler_v1_textarea"
placeholder="Type navigation syntax here..."
>

link|cms|fa fa-home|dashboard/main|Dashboard

link|cms|fa fa-user-plus|clients/profile|Create account

link|cms|fa fa-users|clients/list|Client list

link|cms|fa fa-bolt|accrenewals/list|Renewals

link|cms|fa fa-credit-card|transactions/list|Payments

submenu|cms|fa fa-gear|Settings|clientlist/list=Client List
clientlist/profile=System users
clientlist/import=Import Clients

</textarea>

            </div>

            <!-- PREVIEW -->

            <div class="elforge_nav_compiler_v1_box">

                <div class="elforge_nav_compiler_v1_box_header">

                    <div class="elforge_nav_compiler_v1_label">
                        Live Sidebar Preview
                    </div>

                    <div class="elforge_nav_compiler_v1_small">
                        Real Time Architecture
                    </div>

                </div>

                <div class="elforge_nav_compiler_v1_preview">

                    <div class="elforge_nav_compiler_v1_sidebar">

                        <!-- GROUP -->

                        <div class="elforge_nav_compiler_v1_menu_group">

                            <div class="elforge_nav_compiler_v1_menu_title">
                                <i class="fa fa-cube"></i>
                                Inventory
                            </div>

                            <div class="elforge_nav_compiler_v1_menu_items">

                                <div class="elforge_nav_compiler_v1_menu_item">
                                    <i class="fa fa-circle"></i>
                                    Add Item
                                </div>

                                <div class="elforge_nav_compiler_v1_menu_item">
                                    <i class="fa fa-circle"></i>
                                    All Items
                                </div>

                                <div class="elforge_nav_compiler_v1_menu_item">
                                    <i class="fa fa-circle"></i>
                                    Products List
                                </div>

                                <div class="elforge_nav_compiler_v1_menu_item">
                                    <i class="fa fa-circle"></i>
                                    Service List
                                </div>

                            </div>

                        </div>

                        <!-- GROUP -->

                        <div class="elforge_nav_compiler_v1_menu_group">

                            <div class="elforge_nav_compiler_v1_menu_title">
                                <i class="fa fa-users"></i>
                                Customers
                            </div>

                            <div class="elforge_nav_compiler_v1_menu_items">

                                <div class="elforge_nav_compiler_v1_menu_item">
                                    <i class="fa fa-circle"></i>
                                    Client List
                                </div>

                                <div class="elforge_nav_compiler_v1_menu_item">
                                    <i class="fa fa-circle"></i>
                                    Add Customer
                                </div>

                                <div class="elforge_nav_compiler_v1_menu_item">
                                    <i class="fa fa-circle"></i>
                                    Import Clients
                                </div>

                            </div>

                        </div>

                        <!-- LINK -->

                        <div class="elforge_nav_compiler_v1_single_link">

                            <i class="fa fa-plus-circle"></i>

                            Create Invoice

                        </div>

                    </div>

                </div>

            </div>

        </div>

        <!-- ACTIONS -->

        <div class="elforge_nav_compiler_v1_actions">

            <button
                class="elforge_nav_compiler_v1_btn elforge_nav_compiler_v1_btn_generate"
            >
                <i class="fa fa-bolt"></i>
                Generate Navigation
            </button>

            <button
                class="elforge_nav_compiler_v1_btn elforge_nav_compiler_v1_btn_copy"
            >
                <i class="fa fa-copy"></i>
                Copy Output
            </button>

            <button
                class="elforge_nav_compiler_v1_btn elforge_nav_compiler_v1_btn_download"
            >
                <i class="fa fa-download"></i>
                Download Config
            </button>

            <button
                class="elforge_nav_compiler_v1_btn elforge_nav_compiler_v1_btn_clear"
            >
                <i class="fa fa-trash"></i>
                Clear
            </button>

        </div>

        <!-- OUTPUT -->

        <div class="elforge_nav_compiler_v1_box">

            <div class="elforge_nav_compiler_v1_box_header">

                <div class="elforge_nav_compiler_v1_label">
                    Generated Sidebar Config
                </div>

                <div class="elforge_nav_compiler_v1_small">
                    React / Next.js Output
                </div>

            </div>

            <!-- TABS -->

            <div class="elforge_nav_compiler_v1_output_tabs">

                <div class="elforge_nav_compiler_v1_tab elforge_nav_compiler_v1_tab_active">
                    React
                </div>

                <div class="elforge_nav_compiler_v1_tab">
                    PHP
                </div>

                <div class="elforge_nav_compiler_v1_tab">
                    JSON
                </div>

                <div class="elforge_nav_compiler_v1_tab">
                    Preview
                </div>

            </div>

            <!-- OUTPUT -->

            <div class="elforge_nav_compiler_v1_output">

// Generated sidebar configuration will appear here...

export const sidebarConfig = [

    {
        type: "submenu",
        label: "Inventory",
        icon: "fa fa-cube",
        items: [
            {
                label: "Add Item"
            }
        ]
    }

];

            </div>

        </div>

        <!-- EXAMPLES -->

        <div class="elforge_nav_compiler_v1_examples">

            <div class="elforge_nav_compiler_v1_examples_title">
                Navigation DSL Examples
            </div>

            <span class="elforge_nav_compiler_v1_code">

submenu|cms|fa fa-users|Customers|<br>
clientlist/list=Client List,<br>
clientlist/profile=Add Customer,<br>
clientlist/import=Import Clients<br>

            </span>

            <span class="elforge_nav_compiler_v1_code">

link|nextinvoice|fa fa-plus-circle|
docs/invoiceprofile|Create Invoice

            </span>

        </div>

    </div>

</div>
<script>

/*
|--------------------------------------------------------------------------
| STORAGE
|--------------------------------------------------------------------------
*/

const navCompilerStorageKey =
    "elforge_navigation_compiler_v1";

/*
|--------------------------------------------------------------------------
| ELEMENTS
|--------------------------------------------------------------------------
*/

const navInput =
    document.querySelector(
        ".elforge_nav_compiler_v1_textarea"
    );

const navOutput =
    document.querySelector(
        ".elforge_nav_compiler_v1_output"
    );

const navPreview =
    document.querySelector(
        ".elforge_nav_compiler_v1_sidebar"
    );

const compileStatus =
    document.querySelector(
        ".elforge_nav_compiler_v1_compile_status"
    );

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
                navCompilerStorageKey
            );

        if(saved){

            navInput.value = saved;

        }

        generateNavigationConfig();

    }
);

/*
|--------------------------------------------------------------------------
| AUTO SAVE
|--------------------------------------------------------------------------
*/

navInput.addEventListener(
    "input",
    function(){

        localStorage.setItem(
            navCompilerStorageKey,
            navInput.value
        );

        generateNavigationConfig();

    }
);

/*
|--------------------------------------------------------------------------
| GENERATE CONFIG
|--------------------------------------------------------------------------
*/

function generateNavigationConfig()
{

    const rawInput =
        navInput.value;

    /*
    |--------------------------------------------------------------------------
    | SPLIT BLOCKS
    |--------------------------------------------------------------------------
    */

    const blocks =
        rawInput
        .split(/\n\s*\n/)
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

    const finalConfig = [];

    let previewHTML = "";

    let nodeCount = 0;

    /*
    |--------------------------------------------------------------------------
    | LOOP BLOCKS
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
        | HEADER
        |--------------------------------------------------------------------------
        */

        const header =
            lines[0];

        const headerParts =
            header.split("|");

        const type =
            (headerParts[0] || "")
            .trim();

        /*
        |--------------------------------------------------------------------------
        | SUBMENU
        |--------------------------------------------------------------------------
        */

        if(type === "submenu")
        {

            const routeKey =
                (headerParts[1] || "")
                .trim();

            const icon =
                (headerParts[2] || "")
                .trim();

            const title =
                (headerParts[3] || "")
                .trim();

            const items = [];

            let itemsString = "";

            let previewItems = "";

            /*
            |--------------------------------------------------------------------------
            | ITEMS
            |--------------------------------------------------------------------------
            */

            lines.slice(1).forEach(function(line){

                line =
                    line.replace(/,$/, "");

                const splitItem =
                    line.split("=");

                const path =
                    (splitItem[0] || "")
                    .trim();

                const label =
                    (splitItem[1] || "")
                    .trim();

                if(!path || !label){

                    return;

                }

                items.push({
                    label:label,
                    path:path
                });

                nodeCount++;

                itemsString +=
`      { label: "${label}", href: (routes) => \`${"${routes."+routeKey+"}"}\/${path}\`, roles: [] },\n`;

                previewItems +=
`
<div class="elforge_nav_compiler_v1_menu_item">
    <i class="fa fa-circle"></i>
    ${label}
</div>
`;

            });

            /*
            |--------------------------------------------------------------------------
            | CONFIG
            |--------------------------------------------------------------------------
            */

            finalConfig.push(
`  {
    type: "submenu",
    label: "${title}",
    icon: "${icon}",
    roles: [],
    items: [
${itemsString}    ],
  }`
            );

            /*
            |--------------------------------------------------------------------------
            | PREVIEW
            |--------------------------------------------------------------------------
            */

            previewHTML +=
`
<div class="elforge_nav_compiler_v1_menu_group">

    <div class="elforge_nav_compiler_v1_menu_title">
        <i class="${icon}"></i>
        ${title}
    </div>

    <div class="elforge_nav_compiler_v1_menu_items">
        ${previewItems}
    </div>

</div>
`;

        }

        /*
        |--------------------------------------------------------------------------
        | SINGLE LINK
        |--------------------------------------------------------------------------
        */

        else if(type === "link")
        {

            const routeKey =
                (headerParts[1] || "")
                .trim();

            const icon =
                (headerParts[2] || "")
                .trim();

            const path =
                (headerParts[3] || "")
                .trim();

            const label =
                (headerParts[4] || "")
                .trim();

            if(
                !routeKey ||
                !icon ||
                !path ||
                !label
            ){

                return;

            }

            nodeCount++;

            /*
            |--------------------------------------------------------------------------
            | CONFIG
            |--------------------------------------------------------------------------
            */

            finalConfig.push(
`  {
    type: "link",
    label: "${label}",
    icon: "${icon}",
    href: (routes) => \`${"${routes."+routeKey+"}"}\/${path}\`,
    roles: []
  }`
            );

            /*
            |--------------------------------------------------------------------------
            | PREVIEW
            |--------------------------------------------------------------------------
            */

            previewHTML +=
`
<div class="elforge_nav_compiler_v1_single_link">

    <i class="${icon}"></i>

    ${label}

</div>
`;

        }

    });

    /*
    |--------------------------------------------------------------------------
    | FINAL OUTPUT
    |--------------------------------------------------------------------------
    */

    const finalString =
`// sidebarConfigPOS.js

export const sidebarConfig = [

${finalConfig.join(",\n\n")}

];
`;

    /*
    |--------------------------------------------------------------------------
    | OUTPUT
    |--------------------------------------------------------------------------
    */

    navOutput.innerText =
        finalString;

    /*
    |--------------------------------------------------------------------------
    | PREVIEW
    |--------------------------------------------------------------------------
    */

    navPreview.innerHTML =
        previewHTML;

    /*
    |--------------------------------------------------------------------------
    | STATUS
    |--------------------------------------------------------------------------
    */

    compileStatus.innerHTML =
`
<i class="fa fa-check-circle"></i>
${nodeCount} Navigation Nodes Parsed
`;

}

/*
|--------------------------------------------------------------------------
| COPY
|--------------------------------------------------------------------------
*/

function copyNavigationOutput()
{

    navigator.clipboard.writeText(
        navOutput.innerText
    );

    alert(
        "Sidebar config copied successfully."
    );

}

/*
|--------------------------------------------------------------------------
| DOWNLOAD
|--------------------------------------------------------------------------
*/

function downloadNavigationOutput()
{

    const output =
        navOutput.innerText;

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

    a.href = url;

    a.download =
        "sidebarConfigPOS.js";

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

function clearNavigationCompiler()
{

    navInput.value = "";

    localStorage.removeItem(
        navCompilerStorageKey
    );

    generateNavigationConfig();

}

/*
|--------------------------------------------------------------------------
| BUTTON EVENTS
|--------------------------------------------------------------------------
*/

document
.querySelector(
    ".elforge_nav_compiler_v1_btn_generate"
)
.addEventListener(
    "click",
    generateNavigationConfig
);

document
.querySelector(
    ".elforge_nav_compiler_v1_btn_copy"
)
.addEventListener(
    "click",
    copyNavigationOutput
);

document
.querySelector(
    ".elforge_nav_compiler_v1_btn_download"
)
.addEventListener(
    "click",
    downloadNavigationOutput
);

document
.querySelector(
    ".elforge_nav_compiler_v1_btn_clear"
)
.addEventListener(
    "click",
    clearNavigationCompiler
);

/*
|--------------------------------------------------------------------------
| AUTO START
|--------------------------------------------------------------------------
*/

generateNavigationConfig();

</script>
</body>
</html>