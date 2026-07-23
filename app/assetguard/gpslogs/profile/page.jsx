import { Suspense } from 'react';

import GpsLogsProfile from '../uiControl/GpsLogsProfile';

import { InteprateGpsLogsEvent } from '../dataControl/GpsLogsRequestHandler';

import { hiveRoutes } from '../../../appConfigs/hiveRoutes';

export async function generateMetadata({ searchParams }) {
  const mosyTitle = "Gps Logs "//searchParams?.mosyTitle || "Gps Logs";

  return {
    title: mosyTitle ? decodeURIComponent(mosyTitle) : `Gps Logs`,
    description: 'assetguard Gps Logs',
    
    icons: {
      icon: `${hiveRoutes.hiveBaseRoute}/logo.png`
    },    
  };
}    
                      

export default function GpsLogsMainProfilePage() {

   return (
     <>
       <div className="main-wrapper">
          <div className="page-wrapper">
             <div className="content container-fluid p-0 m-0 ">
               <Suspense fallback={<div className="col-md-12 p-5 text-center h3">Loading...</div>}>
                 <GpsLogsProfile 
                    dataIn={{ parentUseEffectKey: "initGpsLogsProfile" }} 
                                           
                    dataOut={{
                       setChildDataOut: InteprateGpsLogsEvent
                    }}   
                    
                 />
               </Suspense>
             </div>
           </div>
         </div>
       </>
     );
}