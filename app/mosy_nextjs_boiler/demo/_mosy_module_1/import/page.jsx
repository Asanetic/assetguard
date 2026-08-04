import { Suspense } from 'react';

import ImportCSVComponent from '../../import/uploadData';
import { hiveRoutes } from '../../../appConfigs/hiveRoutes';

import { getApiRoutes } from '../../AppRoutes/apiRoutesHandler';
import { Templatev1Schema } from '../schema';

const apiRoutes = getApiRoutes()

export async function generateMetadata({ searchParams }) {
  const mosyTitle = 'Import Templatev1 data ';

  return {
    title: mosyTitle ,
    description: 'Import csv data',
    
    icons: {
        icon: `${hiveRoutes.hiveBaseRoute}/logo.png`
    },    
  };
}
                      

export default function UploadCsvPage() {

   const colsArray = ['primkey','record_id','user_id','name','email','telephone','login_password','reference_id','registered_on','user_number','user_profile_photo','gender','last_seen','about','authentication_token','token_status','token_expires_in','project_id','project_name','created_at','updated_at','hive_site_id','hive_site_name']

   return (
     <>
       <div className='main-wrapper'>
          <div className='page-wrapper'>
             <div className='content container-fluid p-0 m-0'>
              <div className='p-3'>
               <Suspense fallback={<div className='col-md-12 p-5 text-center h3'>Loading...</div>}>
               <ImportCSVComponent colsArray={colsArray} title='Import Templatev1 data ' endpoint={apiRoutes.templatev1.import} templateName='import_system_users_data__template.csv'/>
              </Suspense>
            </div>
             </div>
           </div>
         </div>
       </>
     );
}