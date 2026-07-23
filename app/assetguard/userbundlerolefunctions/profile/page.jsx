import { Suspense } from 'react';

import UserBundleRoleFunctionsProfile from '../uiControl/UserBundleRoleFunctionsProfile';

import { InteprateUserBundleRoleFunctionsEvent } from '../dataControl/UserBundleRoleFunctionsRequestHandler';

import { hiveRoutes } from '../../../appConfigs/hiveRoutes';

export async function generateMetadata({ searchParams }) {
  const mosyTitle = "User Bundle Role Functions "//searchParams?.mosyTitle || "User Bundle Role Functions";

  return {
    title: mosyTitle ? decodeURIComponent(mosyTitle) : `User Bundle Role Functions`,
    description: 'assetguard User Bundle Role Functions',
    
    icons: {
      icon: `${hiveRoutes.hiveBaseRoute}/logo.png`
    },    
  };
}    
                      

export default function UserBundleRoleFunctionsMainProfilePage() {

   return (
     <>
       <div className="main-wrapper">
          <div className="page-wrapper">
             <div className="content container-fluid p-0 m-0 ">
               <Suspense fallback={<div className="col-md-12 p-5 text-center h3">Loading...</div>}>
                 <UserBundleRoleFunctionsProfile 
                    dataIn={{ parentUseEffectKey: "initUserBundleRoleFunctionsProfile" }} 
                                           
                    dataOut={{
                       setChildDataOut: InteprateUserBundleRoleFunctionsEvent
                    }}   
                    
                 />
               </Suspense>
             </div>
           </div>
         </div>
       </>
     );
}