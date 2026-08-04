// app/components/SessionMonitor.js
'use client';


import { mosyPostFormData , mosySetLSData , mosyGetLSData , mosyDeleteLSData, mosyGetData, mosyFileUrl} from '../MosyUtils/hiveUtils';

import saAuthConfigs from './featureConfig/saAuthConfigs'; 

import {hiveRoutes} from '../appConfigs/hiveRoutes'; 
import { useRouter } from 'next/navigation';
import {mosyACTRLSaveSession} from './authAccesControl';


// Store all user info in cookies and track which keys were set
export function setUserSession(userObject) {
  let loggedInKeys = [];
  let sessionPrefix = saAuthConfigs.sessionPrefix;

  Object.entries(userObject).forEach(([key, value]) => {
    const cookieName = `${sessionPrefix}_sa_authsess_${key}_val`;
    mosySetLSData(cookieName, value, 1); // 1 day expiry
    loggedInKeys.push(cookieName);
  });

  // Save the comma-separated list of keys
  mosySetLSData(`${sessionPrefix}_sa_authsess_vals`, loggedInKeys.join(','), 1);
  mosySetLSData(`session_${sessionPrefix}_logged`, sessionPrefix, 1);  
}

export async function ProcessUserLogin(e) {    
  e.preventDefault();

  removeAuthSession();

  const result = await mosyPostFormData({
    formId: 'mosy_form',
    url: `${hiveRoutes.hiveBaseRoute}/api/auth/login`,
    method: 'POST',
    isMultipart: true,
  });

  if (result.status === 'success') {
    const user = result.user;
    const authToken = result.accessToken

    let sessionPrefix = saAuthConfigs.sessionPrefix;

    //set auth Token
    mosySetLSData(`${sessionPrefix}_authToken`, authToken)

    removeAuthSession();
    setUserSession(user);
    mosyACTRLSaveSession(result)

    console.log('Login successful');

    const params = new URLSearchParams(window.location.search);
    const encodedRefUrl = params.get('ref_url_go_to');

    if (encodedRefUrl) {
      try {
        const decodedUrl = atob(encodedRefUrl);
        console.log("Redirecting to decoded URL:", decodedUrl);
        window.location.href = decodedUrl;
      } catch (err) {
        console.warn('Failed to decode ref_url_go_to. Redirecting to splash instead.');
        window.location.href = `${hiveRoutes.auth}/splash`;
      }
    } else {
      window.location.href = `${hiveRoutes.auth}/splash`;
    }

    // ✅ Return result so the component can use it
    return {
      success: true,
      user,
      message: 'Login successful',
    };

  } else {
    //MosyNotify({ message: "result.message", icon: "times-circle", iconColor: "text-danger" });

    return {
      success: false,
      message: result.message || 'Login failed',
    };
  }
}


export async function SAuthCreateAccount(e) {
  e.preventDefault();

  const createUserApi = saAuthConfigs.createUserApi;
  const emailCol = saAuthConfigs.emailCol;
  const form = e.target;
  const formId = form.id;

  const formData = new FormData(form);
  const emailValue = formData.get(`txt_${emailCol}`);
  const whereStr = `where ${emailCol} = '${emailValue}'`;
    

  try {
    // 🔍 Step 1: Check for duplicate email
    const fetchResponse = await mosyGetData({
      endpoint: createUserApi,
      params: { q: btoa(whereStr) },
    });

    if (fetchResponse.status !== 'success') {
      return {
        status: 'error',
        message: 'Error checking existing account: ' + fetchResponse.message,
      };
    }

    const existingUsers = fetchResponse.data || [];

    if (existingUsers.length > 0) {
      return {
        status: 'exists',
        message: 'An account with this email already exists.',
      };
    }

    // 🆕 Step 2: Create the account
    const postResponse = await mosyPostFormData({
      formId,
      url: createUserApi,
      method: 'POST',
      isMultipart: true,
    });

    if (postResponse.status === 'success') {
      return {
        status: 'success',
        message: 'Account created successfully!',
        data: postResponse.data,
      };
    } else {
      return {
        status: 'error',
        message: 'Account creation failed: ' + postResponse.message,
      };
    }

  } catch (error) {
    return {
      status: 'error',
      message: 'Unexpected error during account creation: ' + error.message,
    };
  }
}


export function destroyAppSession(redirect, loginPath=``)
{
  removeAuthSession()

  if(loginPath==""){
    loginPath=`${hiveRoutes.auth}/login`
  }

  console.log("destroyAppSession", loginPath)
  
  const currentFile = mosyFileUrl()

  if(currentFile=="login")
  {
    return;
  }
  
  // Redirect to login with optional referrer
  if(redirect){

   window.location.href = `${loginPath}?ref_url_go_to=${btoa(window.location.href)}`

  }else{
   window.location.href=`${hiveRoutes.auth}/login`
  }
}

export function removeAuthSession()
{
    const sessionPrefix = saAuthConfigs.sessionPrefix;
  
    const keysString = mosyGetLSData(`${sessionPrefix}_sa_authsess_vals`);
    if (!keysString) return;

    const keys = keysString.split(',');
    keys.forEach(cookieName => {
      console.log(`removeAuthSession ${cookieName}`)
      mosyDeleteLSData(cookieName);
    });

    // Finally, remove the tracking cookie itself
    mosyDeleteLSData(`${sessionPrefix}_sa_authsess_vals`);
    mosyDeleteLSData(`session_${sessionPrefix}_logged`)
    mosyDeleteLSData(`${sessionPrefix}_authToken`)
   
}