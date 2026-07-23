import { Suspense } from 'react';
import DevicelistProfile from '../uiControl/DevicelistProfile';
 
export default function Page() {

return (
      <>
        <div className="main-wrapper">
          <div className="page-wrapper">
            <div className="content container-fluid p-0 m-0 ">
               <Suspense fallback={<div className="col-md-12 p-5 text-center h3">Loading...</div>}>
                 <DevicelistProfile />
               </Suspense>
            </div>
          </div>
        </div>
      </>
)
}
