import { Suspense } from 'react';
import SuppliersProfile from '../uiControl/SuppliersProfile';
 
export default function Page() {

return (
      <>
        <div className="main-wrapper">
          <div className="page-wrapper">
            <div className="content container-fluid p-0 m-0 ">
               <Suspense fallback={<div className="col-md-12 p-5 text-center h3">Loading...</div>}>
                 <SuppliersProfile />
               </Suspense>
            </div>
          </div>
        </div>
      </>
)
}
