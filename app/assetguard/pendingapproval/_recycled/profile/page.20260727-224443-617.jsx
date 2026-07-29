import { Suspense } from 'react';
import PendingapprovalList from '../uiControl/PendingapprovalList';
import { hiveRoutes } from '../../../appConfigs/hiveRoutes';
import PendingapprovalProfile from '../uiControl/PendingapprovalProfile';


export async function generateMetadata({ searchParams }) {
  const mosyTitle = "Pendingapproval"//searchParams?.mosyTitle || "Tasks";

  return {
    title: mosyTitle ? decodeURIComponent(mosyTitle) : `Pendingapproval`,
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
                 <PendingapprovalProfile />
               </Suspense>
            </div>
          </div>
        </div>
    </>
)
}

