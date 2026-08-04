import { Suspense } from 'react';

import ImportCSVComponent from '../../import/uploadData';
import { hiveRoutes } from '../../../appConfigs/hiveRoutes';

import { getApiRoutes } from '../../AppRoutes/apiRoutesHandler';

const apiRoutes = getApiRoutes()

export async function generateMetadata({ searchParams }) {
  const mosyTitle = 'Import User Bundle Role Functions data ';

  return {
    title: mosyTitle ,
    description: 'Import csv data',
    
    icons: {
        icon: `${hiveRoutes.hiveBaseRoute}/logo.png`
    },    
  };
}
                      

export default function UploadCsvPage() {

   const colsArray = ['primkey','record_id','bundle_id','bundle_name','role_id','role_name','remark','created_at','updated_at','hive_site_id','hive_site_name']

   return (
     <>
       <div className='main-wrapper'>
          <div className='page-wrapper'>
             <div className='content container-fluid p-0 m-0'>
              <div className='p-3'>
               <Suspense fallback={<div className='col-md-12 p-5 text-center h3'>Loading...</div>}>
               <ImportCSVComponent colsArray={colsArray} title='Import User Bundle Role Functions data ' endpoint={apiRoutes.userbundlerolefunctions.import} templateName='import_user_bundle_role_functions_data__template.csv'/>
              </Suspense>
            </div>
             </div>
           </div>
         </div>
       </>
     );
}