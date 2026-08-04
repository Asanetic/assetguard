import { Suspense } from 'react';
import { hiveRoutes } from '../../../appConfigs/hiveRoutes';
import Smarttemplatev1Profile from '../uiControl/Smarttemplatev1Profile';


export async function generateMetadata({ searchParams }) {
  const mosyTitle = "Smarttemplatev1 profile"//searchParams?.mosyTitle || "Tasks";

  return {
    title: mosyTitle ? decodeURIComponent(mosyTitle) : `Smarttemplatev1 Profile`,
    description: 'Smarttemplatev1 profile / item details',
    
    icons: {
      icon: `${hiveRoutes.hiveBaseRoute}/logo.png`
    },    
  };
}
export default function Page() {

return (
     <>
        <div className="main-wrapper">
          <div className="page-wrapper">
            <div className="content container-fluid p-0 m-0 ">
               <Suspense fallback={<div className="col-md-12 p-5 text-center h3">Loading...</div>}>
                 <Smarttemplatev1Profile />
               </Suspense>
            </div>
          </div>
        </div>
    </>
)
}

