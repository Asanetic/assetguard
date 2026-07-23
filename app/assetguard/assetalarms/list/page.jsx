import { Suspense } from 'react';

import AssetAlarmsList from '../uiControl/AssetAlarmsList';

import { InteprateAssetAlarmsEvent } from '../dataControl/AssetAlarmsRequestHandler';
    
import { hiveRoutes } from '../../../appConfigs/hiveRoutes';

export async function generateMetadata({ searchParams }) {
  const mosyTitle = "Asset Alarms "//searchParams?.mosyTitle || "Asset Alarms";

  return {
    title: mosyTitle ? decodeURIComponent(mosyTitle) : `Asset Alarms`,
    description: 'assetguard Asset Alarms',
    
    icons: {
      icon: `${hiveRoutes.hiveBaseRoute}/logo.png`
    },    
  };
}

export default function AssetAlarmsMainListPage() {

return (
        <>
         <div className="main-wrapper">
           <div className="page-wrapper">
              <div className="content container-fluid p-0 m-0 ">
               <Suspense fallback={<div className="col-md-12 p-5 text-center h3">Loading...</div>}>
               
                    <AssetAlarmsList  
                    
                     dataIn={{ parentUseEffectKey: "loadAssetAlarmsList" }}
                       
                     dataOut={{
                       setChildDataOut: InteprateAssetAlarmsEvent
                     }}
                    />
                    
                  </Suspense>                 
              </div>
            </div>
          </div>
        </>
      );
    }