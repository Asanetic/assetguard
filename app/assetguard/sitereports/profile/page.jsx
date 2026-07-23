import { Suspense } from 'react';
import CompaniesList from '../uiControl/CompaniesList';
import { hiveRoutes } from '../../../appConfigs/hiveRoutes';
import CompaniesProfile from '../uiControl/CompaniesProfile';


export async function generateMetadata({ searchParams }) {
  const mosyTitle = "Companies"//searchParams?.mosyTitle || "Tasks";

  return {
    title: mosyTitle ? decodeURIComponent(mosyTitle) : `Companies`,
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
                 <CompaniesProfile />
               </Suspense>
            </div>
          </div>
        </div>
    </>
)
}

