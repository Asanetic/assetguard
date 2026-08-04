import { Suspense } from 'react';
import PricingPage from './PricingCards';

export async function generateMetadata({ searchParams }) {
  const mosyTitle = "CheckOut"//searchParams?.mosyTitle || "My account";

  return {
    title: mosyTitle ? decodeURIComponent(mosyTitle) : `My account`,
    description: 'emberbill My account',
    
    icons: {
      icon: "/logo.png"
    },    
  };
}

export default function CheckOutPage() {

return (
        <>
         <div className="main-wrapper">
           <div className="page-wrapper">
              <div className="content container-fluid p-0 m-0 ">
               <Suspense fallback={<div className="col-md-12 p-5 text-center h3">Loading...</div>}>
               
                    <PricingPage/>
                    
                  </Suspense>                 
              </div>
            </div>
          </div>
        </>
      );
    }