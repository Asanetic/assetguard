'use client'; // Only needed if you use interactive logic

import React from 'react';
import Link from 'next/link';

function ResetPasswordForm(props) {
  const loginBgImg = props.loginBgImg;
  const appLogo = props.appLogo;
  const appName = props.appName;
  const loginUrl = props.loginUrl || '#';

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
                    <div className="col-md-12 py-3 text-center">
                      <img src={appLogo} alt="App Logo" style={{ width: '100px' }} />
                    </div>

                    <h1 className="col-md-12 mb-3">Reset password</h1>

                    <form method="post">
                      <div className="form-group">
                        <label>Enter your email</label>
                        <input
                          className="form-control"
                          required
                          id="txt_username"
                          name="txt_username"
                          placeholder="Enter your username"
                          type="text"
                        />
                      </div>

                      <div className="form-group">
                        <button className="btn btn-primary btn-block" name="btn_login" type="submit">
                          Reset
                        </button>
                      </div>
                    </form>

                      <div className="text-center">
                        <Link href={loginUrl}>Back to login</Link>
                      </div>
                   
                    <div className="col-md-12 pt-3 p-0" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordForm;
