import AuthPage from "./auth/login/page";

import mosyThemeConfigs from './appConfigs/mosyTheme';
import { hiveRoutes } from "./appConfigs/hiveRoutes";

export async function generateMetadata() {
  const appName = mosyThemeConfigs.mosyAppName || 'Mosy';
  
  return {
    title: `Welcome to ${appName}`,
    description: `${appName}`,
    
    icons: {
      icon: `${hiveRoutes.hiveBaseRoute}/logo.png`
    },

  };


}
  
  export default function Home() {
   return(
    <>
    <AuthPage baseRoot="auth/"/>
    </>
   )
  }
