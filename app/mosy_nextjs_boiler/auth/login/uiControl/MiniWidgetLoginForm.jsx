// File: Components/Auth/LoginLayout.js
'use client';

import React from 'react';
import MainLoginInputs from './MainLoginInputs'

export default function MiniWidgetLoginForm(
{
  loginBgImg = '',
  appLogo = '',
  appName = 'App',
  showResetLink = false,
  changePasswordUrl = '#',
  showCreateAccount = false,
  registerUrl = '#',
}
) {
  return (
    <div className="row justify-content-center m-0 p-0 col-md-12" 
    style={{ backgroundImage: `url('${loginBgImg}')`,backgroundRepeat:"no-repeat",backgroundSize:"cover" }}>
      <div className="col-md-12 m-0 p-0" style={{backgroundColor:"rgba(255, 255, 255, 0.7)"}}>
        <div className="main-wrapper login-body">
          <div className="login-wrapper m-0 p-1 p-lg-0">
            <div className="m-0 p-lg-4 row justify-content-center col-md-12">
              <div className="m-0 p-1 p-lg-0 row justify-content-center col-md-12 ">
                

                <div className="col-md-4 p-0 m-0">
                  <div className="loginbox  p-0 m-0">
                    <div className="login-right text-dark">
                      <div className="login-right-wrap">
                        <div className="col-md-12 pt-4 p-0">
                          {/* Slot in login form or child content */}    
                           <MainLoginInputs 
                              showCreateAccount={showCreateAccount}
                              appName={appName}
                              appLogo={appLogo}
                              showResetLink={showResetLink}
                              changePasswordUrl={changePasswordUrl}
                              registerUrl={registerUrl} />
    
                        </div>
                       <div className="pt-3" id="alert_box"/>

                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scoped styles for this component */}
      <style jsx>{`
        .form-control {
          background-color: transparent !important;
        }

        .loginbox {
          max-width: 100% !important;
        }

        .bg_w_img {
          background-size: cover;
          background-position: center;
          min-height: 100%;
        }

        .login-body {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-wrapper {
          width: 100%;
        }
      `}</style>
    </div>
  );
}
