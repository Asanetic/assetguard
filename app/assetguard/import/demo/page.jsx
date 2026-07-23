import { Suspense } from 'react';

import ImportCSVComponent from '../uploadData';
import { hiveRoutes } from '../../../appConfigs/hiveRoutes';

import { getApiRoutes } from '../../AppRoutes/apiRoutesHandler';

const apiRoutes = getApiRoutes()

export async function generateMetadata({ searchParams }) {
  const mosyTitle = "Upload expenses data"//searchParams?.mosyTitle || "Daily Sales Temp";

  return {
    title: mosyTitle ,
    description: 'Import csv data',
    
    icons: {
        icon: `${hiveRoutes.hiveBaseRoute}/logo.png`
    },    
  };
}
                      

export default function UploadCsvPage() {

   const  colsArray =  ["expense_date",	"expense_type",	"expense_name",	"amount",	"remark",	"station_code",	"station_name"]

   return (
     <>
       <div className="main-wrapper">
          <div className="page-wrapper">
             <div className="content container-fluid p-0 m-0 ">
              <div className='p-3'>
               <Suspense fallback={<div className="col-md-12 p-5 text-center h3">Loading...</div>}>
               <ImportCSVComponent colsArray={colsArray} title='Upload expenses data' endpoint={``} templateName='octane_expenses_template.csv'/>
              </Suspense>
            </div>
             </div>
           </div>
         </div>
       </>
     );
}