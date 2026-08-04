
import mosyThemeConfigs from '../../appConfigs/mosyTheme';
import saAuthConfigs from '../featureConfig/saAuthConfigs'; 


import ResetPasswordForm from './uiControl/ResetPasswordForm';


export async function generateMetadata() {
  const appName = mosyThemeConfigs.mosyAppName || 'Mosy';
  
  return {
    title: `Reset password :: ${appName}`,
    description: `${appName}`,

    icons: {
      icon: "/logo.png"
    },

  };
}


export default function ResetPasswordPage() {
  const loginBgImg =saAuthConfigs.loginBgImage;
  const appLogo = mosyThemeConfigs.mosyAppLogo;
  const appName = mosyThemeConfigs.mosyAppName;
  const showResetLink =saAuthConfigs.showResetLink;
  const changePasswordUrl = saAuthConfigs.changePasswordUrl;
  const showCreateAccount = saAuthConfigs.showCreateAccount;
  const loginUrl = saAuthConfigs.loginUrl;

  return (
    <ResetPasswordForm
      loginBgImg={loginBgImg}
      appLogo={appLogo}
      appName={appName}
      loginUrl={loginUrl}
    />
  );
}
