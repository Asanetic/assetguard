import { Suspense } from 'react';

import UsersList from '../uiControl/UsersList';

import { InteprateUsersEvent } from '../dataControl/UsersRequestHandler';
    
import { hiveRoutes } from '../../../appConfigs/hiveRoutes';

export async function generateMetadata({ searchParams }) {
  const mosyTitle = "Users "//searchParams?.mosyTitle || "Users";

  return {
    title: mosyTitle ? decodeURIComponent(mosyTitle) : `Users`,
    description: 'supercrm Users',
    
    icons: {
      icon: `${hiveRoutes.hiveBaseRoute}/logo.png`
    },    
  };
}

export default function UsersMainListPage() {

return (
        <>
         <div className="main-wrapper">
           <div className="page-wrapper">
              <div className="content container-fluid p-0 m-0 ">
               <Suspense fallback={<div className="col-md-12 p-5 text-center h3">Loading...</div>}>
               
                    <UsersList  
                    
                     dataIn={{ parentUseEffectKey: "loadUsersList" }}
                       
                     dataOut={{
                       setChildDataOut: InteprateUsersEvent
                     }}
                    />
                    
                  </Suspense>                 
              </div>
            </div>
          </div>
        </>
      );
    }