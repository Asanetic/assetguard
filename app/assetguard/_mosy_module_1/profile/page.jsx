import { Suspense } from 'react';
import Templatev1List from '../uiControl/Templatev1List';
import { hiveRoutes } from '../../../appConfigs/hiveRoutes';
import Templatev1Profile from '../uiControl/Templatev1Profile';


export async function generateMetadata({ searchParams }) {
  const mosyTitle = "Templatev1"//searchParams?.mosyTitle || "Tasks";

  return {
    title: mosyTitle ? decodeURIComponent(mosyTitle) : `Templatev1`,
    description: 'supercrm Tasks',
    
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
                 <Templatev1Profile />
               </Suspense>
            </div>
          </div>
        </div>
    </>
)
}

