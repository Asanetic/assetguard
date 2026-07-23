// File: Components/Auth/LoginForm.js
'use client';

import React from 'react';
import Link from 'next/link';
import DynamicModal from '../../../components/DynamicModal';

function MainLoginInputs({
  appLogo,
  appName,
  changePasswordUrl,
  registerUrl,
  showResetLink,
  showCreateAccount,
}) {
  
  
  async function sendLoginRequest(e) {
     MosyNotify({message : "Sending request..."})
      e.preventDefault();
      const loginResult = await ProcessUserLogin(e);

      if (loginResult.success) {
        console.log('Yay, logged in!', loginResult.user);
        
        // Maybe show a toast or do something UI-wise
      } else {
        console.log('Login failed:', loginResult.message);
        MosyNotify({message : "Invalid username or password. \nPlease try again",icon : "times-circle text-danger", duration:20000})
        // Maybe show custom message
      }
  }
  
  return (
    <div className="col-md-12 py-4">
      <div className="col-md-12 py-3 text-center">
        <img src={appLogo} alt="App Logo" style={{ width: '100px' }} />
      </div>

      <h1 className="col-md-12 mb-3 text-center">Welcome to {appName}</h1>
      <p className="account-subtitle text-center">Login to proceed</p>

      <form onSubmit={sendLoginRequest} encType="multipart/form-data" id="mosy_form">
        <div className="form-group">
          <label htmlFor="txt_username">Username</label>
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
          <label htmlFor="txt_password">Password</label>
          <input
            className="form-control"
            required
            id="txt_password"
            name="txt_password"
            placeholder="Enter password"
            type="password"
          />
        </div>

        <div className="form-group">
          <button className="btn btn-primary btn-block w-100" name="btn_login" type="submit">
            Login
          </button>
        </div>

        <input type="hidden" id="auth_mosy_action" name="auth_mosy_action" value="auth_login" />
        <DynamicModal/>
      </form>

      {showResetLink && (
        <div className="text-center pt-3">
          <Link href={changePasswordUrl}>Reset Password</Link>
        </div>
      )}

      {showCreateAccount && (
        <div className="text-center pt-4 text-dark">
          <Link href={registerUrl} className="text-dark">
            <b>New Here? Join {appName}</b>
          </Link>
        </div>
      )}
    </div>
  );
}

export default MainLoginInputs;
