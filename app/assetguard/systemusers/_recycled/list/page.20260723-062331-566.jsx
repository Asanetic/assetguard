import { Suspense } from 'react';

import SystemUsersList from '../uiControl/SystemUsersList';

import { InteprateSystemUsersEvent } from '../dataControl/SystemUsersRequestHandler';
    
import { hiveRoutes } from '../../../appConfigs/hiveRoutes';

export async function generateMetadata({ searchParams }) {
  const mosyTitle = "System Users "//searchParams?.mosyTitle || "System Users";

  return {
    title: mosyTitle ? decodeURIComponent(mosyTitle) : `System Users`,
    description: 'assetguard System Users',
    
    icons: {
      icon: `${hiveRoutes.hiveBaseRoute}/logo.png`
    },    
  };
}

export default function SystemUsersMainListPage() {

return (
        <>
         <div className="main-wrapper">
           <div className="page-wrapper">
              <div className="content container-fluid p-0 m-0 ">
               <Suspense fallback={<div className="col-md-12 p-5 text-center h3">Loading...</div>}>
               
                    <SystemUsersList  
                    
                     dataIn={{ parentUseEffectKey: "loadSystemUsersList" }}
                       
                     dataOut={{
                       setChildDataOut: InteprateSystemUsersEvent
                     }}
                    />
                    
                  </Suspense>                 
              </div>
            </div>
          </div>
        </>
      );
    }