// Configs for Next.js Auth System (sauth_configs)
// appConfigs.js
import bgimg from '../../img/loginbg.jpg'; // outside public!
import {hiveRoutes} from '../../appConfigs/hiveRoutes'; 
import mosyThemeConfigs from '../../appConfigs/mosyTheme';

const commonRoot = "/"; // Adjust to your base path or env var if needed

const saAuthConfigs = {
  sessionPrefix: "supercrm", // Unique prefix for session keys
  oauthTable: "system_users",
  primkey: "primkey",

  // DB column mappings
  userIdCol: "record_id",
  usernameCol: "name",
  emailCol: "email",
  phoneCol: "tel",
  passwordCol: "login_password",
  sessionColumns : "record_id,tel,name,email,user_role,hive_site_id,hive_site_name",

  // Post-login redirect
  afterSplashPage:`${hiveRoutes.cms}/dashboard/main`,

  // UI toggles
  showResetLink: false, // true || false
  showCreateAccount: false, // true || false

  // Routes (UI component files/pages, not PHP scripts)
  loginUrl: `${hiveRoutes.auth}/login`,
  registerUrl: `${hiveRoutes.auth}/register`,
  changePasswordUrl: `${hiveRoutes.auth}/resetpassword`,
  resetPasswordUrl: `${hiveRoutes.auth}/resetpassword`,
  
  //Api endpoints
  createUserApi : `${hiveRoutes.hiveBaseRoute}/api/${mosyThemeConfigs.mosySystemName}/accounts/createaccount`,

  // Login page background + UI widget choice
  loginBgImage: bgimg.src,
  loginWidget: "hive_login_center_wgt", // e.g., hive_login_center_wgt || hive_login_dark_clear_center_wgt
};

export default saAuthConfigs;
