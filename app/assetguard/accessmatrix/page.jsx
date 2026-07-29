import { Suspense } from 'react';
import { hiveRoutes } from '../../appConfigs/hiveRoutes';
import RolePermissionMatrix from './accessmatrix';


export async function generateMetadata({ searchParams }) {
  const mosyTitle = "Access control matrix"//searchParams?.mosyTitle || "Tasks";

  return {
    title: mosyTitle ? decodeURIComponent(mosyTitle) : `Access control matrix`,
    description: 'Access control matrix',
    
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
                 <RolePermissionMatrix />
               </Suspense>
            </div>
          </div>
        </div>
    </>
)
}
