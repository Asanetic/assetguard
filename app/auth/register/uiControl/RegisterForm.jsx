'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link'

import { SAuthCreateAccount } from '../../AuthUtils';
import saAuthConfigs from '../../featureConfig/saAuthConfigs';
import {mosyRightNow, magicRandomStr} from '../../../MosyUtils/hiveUtils';
import { MosyAlertCard, MosyNotify } from '../../../MosyUtils/ActionModals';
import { useSearchParams, useRouter } from 'next/navigation';
import { closeMosyCard } from '../../../components/MosyCard';
import DynamicModalProvider from '../../../components/DynamicModalProvider';

function LoginBox({ loginBgImg, appLogo, appName, loginUrl = '#' }) {
  const { usernameCol, emailCol, phoneCol, passwordCol, oauthTable } = saAuthConfigs;
  const router = useRouter();

  // Local state for hidden fields
  const [siteId, setSiteId] = useState('');
  const [siteName, setSiteName] = useState('');
  const [regDate, setRegDate] = useState('');
  const [refId, setRefId] = useState('');
  const [dateRegistered, setDateRegistered] = useState('');

  // Initialize hidden fields on mount
  useEffect(() => {

    setSiteId(`${mosyRightNow()}-${magicRandomStr(10)}`);
    setSiteName(''); // You can update this later with input or logic
    setRegDate(mosyRightNow());
    setRefId(magicRandomStr(7));
    setDateRegistered(mosyRightNow());
  }, []);

  async function sendCreateAccount(e) {
    e.preventDefault();

    MosyNotify({message :"Sending create request..." ,icon:"send",id:"modal1" })
    const registerResult =  await SAuthCreateAccount(e);

    closeMosyCard("modal1")
    console.log("registerinc", registerResult)
      if (registerResult.status=="success") {        
        // Maybe show a toast or do something UI-wise
      MosyAlertCard({message : "Account created succesfully", 
          yesLabel : "Login", 
          noLabel:"Close",
          icon : "check-circle",
          iconColor : "text-success",
          dismissable : false,
                   
          onYes: () => {
          
            router.push(`${saAuthConfigs.loginUrl}`)
          
          },

          onNo: () => {
          
            router.push(`${saAuthConfigs.loginUrl}`)
          
          }          

      ,id:"modal2"})
        
        
      } else {
        MosyNotify({message : `${registerResult.message}`,icon : "times-circle", iconColor : "text-danger", addTimer:false, id:"topmost"})
        // Maybe show custom message
      }

  }

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

                    <h1 className="col-md-12 mb-3">Welcome to {appName}</h1>
                    <p className="account-subtitle">Create {appName} account</p>

                    <form onSubmit={sendCreateAccount} encType="multipart/form-data" id="mosy_form">
                      <div className="form-group">
                        <label>Your full name</label>
                        <input
                          className="form-control"
                          required
                          id={`txt_${usernameCol}`}
                          name={`txt_${usernameCol}`}
                          placeholder="Enter your names"
                          type="text"
                          onChange={(e) => setSiteName(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label>Email address</label>
                        <input
                          className="form-control"
                          required
                          id={`txt_${emailCol}`}
                          name={`txt_${emailCol}`}
                          placeholder="Enter your email"
                          type="email"
                        />
                      </div>

                      <div className="form-group">
                        <label>Mobile number</label>
                        <input
                          className="form-control"
                          required
                          id={`txt_${phoneCol}`}
                          name={`txt_${phoneCol}`}
                          placeholder="Enter your mobile"
                          type="text"
                        />
                      </div>

                      <div className="form-group">
                        <label>Password</label>
                        <input
                          className="form-control"
                          required
                          id={`txt_${passwordCol}`}
                          name={`txt_${passwordCol}`}
                          placeholder="Enter password"
                          type="password"
                        />
                      </div>

                      <div className="form-group">
                        <button className="btn btn-primary btn-block" name="create_account" type="submit">
                          Create account
                        </button>
                      </div>

                      <div className="text-center">
                        <Link href={loginUrl}>Back to login</Link>
                      </div>

                      {/* Hidden Fields */}
                      <input type="hidden" id="txt_hive_site_id" name="txt_hive_site_id" value={siteId} />
                      <input type="hidden" id="txt_hive_site_name" name="txt_hive_site_name" value={siteName} />
                      <input type="hidden" id="txt_regdate" name="txt_regdate" value={regDate} />
                      <input type="hidden" id="txt_ref_id" name="txt_ref_id" value={refId} />
                      <input type="hidden" id="txt_date_registered" name="txt_date_registered" value={dateRegistered} />
                      <input type="hidden" id={`${oauthTable}_uptoken`} name={`${oauthTable}_uptoken`} value="" />
                      <input type="hidden" id={`${oauthTable}_mosy_action`} name={`${oauthTable}_mosy_action`} value={`add_${oauthTable}`} />
                      <div className="pt-3" id="alert_box"/>
                      <DynamicModalProvider/>

                    </form>

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

export default LoginBox;
