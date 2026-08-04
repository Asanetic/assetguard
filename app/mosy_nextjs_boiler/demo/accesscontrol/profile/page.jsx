import { Suspense } from 'react';

import SystemmodulemanifestProfile from '../uiControl/SystemmodulemanifestProfile';

import { InteprateSystemmodulemanifestEvent } from '../dataControl/SystemmodulemanifestRequestHandler';

import { hiveRoutes } from '../../../appConfigs/hiveRoutes';

export async function generateMetadata({ searchParams }) {
  const mosyTitle = "System Module Manifest "//searchParams?.mosyTitle || "System Module Manifest";

  return {
    title: mosyTitle ? decodeURIComponent(mosyTitle) : `System Module Manifest`,
    description: 'octanev4 System Module Manifest',
    
    icons: {
      icon: `${hiveRoutes.hiveBaseRoute}/logo.png`
    },    
  };
}    
                      

export default function SystemmodulemanifestMainProfilePage() {

   return (
     <>
       <div className="main-wrapper">
          <div className="page-wrapper">
             <div className="content container-fluid p-0 m-0 ">
               <Suspense fallback={<div className="col-md-12 p-5 text-center h3">Loading...</div>}>
                 <SystemmodulemanifestProfile 
                    dataIn={{ parentUseEffectKey: "initSystemmodulemanifestProfile" }} 
                                           
                    dataOut={{
                       setChildDataOut: InteprateSystemmodulemanifestEvent
                    }}   
                    
                 />
               </Suspense>
             </div>
           </div>
         </div>
       </>
     );
}