import { Suspense } from 'react';

import DeviceListList from '../uiControl/DeviceListList';

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

export default function DeviceListMainListPage() {

return (
        <>
         <div className="main-wrapper">
           <div className="page-wrapper">
              <div className="content container-fluid p-0 m-0 ">
               <Suspense fallback={<div className="col-md-12 p-5 text-center h3">Loading...</div>}>
               
                    <DeviceListList  
                    
                     dataIn={{ parentUseEffectKey: "loadDeviceListList" }}
                       
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