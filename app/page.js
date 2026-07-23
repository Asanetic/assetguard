import mosyThemeConfigs from './appConfigs/mosyTheme';
import { hiveRoutes } from "./appConfigs/hiveRoutes";
import LoginPage from './auth/userlogin/page';

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
    <LoginPage baseRoot="auth/"/>
    </>
   )
  }
