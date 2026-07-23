'use client'; // Only needed if using interactivity (e.g., hooks)

import React, { useEffect , useState } from 'react';
import { useRouter } from 'next/navigation';
import saAuthConfigs from '../../featureConfig/saAuthConfigs';
import { mosyGetLSData, dayTime } from '../../../MosyUtils/hiveUtils';


export default function SplashScreen(props) {
  const {appName, appLogo , afterSplashPage} = props;

  const { sessionPrefix, usernameCol } = saAuthConfigs;
  const cookieKey = `${sessionPrefix}_sa_authsess_${usernameCol}_val`;

  const [username, setUsername] = useState('_');
  
  useEffect(() => {
    const usernameRaw = mosyGetLSData(cookieKey);
    if (usernameRaw) {
      setUsername(usernameRaw.split(' ')[0]);
    }
  }, []); // Empty dependency array ensures this runs only on the client side

    
 const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
    //  router.push(afterSplashPage); // ⬅️ Destination URL

    window.location.href = afterSplashPage; // 🔁 Hard reload to new page

    }, 2000); // 3000ms = 3 seconds

    return () => clearTimeout(timer); // Clean up if component unmounts early
  }, [router]);
  
  
  
  return (
    <main role="main" className="container-fluid skin_plasma" style={{ minHeight: '100vh' }}>
      <div className="row justify-content-center pl-1 pr-1 pt-lg-5">
        <h3 className="col-md-12 text-center pt-5 mt-5 padding_row">
    		{`Good ${dayTime()} ${username?.split(' ')[0] || '_'}`}
        </h3>
        <h5 className="col-md-12 text-center pt-4">
          Welcome to {appName}
        </h5>
        <h3 className="col-md-12 text-center">
          <img
            src={appLogo}
            className="pt-5 mt-lg-5 blink"
            style={{ width: '200px', height: 'auto' }}
            alt="App Logo"
          />
        </h3>
        <h3 className="col-md-12 text-center">Loading...</h3>
      </div>
    </main>
  );
}
