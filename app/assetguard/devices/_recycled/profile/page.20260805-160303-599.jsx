import { Suspense } from 'react';
import DevicesList from '../uiControl/DevicesList';
import { hiveRoutes } from '../../../appConfigs/hiveRoutes';
import DevicesProfile from '../uiControl/DevicesProfile';


export async function generateMetadata({ searchParams }) {
  const mosyTitle = "Devices"//searchParams?.mosyTitle || "Tasks";

  return {
    title: mosyTitle ? decodeURIComponent(mosyTitle) : `Devices`,
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
                 <DevicesProfile />
               </Suspense>
            </div>
          </div>
        </div>
    </>
)
}

