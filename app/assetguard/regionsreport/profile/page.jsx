import { Suspense } from 'react';
import RegionsReportList from '../uiControl/RegionsReportList';
import { hiveRoutes } from '../../../appConfigs/hiveRoutes';
import RegionsReportProfile from '../uiControl/RegionsReportProfile';


export async function generateMetadata({ searchParams }) {
  const mosyTitle = "RegionsReport"//searchParams?.mosyTitle || "Tasks";

  return {
    title: mosyTitle ? decodeURIComponent(mosyTitle) : `RegionsReport`,
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
                 <RegionsReportProfile />
               </Suspense>
            </div>
          </div>
        </div>
    </>
)
}

