import { Suspense } from 'react';

import SystemRoleBundlesProfile from '../uiControl/SystemRoleBundlesProfile';

import { InteprateSystemRoleBundlesEvent } from '../dataControl/SystemRoleBundlesRequestHandler';

import { hiveRoutes } from '../../../appConfigs/hiveRoutes';

export async function generateMetadata({ searchParams }) {
  const mosyTitle = "System Role Bundles "//searchParams?.mosyTitle || "System Role Bundles";

  return {
    title: mosyTitle ? decodeURIComponent(mosyTitle) : `System Role Bundles`,
    description: 'assetguard System Role Bundles',
    
    icons: {
      icon: `${hiveRoutes.hiveBaseRoute}/logo.png`
    },    
  };
}    
                      

export default function SystemRoleBundlesMainProfilePage() {

   return (
     <>
       <div className="main-wrapper">
          <div className="page-wrapper">
             <div className="content container-fluid p-0 m-0 ">
               <Suspense fallback={<div className="col-md-12 p-5 text-center h3">Loading...</div>}>
                 <SystemRoleBundlesProfile 
                    dataIn={{ parentUseEffectKey: "initSystemRoleBundlesProfile" }} 
                                           
                    dataOut={{
                       setChildDataOut: InteprateSystemRoleBundlesEvent
                    }}   
                    
                 />
               </Suspense>
             </div>
           </div>
         </div>
       </>
     );
}