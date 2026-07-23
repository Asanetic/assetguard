import { Suspense } from 'react';

import SubscriptionpaymentsProfile from '../uiControl/SubscriptionpaymentsProfile';

import { InteprateSubscriptionpaymentsEvent } from '../dataControl/SubscriptionpaymentsRequestHandler';

    
export async function generateMetadata({ searchParams }) {
  const mosyTitle = "Subscription payments profile"//searchParams?.mosyTitle || "Subscription payments";

  return {
    title: mosyTitle ? decodeURIComponent(mosyTitle) : `Subscription payments profile`,
    description: 'emberbill Subscription payments',
    
    icons: {
      icon: "/logo.png"
    },    
  };
}
                      

export default function SubscriptionpaymentsMainProfilePage() {

   return (
     <>
       <div className="main-wrapper">
          <div className="page-wrapper">
             <div className="content container-fluid p-0 m-0 ">
               <Suspense fallback={<div className="col-md-12 p-5 text-center h3">Loading...</div>}>
                 <SubscriptionpaymentsProfile 
                    dataIn={{ parentUseEffectKey: "initSubscriptionpaymentsProfile" }} 
                                           
                    dataOut={{
                       setChildDataOut: InteprateSubscriptionpaymentsEvent
                    }}   
                    
                 />
               </Suspense>
             </div>
           </div>
         </div>
       </>
     );
}