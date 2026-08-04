// app/layout.js

import appConfigs from './appConfigs/mosyTheme.jsx'; // Theme config
import './css/designer.css';
import MosyUiTheme from './css/mosyUi.js';
import './css/fonts.css';
import './css/templateCssPack.js';
import './assets/css/font-awesome.min.css';
import './assets/css/feathericon.min.css';
import './assets/plugins/morris/morris.css';
import './assets/css/style.css';
import './auth/AssetGuard/MosyAuthUI.css'
import TopLoader from './components/TopLoader.jsx';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css?family=Poppins:400,300"
          rel="stylesheet"
        />    
        <MosyUiTheme />

      </head>
      <body >
       <TopLoader />
       <div className={`col-md-12 p-0 m-0 dashboard-container main-wrapper ${appConfigs.sideBarType}`} id="page-wrapper">{children}</div>
      </body>
    </html>
  );
}
