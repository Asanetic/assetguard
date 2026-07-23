import { Suspense } from 'react';

import PageManifestProfile from '../uiControl/PageManifestProfile';

import { IntepratePageManifestEvent } from '../dataControl/PageManifestRequestHandler';

import { hiveRoutes } from '../../../appConfigs/hiveRoutes';

export async function generateMetadata({ searchParams }) {
  const mosyTitle = "Page Manifest  "//searchParams?.mosyTitle || "Page Manifest ";

  return {
    title: mosyTitle ? decodeURIComponent(mosyTitle) : `Page Manifest `,
    description: 'assetguard Page Manifest ',
    
    icons: {
      icon: `${hiveRoutes.hiveBaseRoute}/logo.png`
    },    
  };
}    
                      

export default function PageManifestMainProfilePage() {

   return (
     <>
       <div className="main-wrapper">
          <div className="page-wrapper">
             <div className="content container-fluid p-0 m-0 ">
               <Suspense fallback={<div className="col-md-12 p-5 text-center h3">Loading...</div>}>
                 <PageManifestProfile 
                    dataIn={{ parentUseEffectKey: "initPageManifestProfile" }} 
                                           
                    dataOut={{
                       setChildDataOut: IntepratePageManifestEvent
                    }}   
                    
                 />
               </Suspense>
             </div>
           </div>
         </div>
       </>
     );
}