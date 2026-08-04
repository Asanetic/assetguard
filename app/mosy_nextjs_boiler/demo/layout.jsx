import Image from 'next/image';
import userAvatarImg from '../img/useravatar.png'; // outside public!
import AdminNav from '../components/AdminNav';
import AdminFooter from '../components/AdminFooter';
import DashboardClientWrapper from './DashboardClientWrapper';
// app/layout.js
import appConfigs from '../appConfigs/mosyTheme'; // Theme config
import '../css/designer.css';
import MosyUiTheme from '../css/mosyUi.js';
import '../css/fonts.css';
import '../assets/css/font-awesome.min.css';
import '../assets/css/feathericon.min.css';
import '../assets/plugins/morris/morris.css';
import '../assets/css/style.css';
import { AssetGuardSidebar } from '../components/AssetGuardNav.jsx';
import { hiveRoutes } from '../appConfigs/hiveRoutes.jsx';

export default function DashboardLayout({ children }) {

  const appLogo = appConfigs.mosyAppLogo;
  const appName = appConfigs.mosyAppName;
  const userAvatar = userAvatarImg.src;

  //console.log(" DashboardLayout LOADED: /nextinvoice/layout");
  return (
    <>
        <MosyUiTheme />
        <DashboardClientWrapper/>

        <AdminNav
        appName={appName}
        appLogo={appLogo}
        userAvatar={userAvatar}
        />

      {/* <AssetGuardSidebar
        alarmCount={7}
        user={{ name: "Jane Wanjiku", role: "Administrator", initials: "JW" }}
      /> */}

      {/* Offset by the fixed rail's width (64px) so page content isn't hidden under it.
          The drawer itself overlays on top of this content when opened, it doesn't push it. */}
      <div style={{ marginLeft: AssetGuardSidebar.RAIL_WIDTH }}>
        {children}
      </div>

      <AdminFooter />
    </>
  );
}