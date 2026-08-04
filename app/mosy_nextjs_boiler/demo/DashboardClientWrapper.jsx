'use client';

import SessionMonitor from '../auth/SessionMonitor';
import saAuthConfigs from '../auth/featureConfig/saAuthConfigs'; 

export default function DashboardClientWrapper({ children }) {
  return (
    <>
      <SessionMonitor
        sessionPrefix={saAuthConfigs.sessionPrefix}
        loginPath={`../../auth/${saAuthConfigs.loginUrl}`}
      />
      {children}
    </>
  );
}
