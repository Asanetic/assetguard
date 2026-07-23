<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>

<title>Dashboard Route Generator</title>

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"/>

<style>

body{
    margin:0;
    padding:30px;
    background:#f3f6fb;
    font-family:Arial, Helvetica, sans-serif;
}

.elforge_dashboard_v1_container{
    max-width:1400px;
    margin:auto;
}

.elforge_dashboard_v1_card{
    background:#ffffff;
    border-radius:24px;
    padding:30px;
    box-shadow:0 10px 40px rgba(0,0,0,0.08);
}

.elforge_dashboard_v1_header{
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:20px;
    flex-wrap:wrap;
    margin-bottom:25px;
}

.elforge_dashboard_v1_title{
    font-size:32px;
    font-weight:700;
    color:#111827;
}

.elforge_dashboard_v1_sub{
    margin-top:8px;
    color:#6b7280;
    font-size:15px;
}

.elforge_dashboard_v1_grid{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:25px;
}

.elforge_dashboard_v1_input_card,
.elforge_dashboard_v1_output_card{
    background:#f9fafb;
    border-radius:18px;
    padding:22px;
    border:1px solid #e5e7eb;
}

.elforge_dashboard_v1_section_title{
    font-size:18px;
    font-weight:700;
    margin-bottom:18px;
    color:#111827;
}

.elforge_dashboard_v1_textarea{
    width:100%;
    min-height:550px;
    border:none;
    outline:none;
    resize:vertical;
    background:#111827;
    color:#d1fae5;
    border-radius:16px;
    padding:20px;
    box-sizing:border-box;
    font-size:14px;
    line-height:1.8;
    font-family:Consolas, monospace;
}

.elforge_dashboard_v1_output{
    width:100%;
    min-height:550px;
    background:#0f172a;
    color:#d1fae5;
    border-radius:16px;
    padding:20px;
    box-sizing:border-box;
    overflow:auto;
    white-space:pre-wrap;
    font-size:14px;
    line-height:1.7;
    font-family:Consolas, monospace;
}

.elforge_dashboard_v1_actions{
    display:flex;
    flex-wrap:wrap;
    gap:14px;
    margin-top:22px;
}

.elforge_dashboard_v1_btn{
    border:none;
    border-radius:14px;
    padding:14px 22px;
    cursor:pointer;
    color:white;
    font-size:15px;
    font-weight:600;
    transition:0.2s;
}

.elforge_dashboard_v1_btn:hover{
    transform:translateY(-2px);
}

.elforge_dashboard_v1_btn_generate{
    background:#111827;
}

.elforge_dashboard_v1_btn_copy{
    background:#2563eb;
}

.elforge_dashboard_v1_btn_download{
    background:#059669;
}

.elforge_dashboard_v1_example{
    margin-top:22px;
    background:#eef2ff;
    border-radius:16px;
    padding:18px;
    color:#374151;
    font-size:14px;
    line-height:1.8;
}

.elforge_dashboard_v1_example_title{
    font-weight:700;
    margin-bottom:10px;
}

.elforge_dashboard_v1_badge_wrap{
    display:flex;
    gap:10px;
    flex-wrap:wrap;
    margin-top:15px;
}

.elforge_dashboard_v1_badge{
    background:#dbeafe;
    color:#1d4ed8;
    padding:8px 14px;
    border-radius:999px;
    font-size:13px;
    font-weight:600;
}

@media(max-width:1100px){

    .elforge_dashboard_v1_grid{
        grid-template-columns:1fr;
    }

}

</style>
</head>
<body>

<div class="elforge_dashboard_v1_container">

    <div class="elforge_dashboard_v1_card">

        <div class="elforge_dashboard_v1_header">

            <div>

                <div class="elforge_dashboard_v1_title">
                    Dashboard Route Generator
                </div>

                <div class="elforge_dashboard_v1_sub">
                    Generate Next.js dashboard route.js files using a simple DSL sequence.
                </div>

            </div>

        </div>

        <div class="elforge_dashboard_v1_grid">

            <!-- LEFT -->

            <div class="elforge_dashboard_v1_input_card">

                <div class="elforge_dashboard_v1_section_title">
                    Dashboard DSL Input
                </div>

                <textarea
                    id="dashboardInput"
                    class="elforge_dashboard_v1_textarea"
                    placeholder="Type dashboard DSL here..."
                >card|clients|count|*|Total Clients|FaUsers
card|transactions|sum|amount|Total Revenue|FaMoneyBill
card|acc_renewals|count|*|Renewals|FaRotate
card|daily_leads|count|*|Daily Leads|FaChartLine

chart|transactions|line|trx_date:month|sum|amount|Monthly Revenue
chart|acc_renewals|line|activated_on:month|sum|credits_deducted|Renewals by month
chart|clients|pie|client_type|count|*|Clients by Type|col-md-6
chart|daily_leads|line|lead_date:month|count|*|Lead Growth|col-md-6
</textarea>

                <div class="elforge_dashboard_v1_actions">

                    <button
                        class="elforge_dashboard_v1_btn elforge_dashboard_v1_btn_generate"
                        onclick="generateDashboardRoute()"
                    >
                        <i class="fa fa-bolt"></i>
                        Generate route.js
                    </button>

                    <button
                        class="elforge_dashboard_v1_btn elforge_dashboard_v1_btn_copy"
                        onclick="copyDashboardOutput()"
                    >
                        <i class="fa fa-copy"></i>
                        Copy Result
                    </button>

                    <button
                        class="elforge_dashboard_v1_btn elforge_dashboard_v1_btn_download"
                        onclick="downloadDashboardOutput()"
                    >
                        <i class="fa fa-download"></i>
                        Download route.js
                    </button>

                </div>

                <div class="elforge_dashboard_v1_example">

                    <div class="elforge_dashboard_v1_example_title">
                        DSL Format Examples
                    </div>

<pre>
card|table|metric|column|title|icon

chart|table|chartType|groupBy|metric|column|title

grid|table|latest|limit
</pre>

                    <div class="elforge_dashboard_v1_badge_wrap">

                        <div class="elforge_dashboard_v1_badge">
                            count
                        </div>

                        <div class="elforge_dashboard_v1_badge">
                            sum
                        </div>

                        <div class="elforge_dashboard_v1_badge">
                            line
                        </div>

                        <div class="elforge_dashboard_v1_badge">
                            pie
                        </div>

                        <div class="elforge_dashboard_v1_badge">
                            bar
                        </div>

                    </div>

                </div>

            </div>

            <!-- RIGHT -->

            <div class="elforge_dashboard_v1_output_card">

                <div class="elforge_dashboard_v1_section_title">
                    Generated route.js
                </div>

                <div
                    id="dashboardOutput"
                    class="elforge_dashboard_v1_output"
                ></div>

            </div>

        </div>

    </div>

</div>

<script>

/*
|--------------------------------------------------------------------------
| LOCAL STORAGE
|--------------------------------------------------------------------------
*/

const dashboardStorageKey =
    "elforge_dashboard_route_generator_v1";

/*
|--------------------------------------------------------------------------
| RESTORE
|--------------------------------------------------------------------------
*/

window.addEventListener("DOMContentLoaded", function(){

    const saved =
        localStorage.getItem(dashboardStorageKey);

    if(saved){

        document.getElementById("dashboardInput").value =
            saved;

    }

    generateDashboardRoute();

});

/*
|--------------------------------------------------------------------------
| AUTO SAVE
|--------------------------------------------------------------------------
*/

document.addEventListener("input", function(e){

    if(e.target.id === "dashboardInput"){

        localStorage.setItem(
            dashboardStorageKey,
            e.target.value
        );

    }

});

/*
|--------------------------------------------------------------------------
| GENERATE PLACEHOLDER
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| COPY
|--------------------------------------------------------------------------
*/

function copyDashboardOutput(){

    const output =
        document.getElementById("dashboardOutput")
        .innerText;

    navigator.clipboard.writeText(output)
    .then(function(){

        alert("route.js copied successfully");

    });

}

/*
|--------------------------------------------------------------------------
| DOWNLOAD
|--------------------------------------------------------------------------
*/

function downloadDashboardOutput(){

    const output =
        document.getElementById("dashboardOutput")
        .innerText;

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

    a.download = "route.js";

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    URL.revokeObjectURL(url);

}



</script>
<script>

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function cleanVarName(str){

    str = str.toLowerCase();

    str = str.replace(/[^a-z0-9]+/g, "_");

    return str.replace(/^_+|_+$/g, "");

}

/*
|--------------------------------------------------------------------------
| MAIN GENERATOR
|--------------------------------------------------------------------------
*/

function generateDashboardRoute(){

    const dsl =
        document.getElementById("dashboardInput").value;

    const lines =
        dsl
        .split("\n")
        .map(x => x.trim())
        .filter(x => x !== "");

    let queryBlocks = [];
    let promiseCalls = [];
    let responseVars = [];

    let cardItems = [];
    let chartItems = [];
    let gridItems = [];

    /*
    |--------------------------------------------------------------------------
    | PARSE DSL
    |--------------------------------------------------------------------------
    */

    lines.forEach(function(line){

        const parts =
            line.split("|");

        const type =
            (parts[0] || "").trim();

        /*
        |--------------------------------------------------------------------------
        | CARD
        |--------------------------------------------------------------------------
        */

        if(type === "card"){

            const table =
                (parts[1] || "").trim();

            const metric =
                (parts[2] || "").trim();

            const column =
                (parts[3] || "").trim();

            const title =
                (parts[4] || "").trim();

            const icon =
                (parts[5] || "").trim();

            const queryVar =
                cleanVarName(
                    table + "_" +
                    metric + "_" +
                    column
                ) + "Q";

            const resVar =
                cleanVarName(
                    table + "_" +
                    metric + "_" +
                    column
                ) + "Res";

            let select = "";

            /*
            |--------------------------------------------------------------------------
            | METRIC
            |--------------------------------------------------------------------------
            */

            if(metric === "count"){

                select =
                    "COUNT(*) as value";

            }else{

                select =
                    `COALESCE(${metric.toUpperCase()}(${column}),0) as value`;

            }

            /*
            |--------------------------------------------------------------------------
            | QUERY
            |--------------------------------------------------------------------------
            */

            queryBlocks.push(`

const ${queryVar} = {
    tbl:'${table}',
    colstr:btoa(\`${select}\`),
    q:btoa(\`
        WHERE ${table}.hive_site_id='$\{safeHiveSiteId\}'
    \`)
};

`);

            promiseCalls.push(
                `mosyFlexSelect(${queryVar})`
            );

            responseVars.push(resVar);

            /*
            |--------------------------------------------------------------------------
            | CARD UI
            |--------------------------------------------------------------------------
            */

cardItems.push(`

{
    title:'${title}',
    value:\`$\{toNum(${resVar}?.data?.[0]?.value || 0, 0)\}\`,
    percentage:'',
    icon:'${icon}'
}

`);

        }

        /*
        |--------------------------------------------------------------------------
        | CHART
        |--------------------------------------------------------------------------
        */

        if(type === "chart"){

            const table =
                (parts[1] || "").trim();

            const chartType =
                (parts[2] || "").trim();

            const groupBy =
                (parts[3] || "").trim();

            const metric =
                (parts[4] || "").trim();

            const column =
                (parts[5] || "").trim();

            const title =
                (parts[6] || "").trim();

            const containerClass =
                (parts[7] || "col-md-12").trim();
          
            const queryVar =
                cleanVarName(title) + "Q";

            const resVar =
                cleanVarName(title) + "Res";

            let groupSelect = "";
            let groupSql = "";

            /*
            |--------------------------------------------------------------------------
            | MONTH GROUPING
            |--------------------------------------------------------------------------
            */

            if(groupBy.includes(":month")){

                const realCol =
                    groupBy.split(":")[0];

                groupSelect =
                    `DATE_FORMAT(${realCol}, '%Y-%m') as label`;

                groupSql =
`
GROUP BY label
ORDER BY label ASC
`;

            }else{

                groupSelect =
                    `${groupBy} as label`;

                groupSql =
`
GROUP BY label
ORDER BY value DESC
`;

            }

            /*
            |--------------------------------------------------------------------------
            | METRIC
            |--------------------------------------------------------------------------
            */

            let metricSelect = "";

            if(metric === "count"){

                metricSelect =
                    `COUNT(*) as value`;

            }else{

                metricSelect =
                    `COALESCE(${metric.toUpperCase()}(${column}),0) as value`;

            }

            /*
            |--------------------------------------------------------------------------
            | QUERY
            |--------------------------------------------------------------------------
            */

            queryBlocks.push(`

const ${queryVar} = {
    tbl:'${table}',
    colstr:btoa(\`
        ${groupSelect},
        ${metricSelect}
    \`),
    q:btoa(\`
        WHERE ${table}.hive_site_id='$\{safeHiveSiteId\}'
        ${groupSql}
    \`)
};

`);

            promiseCalls.push(
                `mosyFlexSelect(${queryVar})`
            );

            responseVars.push(resVar);

            /*
            |--------------------------------------------------------------------------
            | CHART UI
            |--------------------------------------------------------------------------
            */

            chartItems.push(`

{
    title:'${title}',
    chartType:'${chartType}',
    dataKey:'label',
    data:${resVar}?.data ?? [],
    series:[
        {
            key:'value',
            color:'#661238',
            name:'Value'
        }
    ],
    height:350,
    containerClass:'${containerClass}'}

`);

        }

        /*
        |--------------------------------------------------------------------------
        | GRID
        |--------------------------------------------------------------------------
        */

        if(type === "grid"){

            const table =
                (parts[1] || "").trim();

            const mode =
                (parts[2] || "").trim();

            const limit =
                (parts[3] || "").trim();

            const queryVar =
                cleanVarName(table + "_grid") + "Q";

            const resVar =
                cleanVarName(table + "_grid") + "Res";

            queryBlocks.push(`

const ${queryVar} = {
    tbl:'${table}',
    colstr:btoa('*'),
    q:btoa(\`
        WHERE ${table}.hive_site_id='$\{safeHiveSiteId\}'
        ORDER BY primkey DESC
        LIMIT ${limit}
    \`)
};

`);

            promiseCalls.push(
                `mosyFlexSelect(${queryVar})`
            );

            responseVars.push(resVar);

            gridItems.push(`

{
    title:'Latest ${table}',
    data:${resVar}?.data ?? []
}

`);

        }

    });

    /*
    |--------------------------------------------------------------------------
    | FINAL ROUTE.JS
    |--------------------------------------------------------------------------
    */

    const finalJs = `

import { mosyFlexSelect, toNum } from '../../../apiUtils/dataControl/dataUtils';
import { processAuthToken } from '../../../auth/authManager';

export async function GET(request)
{
    const { valid:isTokenValid, reason:tokenError, data:authData } =
        processAuthToken(request);

    if(!isTokenValid)
    {
        return Response.json(
        {
            status:'unauthorized',
            message:tokenError
        },
        {
            status:403
        });
    }

    const safeHiveSiteId =
        String(authData.hive_site_id)
        .replace(/'/g, "\\\\\\\\'");

    ${queryBlocks.join("\n")}

    const [
        ${responseVars.join(",\n")}
    ] = await Promise.all([
        ${promiseCalls.join(",\n")}
    ]);

    const cardsData = [
        ${cardItems.join(",")}
    ];

    const chartData = [
        ${chartItems.join(",")}
    ];

    const gridData = [
        ${gridItems.join(",")}
    ];

    return Response.json(
    {
        status:'success',
        message:'Dashboard ready!',
        cards_data:cardsData,
        chart_data:chartData,
        grid_data:gridData
    });

}

`;

    /*
    |--------------------------------------------------------------------------
    | OUTPUT
    |--------------------------------------------------------------------------
    */

    document.getElementById("dashboardOutput")
        .innerText = finalJs;

}

/*
|--------------------------------------------------------------------------
| AUTO RUN
|--------------------------------------------------------------------------
*/

generateDashboardRoute();

</script>
</body>
</html>