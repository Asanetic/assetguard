import { Suspense } from 'react';
import { hiveRoutes } from '../../../appConfigs/hiveRoutes';
import GpslogsProfile from '../uiControl/GpslogsProfile';


export async function generateMetadata({ searchParams }) {
  const mosyTitle = "Gpslogs profile"//searchParams?.mosyTitle || "Tasks";

  return {
    title: mosyTitle ? decodeURIComponent(mosyTitle) : `Gpslogs Profile`,
    description: 'Gpslogs profile / item details',
    
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
                 <GpslogsProfile />
               </Suspense>
            </div>
          </div>
        </div>
    </>
)
}

