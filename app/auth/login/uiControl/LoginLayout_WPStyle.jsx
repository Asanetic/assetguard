'use client';

import React from 'react';
import MainLoginInputs from './MainLoginInputs';

export default function LoginLayout_WPStyle({
  loginBgImg = '',
  appLogo = '',
  appName = 'App',
  showResetLink = false,
  changePasswordUrl = '#',
  showCreateAccount = false,
  registerUrl = '#',
}) {
  return (
    <div
      className="elforge_wp_login_wrapper"
      style={{ backgroundImage: `url('${loginBgImg}')` }}
    >
      <div className="elforge_wp_login_box">
        <div className="elforge_wp_form_wrap">
          <MainLoginInputs
            showCreateAccount={showCreateAccount}
            appName={appName}
            appLogo={appLogo}
            showResetLink={showResetLink}
            changePasswordUrl={changePasswordUrl}
            registerUrl={registerUrl}
          />
          <div className="pt-3" id="alert_box" />
        </div>

        <div className="elforge_wp_footer">
          &copy; {new Date().getFullYear()} {appName}. All rights reserved.
        </div>
      </div>

      <style jsx>{`
        .elforge_wp_login_wrapper {
          background-size: cover;
          background-position: center;
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2rem;
          background-color: #f1f1f1;
        }

        .elforge_wp_login_box {
          background: #fff;
          padding: 2.5rem 2rem;
          max-width: 400px;
          width: 100%;
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          text-align: center;
        }

        .elforge_wp_logo_wrap img {
          max-height: 80px;
          margin-bottom: 1.5rem;
        }

        .elforge_wp_form_wrap {
          text-align: left;
        }

        .elforge_wp_footer {
          font-size: 0.8rem;
          color: #999;
          margin-top: 2rem;
        }

        @media (max-width: 480px) {
          .elforge_wp_login_box {
            padding: 2rem 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
