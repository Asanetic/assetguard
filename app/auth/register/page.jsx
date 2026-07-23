import mosyThemeConfigs from '../../appConfigs/mosyTheme';
import saAuthConfigs from '../featureConfig/saAuthConfigs'; 

import RegisterForm from './uiControl/RegisterForm';

export async function generateMetadata() {
  const appName = mosyThemeConfigs.mosyAppName || 'Mosy';
  
  return {
    title: `Create account :: ${appName}`,
    description: `${appName}`,

    icons: {
      icon: "/logo.png"
    },

  };
  
}

export default function RegisterPage() {
  const loginBgImg =saAuthConfigs.loginBgImage;
  const appLogo = mosyThemeConfigs.mosyAppLogo;
  const appName = mosyThemeConfigs.mosyAppName;
  const loginUrl =saAuthConfigs.loginUrl;

  return (
    <RegisterForm
      loginBgImg={loginBgImg}
      appLogo={appLogo}
      appName={appName}
      loginUrl={loginUrl}
    />
  );
}
