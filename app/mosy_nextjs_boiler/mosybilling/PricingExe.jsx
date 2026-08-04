"use client";

import React,  { useEffect, useState } from "react";

import {closeMosyCard, MosyCard} from '../components/MosyCard'
import PricingPage from "../mosybilling/PricingCards";
import { MosyAlertCard, MosyNotify } from "../MosyUtils/ActionModals";
import { magicRandomStr, mosyGetLSData, mosyRefreshPage } from "../MosyUtils/hiveUtils";
import { loadBillingAccountDetails, PollUserTransactions } from "./BillingMonitor";
import saAuthConfigs from "../auth/featureConfig/saAuthConfigs";

export function loadBillingPage()
{
  MosyCard("",<PricingPage/>,true,"modal1","mosycard_wide")
}


export function MpesaPayForm({ amount = '499', planName = 'Flourish Pro', defPhone, onPay }) {
  const [phone, setPhone] = useState(defPhone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validatePhone = (num) => /^07\d{8}$/.test(num);

  const handlePay = async () => {
    if (!validatePhone(phone)) {
      setError('Please enter a valid Safaricom number (07XXXXXXXX)');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Call your payment handler (e.g., STK push)
      if (typeof onPay === 'function') {
        await onPay({ phone, amount, planName });
      } else {
        // Example: call your M-Pesa endpoint
        const res = await fetch('/api/pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, amount, planName }),
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Payment failed');
        alert('Payment request sent to your phone. Check M-Pesa.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Payment failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3  rounded-4 ">
      <h5 className="mb-3">Complete Payment via M-Pesa</h5>

      <div className="mb-3">
        <label className="form-label">M-Pesa Phone Number</label>
        <input
          type="tel"
          className="form-control rounded-pill"
          placeholder="07XXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      {error && <div className="text-danger small mb-2">{error}</div>}

      <button
        className="btn btn-primary w-100 rounded-pill"
        onClick={handlePay}
        disabled={loading}
      >
        {loading ?( 'Processing...') : (<><i className="fa fa-check-circle mr-2"></i>Upgrade to {planName} @  {amount}</>)}
      </button>
    </div>
  );
}


export function loadPaymentModal(amount, planId, planName, phone)
{
   closeMosyCard("modal1")

    MosyCard("",
     <MpesaPayForm
      amount={amount}
      planName={planName}
      defPhone={mosyGetLSData("emberBillTel","")}

      onPay={({ phone, amount }) => {
        // you can handle logic here
        submitMpesaPayment({amount :amount, planId:planId, phone: phone})
        //MosyCard(<div className="col-md-12 text-center h4 text-success p-0 m-0 "> <i className="fa fa-spinner fa-spin"></i> Waiting for transaction </div>,<MpesaOrderConfirmation orderNo={accountId} accName={`Jeremiah`} planAmount={amount} />, false, "topmost", "mosycard_50")

        console.log('Processing M-Pesa payment:', phone, amount);
      }}
    />,false
    )
}

export async function submitMpesaPayment({ amount, planId, phone }) {

    let sessionPrefix = saAuthConfigs.sessionPrefix;
    const user_id = mosyGetLSData(`${sessionPrefix}_sa_authsess_user_id_val`)

    const payload = `onlinetrx&paidamt=${amount}&accno=${user_id}&telno=${phone}`;
  
    MosyNotify({message :"Sending payment request...", icon:"send" , id:"topmost"})

    closeMosyCard()
    
    try {
      const res = await fetch('https://api.asanetic.com/mpesastk.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload,
      });
  
      closeMosyCard("topmost")
      const responseText = await res.text(); // or use .json() if your PHP returns JSON
      //MosyNotify({message:"Request sent, kindly check your phone",icon:"phone", id:"topmost"})
      
       MosyCard(<div className="col-md-12 text-center h4 text-success p-0 m-0 "> <i className="fa fa-spinner fa-spin"></i> Waiting for transaction </div>,<MpesaOrderConfirmation orderNo={user_id} accName={`Jeremiah`} planAmount={amount} />, false, "modal1", "mosycard_50")

      //console.log('Payment Response:', responseText);

      PollUserTransactions({maxAttempts:30, onSuccess: (data)=>{
       
        loadBillingAccountDetails({planId:planId, planAmt:amount, data:data})
       
        MosyAlertCard({message:"Payment received", icon:"check-circle", iconColor:"text-success", 
        
            autoDismissOnClick:false, 
            yesLabel:"Reload", 
            noLabel:"Close",
            onYes:()=>{mosyRefreshPage()},onNo:()=>{mosyRefreshPage()}})

        }})

      return responseText;

    } catch (err) {
        
    MosyAlertCard({message:"Request failed :( ",icon:"times-circle", id:"topmost", yesLabel:"Try again",
         noLabel:"Close", onYes:()=>{
        submitMpesaPayment({amount:amount, planId:planId, phone:phone})
    },onNo:()=>{closeMosyCard("topmost")}})

      //console.error('STK Push Error:', err);
      throw err;
      
    }
  }


export  function MpesaOrderConfirmation({ orderNo, accName, planAmount }) {
  const securityCode = magicRandomStr(10);

  return (
    <div className="mb-4 row justify-content-center m-0 p-0 col-md-12 pl-2 pr-2" style={{ lineHeight: '35px' }}>
      <div className="col-md-12 ctn_set" style={{ borderBottom: '0px solid' }}>
        <div className="pt-2 row justify-content-center m-0 p-0 col-md-12">
          <h5 className="col-md-12 text-left p-2 m-2 text-info border-bottom border_set">            
            Please check your phone to confirm transaction request.
          </h5>

          <div className="pt-2 pb-2 d-none border-bottom border_set row justify-content-left m-0 p-0 col-md-12" style={{ lineHeight: '30px' }}>
            <div className="col-md-12 border-bottom border_set bg-light mb-2 text-left"><b>Order Details</b></div>
            <div className="col-md-3 text-left"><b>Order No:</b> {orderNo}</div>
            <div className="col-md-5 text-left"><b>Account Name:</b> {accName}</div>
            <div className="col-md-4 text-left"><b>Security Code :</b> {securityCode}</div>
          </div>

          <div className="col-md-12 text-left p-0 m-0" style={{ lineHeight: '30px' }}>
            In case you can’t see a transaction request on your phone, please try again or use Direct Lipa na M-Pesa below.
            <div className="pb-2 pt-3"><b>Direct Lipa na M-Pesa</b></div>
          </div>

          <ol className="col-md-12 ml-4 text-left" style={{ lineHeight: '30px' }}>
            <li>Go to Lipa na M-Pesa</li>
            <li>Select Paybill</li>
            <li>Enter <b className="text-danger">4091961</b> as Business Number</li>
            <li>Enter <b className="text-danger">{orderNo}</b> as Account Number</li>
            <li>Enter <b className="text-danger">{planAmount}</b> as Amount and confirm</li>
          </ol>

          <div className="col-md-12 text-left font-weight-bold  border-top border-bottom p-2 border_set" style={{ lineHeight: '30px' }}>
            We will send you a payment receipt as proof of transaction.
          </div>

          <div className="col-md-12 text-center row justify-content-center border-bottom">
            <h4 className="col-md-6 pt-4">
              <img src="/img/ssl-img.svg" alt="SSL Secured" style={{ height: '30px', maxWidth: '100%' }} />
            </h4>
            <h4 className="col-md-6">
              <img src="/img/secure.png" alt="Secure" style={{ height: '70px', maxWidth: '100%' }} />
            </h4>
            <div className="col-md-12 p-0 m-0 "><em className="badge">Guaranteed secure payments</em></div>

          </div>
        </div>
      </div>
    </div>
  );
}


  
