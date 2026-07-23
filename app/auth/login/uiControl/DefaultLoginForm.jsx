'use client';

import React from 'react';
import MainLoginInputs from './MainLoginInputs'

export default function DefaultLoginForm({
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
      className="row justify-content-center m-0 p-0 col-md-12 bg_w_img"
      style={{ backgroundImage: `url('${loginBgImg}')` }}
    >
      <div className="col-md-5 m-0 p-0">
        <div className="main-wrapper login-body">
          <div className="login-wrapper">
            <div className="container m-0 p-1 p-lg-0">
              <div className="loginbox bg-white">
                <div className="login-right">
                  <div className="login-right-wrap">
                    <MainLoginInputs 
                        showCreateAccount={showCreateAccount}
                        appName={appName}
                        appLogo={appLogo}
                        showResetLink={showResetLink}
                        changePasswordUrl={changePasswordUrl}
                        registerUrl={registerUrl} />
                    <div className="pt-3" id="alert_box"/></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
   
  );
}
