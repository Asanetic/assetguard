'use client';

import { useCallback, useEffect, useState } from 'react';
import { loadBillingPage } from './PricingExe';
import { mosyGetLSData } from '../MosyUtils/hiveUtils';

export function FloatingUpgradeButton() {
  const [activeStatus, setActiveStatus] = useState(null); // don't default it to a string

  useEffect(() => {
    const status = "Active"//mosyGetLSData("emberBillStatus");
    setActiveStatus(status);
  }, []);

  const handleClick = useCallback(() => {
    loadBillingPage();
  }, []);

  // Still loading from localStorage? Don't render anything yet.
  if (activeStatus === null) return null;

  if (activeStatus === "Active") return null;
  return null;

  return (
    <div style={floatingStyle}>
      <button className="btn btn-primary rounded-pill shadow-sm px-4" onClick={handleClick}>
        <i className="fa fa-star"></i> Renew / Upgrade
      </button>
    </div>
  );
}

const floatingStyle = {
  position: 'fixed',
  bottom: '20px',
  right: '20px',
  zIndex: 99,
};


export function PremiumDataBtn({ buttonName = "Manage" }) {
  const [activeStatus, setActiveStatus] = useState(null);

  useEffect(() => {
    const status = mosyGetLSData("emberBillStatus");
    setActiveStatus(status);
  }, []);

  const handleClick = useCallback(() => {
    loadBillingPage();
  }, []);

  // Still loading? Don't show button
  if (activeStatus === null) return null;

  // Account is active? Hide button
  if (activeStatus === "Active") return null;

  return (
    <a
      className="medium_btn border border_set btn-warning cpointer hive_list_nav_refresh ml-3"
      onClick={handleClick}
    >
      <i className="fa fa-star mr-1"></i> {buttonName}
    </a>
  );
}



