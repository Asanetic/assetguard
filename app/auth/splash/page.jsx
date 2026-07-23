
import mosyThemeConfigs from '../../appConfigs/mosyTheme';
import saAuthConfigs from '../featureConfig/saAuthConfigs'; 

import SplashScreen from './uiControl/SplashScreen';


export async function generateMetadata() {
  const appName = mosyThemeConfigs.mosyAppName || 'Mosy';
  
  return {
    title: `Loading :: ${appName}`,
    description: `${appName}`,
  };
}


export default function SplashScreenPage() {
  const firstName ="Jeremy";
  const appLogo = mosyThemeConfigs.mosyAppLogo;
  const appName = mosyThemeConfigs.mosyAppName;
  const afterSplashPage = saAuthConfigs.afterSplashPage;

  
  return (
    <SplashScreen
      firstName={firstName}
      appLogo={appLogo}
      appName={appName}
      afterSplashPage={afterSplashPage}
    />
  );
}
