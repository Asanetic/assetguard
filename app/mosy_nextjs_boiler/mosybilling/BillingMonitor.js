"use client";
import { useEffect, useState } from 'react';

import { mosyGetData, mosyGetLSData, mosyPostData, mosySetLSData } from "../MosyUtils/hiveUtils";

import saAuthConfigs from '../auth/featureConfig/saAuthConfigs'; 

export async function loadBillingAccountDetails(trxData={})
{
    let sessionPrefix = saAuthConfigs.sessionPrefix;
    const user_id = mosyGetLSData(`${sessionPrefix}_sa_authsess_user_id_val`)

    const name = mosyGetLSData(`${sessionPrefix}_sa_authsess_name_val`)
    const tel = mosyGetLSData(`${sessionPrefix}_sa_authsess_tel_val`)
    const email = mosyGetLSData(`${sessionPrefix}_sa_authsess_email_val`)

    const accData = await mosyPostData({url:`https://eb.asanetic.com/api/emberbill/accounts/status`, 
        data : {
          name : name,
          tel : tel,
          email : email,
          accId : user_id,
          appId: sessionPrefix,
          trxData      
        }
    })

 
    const respData = accData?.data[0]

    const activeState = respData?.active_status

    mosySetLSData("emberBillStatus", activeState)
    mosySetLSData("emberBillTel", tel)
    mosySetLSData("emberBillEmail", email)

}


export function PollUserTransactions({
    interval = 3000,
    maxAttempts = 10,
    onSuccess = null,
    onError = null
  } = {}) {
    let sessionPrefix = saAuthConfigs.sessionPrefix;
    const user_id = mosyGetLSData(`${sessionPrefix}_sa_authsess_user_id_val`);
    const url = `https://apps.asanetic.com/eb/be/hiveapi?user_trx=${user_id}`;
  
    let attempts = 0;
  
    const poll = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const result = await res.json();
  
        if (Array.isArray(result.data) && result.data.length > 0) {
          if (onSuccess) onSuccess(result.data); // ✅ only runs if passed
          return;
        }
      } catch (err) {
        console.error("Polling error:", err);
        if (onError) onError(err); // ❌ will only run if you provided it
      }
  
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, interval);
      } else {
        if (onError) onError(new Error("Polling timed out"));
      }
    };
  
    poll();
  }
  
// ✅ Rename and treat like a hook
export function useBillingAccountStatus() {
  const [activeStatus, setActiveStatus] = useState(null);

  useEffect(() => {
    const status = mosyGetLSData("emberBillStatus");
    setActiveStatus(status);
  }, []);

  return "Active";//activeStatus;
  //return activeStatus;
}
