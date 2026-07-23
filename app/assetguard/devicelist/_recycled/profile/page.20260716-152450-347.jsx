import { Suspense } from 'react';

import DeviceListProfile from '../uiControl/DeviceListProfile';

import { InteprateDeviceListEvent } from '../dataControl/DeviceListRequestHandler';

import { hiveRoutes } from '../../../appConfigs/hiveRoutes';

export async function generateMetadata({ searchParams }) {
  const mosyTitle = "Device List "//searchParams?.mosyTitle || "Device List";

  return {
    title: mosyTitle ? decodeURIComponent(mosyTitle) : `Device List`,
    description: 'assetguard Device List',
    
    icons: {
      icon: `${hiveRoutes.hiveBaseRoute}/logo.png`
    },    
  };
}    
                      

export default function DeviceListMainProfilePage() {

   return (
     <>
       <div className="main-wrapper">
          <div className="page-wrapper">
             <div className="content container-fluid p-0 m-0 ">
               <Suspense fallback={<div className="col-md-12 p-5 text-center h3">Loading...</div>}>
                 <DeviceListProfile 
                    dataIn={{ parentUseEffectKey: "initDeviceListProfile" }} 
                                           
                    dataOut={{
                       setChildDataOut: InteprateDeviceListEvent
                    }}   
                    
                 />
               </Suspense>
             </div>
           </div>
         </div>
       </>
     );
}