

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
        .replace(/'/g, "\\\\'");

    

const clients_countQ = {
    tbl:'clients',
    colstr:btoa(`COUNT(*) as value`),
    q:btoa(`
        WHERE clients.hive_site_id='${safeHiveSiteId}'
    `)
};




const leads_count_lead_status_qualifiedQ = {
    tbl:'leads',
    colstr:btoa(`COUNT(*) as value`),
    q:btoa(`
        WHERE leads.hive_site_id='${safeHiveSiteId}'
    `)
};




const deals_count_deal_status_openQ = {
    tbl:'deals',
    colstr:btoa(`COUNT(*) as value`),
    q:btoa(`
        WHERE deals.hive_site_id='${safeHiveSiteId}'
    `)
};




const payments_sum_amount_paidQ = {
    tbl:'payments',
    colstr:btoa(`COALESCE(SUM(amount_paid),0) as value`),
    q:btoa(`
        WHERE payments.hive_site_id='${safeHiveSiteId}'
    `)
};




const invoices_count_invoice_status_pendingQ = {
    tbl:'invoices',
    colstr:btoa(`COUNT(*) as value`),
    q:btoa(`
        WHERE invoices.hive_site_id='${safeHiveSiteId}'
    `)
};




const tasks_count_task_status_pendingQ = {
    tbl:'tasks',
    colstr:btoa(`COUNT(*) as value`),
    q:btoa(`
        WHERE tasks.hive_site_id='${safeHiveSiteId}'
    `)
};




const products_count_product_status_activeQ = {
    tbl:'products',
    colstr:btoa(`COUNT(*) as value`),
    q:btoa(`
        WHERE products.hive_site_id='${safeHiveSiteId}'
    `)
};




const services_count_service_status_activeQ = {
    tbl:'services',
    colstr:btoa(`COUNT(*) as value`),
    q:btoa(`
        WHERE services.hive_site_id='${safeHiveSiteId}'
    `)
};




const monthly_deal_valueQ = {
    tbl:'deals',
    colstr:btoa(`
        DATE_FORMAT(created_at, '%Y-%m') as label,
        COALESCE(SUM(deal_value),0) as value
    `),
    q:btoa(`
        WHERE deals.hive_site_id='${safeHiveSiteId}'
        
GROUP BY label
ORDER BY label ASC

    `)
};




const deal_status_breakdownQ = {
    tbl:'deals',
    colstr:btoa(`
        deal_status as label,
        COUNT(*) as value
    `),
    q:btoa(`
        WHERE deals.hive_site_id='${safeHiveSiteId}'
        
GROUP BY label
ORDER BY value DESC

    `)
};




const pipeline_stage_distributionQ = {
    tbl:'deals',
    colstr:btoa(`
        pipeline_stage as label,
        COUNT(*) as value
    `),
    q:btoa(`
        WHERE deals.hive_site_id='${safeHiveSiteId}'
        
GROUP BY label
ORDER BY value DESC

    `)
};




const monthly_lead_growthQ = {
    tbl:'leads',
    colstr:btoa(`
        DATE_FORMAT(created_at, '%Y-%m') as label,
        COUNT(*) as value
    `),
    q:btoa(`
        WHERE leads.hive_site_id='${safeHiveSiteId}'
        
GROUP BY label
ORDER BY label ASC

    `)
};




const lead_temperature_breakdownQ = {
    tbl:'leads',
    colstr:btoa(`
        lead_temperature as label,
        COUNT(*) as value
    `),
    q:btoa(`
        WHERE leads.hive_site_id='${safeHiveSiteId}'
        
GROUP BY label
ORDER BY value DESC

    `)
};




const clients_by_industryQ = {
    tbl:'clients',
    colstr:btoa(`
        industry_type as label,
        COUNT(*) as value
    `),
    q:btoa(`
        WHERE clients.hive_site_id='${safeHiveSiteId}'
        
GROUP BY label
ORDER BY value DESC

    `)
};




const monthly_revenueQ = {
    tbl:'payments',
    colstr:btoa(`
        DATE_FORMAT(paid_on, '%Y-%m') as label,
        COALESCE(SUM(amount_paid),0) as value
    `),
    q:btoa(`
        WHERE payments.hive_site_id='${safeHiveSiteId}'
        
GROUP BY label
ORDER BY label ASC

    `)
};




const payment_status_breakdownQ = {
    tbl:'payments',
    colstr:btoa(`
        payment_status as label,
        COUNT(*) as value
    `),
    q:btoa(`
        WHERE payments.hive_site_id='${safeHiveSiteId}'
        
GROUP BY label
ORDER BY value DESC

    `)
};




const revenue_by_payment_methodQ = {
    tbl:'payments',
    colstr:btoa(`
        payment_method as label,
        COALESCE(SUM(amount_paid),0) as value
    `),
    q:btoa(`
        WHERE payments.hive_site_id='${safeHiveSiteId}'
        
GROUP BY label
ORDER BY value DESC

    `)
};




const task_status_breakdownQ = {
    tbl:'tasks',
    colstr:btoa(`
        task_status as label,
        COUNT(*) as value
    `),
    q:btoa(`
        WHERE tasks.hive_site_id='${safeHiveSiteId}'
        
GROUP BY label
ORDER BY value DESC

    `)
};




const task_priority_distributionQ = {
    tbl:'tasks',
    colstr:btoa(`
        task_priority as label,
        COUNT(*) as value
    `),
    q:btoa(`
        WHERE tasks.hive_site_id='${safeHiveSiteId}'
        
GROUP BY label
ORDER BY value DESC

    `)
};




const monthly_activitiesQ = {
    tbl:'activities',
    colstr:btoa(`
        DATE_FORMAT(activity_date, '%Y-%m') as label,
        COUNT(*) as value
    `),
    q:btoa(`
        WHERE activities.hive_site_id='${safeHiveSiteId}'
        
GROUP BY label
ORDER BY label ASC

    `)
};



    const [
        clients_countRes,
leads_count_lead_status_qualifiedRes,
deals_count_deal_status_openRes,
payments_sum_amount_paidRes,
invoices_count_invoice_status_pendingRes,
tasks_count_task_status_pendingRes,
products_count_product_status_activeRes,
services_count_service_status_activeRes,
monthly_deal_valueRes,
deal_status_breakdownRes,
pipeline_stage_distributionRes,
monthly_lead_growthRes,
lead_temperature_breakdownRes,
clients_by_industryRes,
monthly_revenueRes,
payment_status_breakdownRes,
revenue_by_payment_methodRes,
task_status_breakdownRes,
task_priority_distributionRes,
monthly_activitiesRes
    ] = await Promise.all([
        mosyFlexSelect(clients_countQ),
mosyFlexSelect(leads_count_lead_status_qualifiedQ),
mosyFlexSelect(deals_count_deal_status_openQ),
mosyFlexSelect(payments_sum_amount_paidQ),
mosyFlexSelect(invoices_count_invoice_status_pendingQ),
mosyFlexSelect(tasks_count_task_status_pendingQ),
mosyFlexSelect(products_count_product_status_activeQ),
mosyFlexSelect(services_count_service_status_activeQ),
mosyFlexSelect(monthly_deal_valueQ),
mosyFlexSelect(deal_status_breakdownQ),
mosyFlexSelect(pipeline_stage_distributionQ),
mosyFlexSelect(monthly_lead_growthQ),
mosyFlexSelect(lead_temperature_breakdownQ),
mosyFlexSelect(clients_by_industryQ),
mosyFlexSelect(monthly_revenueQ),
mosyFlexSelect(payment_status_breakdownQ),
mosyFlexSelect(revenue_by_payment_methodQ),
mosyFlexSelect(task_status_breakdownQ),
mosyFlexSelect(task_priority_distributionQ),
mosyFlexSelect(monthly_activitiesQ)
    ]);

    const cardsData = [
        

{
    title:'Total Clients',
    value:`${toNum(clients_countRes?.data?.[0]?.value || 0, 0)}`,
    percentage:'',
    icon:'FaUsers'
}

,

{
    title:'Qualified Leads',
    value:`${toNum(leads_count_lead_status_qualifiedRes?.data?.[0]?.value || 0, 0)}`,
    percentage:'',
    icon:'FaUserCheck'
}

,

{
    title:'Open Deals',
    value:`${toNum(deals_count_deal_status_openRes?.data?.[0]?.value || 0, 0)}`,
    percentage:'',
    icon:'FaBriefcase'
}

,

{
    title:'Total Revenue',
    value:`${toNum(payments_sum_amount_paidRes?.data?.[0]?.value || 0, 0)}`,
    percentage:'',
    icon:'FaMoneyBillWave'
}

,

{
    title:'Pending Invoices',
    value:`${toNum(invoices_count_invoice_status_pendingRes?.data?.[0]?.value || 0, 0)}`,
    percentage:'',
    icon:'FaFileInvoiceDollar'
}

,

{
    title:'Pending Tasks',
    value:`${toNum(tasks_count_task_status_pendingRes?.data?.[0]?.value || 0, 0)}`,
    percentage:'',
    icon:'FaTasks'
}

,

{
    title:'Active Products',
    value:`${toNum(products_count_product_status_activeRes?.data?.[0]?.value || 0, 0)}`,
    percentage:'',
    icon:'FaCube'
}

,

{
    title:'Active Services',
    value:`${toNum(services_count_service_status_activeRes?.data?.[0]?.value || 0, 0)}`,
    percentage:'',
    icon:'FaCogs'
}


    ];

    const chartData = [
        

{
    title:'Monthly Deal Value',
    chartType:'bar',
    dataKey:'label',
    data:monthly_deal_valueRes?.data ?? [],
    series:[
        {
            key:'value',
            color:'#661238',
            name:'Value'
        }
    ],
    height:350,
    containerClass:'col-md-6'}

,

{
    title:'Deal Status Breakdown',
    chartType:'pie',
    dataKey:'label',
    data:deal_status_breakdownRes?.data ?? [],
    series:[
        {
            key:'value',
            color:'#661238',
            name:'Value'
        }
    ],
    height:350,
    containerClass:'col-md-6'}

,

{
    title:'Pipeline Stage Distribution',
    chartType:'bar',
    dataKey:'label',
    data:pipeline_stage_distributionRes?.data ?? [],
    series:[
        {
            key:'value',
            color:'#661238',
            name:'Value'
        }
    ],
    height:350,
    containerClass:'col-md-6'}

,

{
    title:'Monthly Lead Growth',
    chartType:'line',
    dataKey:'label',
    data:monthly_lead_growthRes?.data ?? [],
    series:[
        {
            key:'value',
            color:'#661238',
            name:'Value'
        }
    ],
    height:350,
    containerClass:'col-md-6'}

,

{
    title:'Lead Temperature Breakdown',
    chartType:'pie',
    dataKey:'label',
    data:lead_temperature_breakdownRes?.data ?? [],
    series:[
        {
            key:'value',
            color:'#661238',
            name:'Value'
        }
    ],
    height:350,
    containerClass:'col-md-6'}

,

{
    title:'Clients By Industry',
    chartType:'bar',
    dataKey:'label',
    data:clients_by_industryRes?.data ?? [],
    series:[
        {
            key:'value',
            color:'#661238',
            name:'Value'
        }
    ],
    height:350,
    containerClass:'col-md-6'}

,

{
    title:'Monthly Revenue',
    chartType:'bar',
    dataKey:'label',
    data:monthly_revenueRes?.data ?? [],
    series:[
        {
            key:'value',
            color:'#661238',
            name:'Value'
        }
    ],
    height:350,
    containerClass:'col-md-6'}

,

{
    title:'Payment Status Breakdown',
    chartType:'pie',
    dataKey:'label',
    data:payment_status_breakdownRes?.data ?? [],
    series:[
        {
            key:'value',
            color:'#661238',
            name:'Value'
        }
    ],
    height:350,
    containerClass:'col-md-6'}

,

{
    title:'Revenue By Payment Method',
    chartType:'bar',
    dataKey:'label',
    data:revenue_by_payment_methodRes?.data ?? [],
    series:[
        {
            key:'value',
            color:'#661238',
            name:'Value'
        }
    ],
    height:350,
    containerClass:'col-md-6'}

,

{
    title:'Task Status Breakdown',
    chartType:'pie',
    dataKey:'label',
    data:task_status_breakdownRes?.data ?? [],
    series:[
        {
            key:'value',
            color:'#661238',
            name:'Value'
        }
    ],
    height:350,
    containerClass:'col-md-6'}

,

{
    title:'Task Priority Distribution',
    chartType:'bar',
    dataKey:'label',
    data:task_priority_distributionRes?.data ?? [],
    series:[
        {
            key:'value',
            color:'#661238',
            name:'Value'
        }
    ],
    height:350,
    containerClass:'col-md-6'}

,

{
    title:'Monthly Activities',
    chartType:'line',
    dataKey:'label',
    data:monthly_activitiesRes?.data ?? [],
    series:[
        {
            key:'value',
            color:'#661238',
            name:'Value'
        }
    ],
    height:350,
    containerClass:'col-md-6'}


    ];

    const gridData = [
        
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

