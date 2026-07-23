import { Suspense } from 'react';

import DevicePingsProfile from '../uiControl/DevicePingsProfile';

import { InteprateDevicePingsEvent } from '../dataControl/DevicePingsRequestHandler';

import { hiveRoutes } from '../../../appConfigs/hiveRoutes';

export async function generateMetadata({ searchParams }) {
  const mosyTitle = "Device Pings "//searchParams?.mosyTitle || "Device Pings";

  return {
    title: mosyTitle ? decodeURIComponent(mosyTitle) : `Device Pings`,
    description: 'assetguard Device Pings',
    
    icons: {
      icon: `${hiveRoutes.hiveBaseRoute}/logo.png`
    },    
  };
}    
                      

export default function DevicePingsMainProfilePage() {

   return (
     <>
       <div className="main-wrapper">
          <div className="page-wrapper">
             <div className="content container-fluid p-0 m-0 ">
               <Suspense fallback={<div className="col-md-12 p-5 text-center h3">Loading...</div>}>
                 <DevicePingsProfile 
                    dataIn={{ parentUseEffectKey: "initDevicePingsProfile" }} 
                                           
                    dataOut={{
                       setChildDataOut: InteprateDevicePingsEvent
                    }}   
                    
                 />
               </Suspense>
             </div>
           </div>
         </div>
       </>
     );
}