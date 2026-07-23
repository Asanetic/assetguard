import { Suspense } from 'react';

import UserManifestProfile from '../uiControl/UserManifestProfile';

import { InteprateUserManifestEvent } from '../dataControl/UserManifestRequestHandler';

import { hiveRoutes } from '../../../appConfigs/hiveRoutes';

export async function generateMetadata({ searchParams }) {
  const mosyTitle = "User Manifest  "//searchParams?.mosyTitle || "User Manifest ";

  return {
    title: mosyTitle ? decodeURIComponent(mosyTitle) : `User Manifest `,
    description: 'assetguard User Manifest ',
    
    icons: {
      icon: `${hiveRoutes.hiveBaseRoute}/logo.png`
    },    
  };
}    
                      

export default function UserManifestMainProfilePage() {

   return (
     <>
       <div className="main-wrapper">
          <div className="page-wrapper">
             <div className="content container-fluid p-0 m-0 ">
               <Suspense fallback={<div className="col-md-12 p-5 text-center h3">Loading...</div>}>
                 <UserManifestProfile 
                    dataIn={{ parentUseEffectKey: "initUserManifestProfile" }} 
                                           
                    dataOut={{
                       setChildDataOut: InteprateUserManifestEvent
                    }}   
                    
                 />
               </Suspense>
             </div>
           </div>
         </div>
       </>
     );
}