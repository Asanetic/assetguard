'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { mosyGetLSData, dayTime } from '../MosyUtils/hiveUtils';
import saAuthConfigs from '../auth/featureConfig/saAuthConfigs';
import { destroyAppSession } from '../auth/AuthUtils';
import { hiveRoutes } from '../appConfigs/hiveRoutes';
import initSidebarControls from './initSideBarControl';
import { sidebarConfig } from '../appConfigs/sidebarConfigPOS';
//import { staffSidebarConfig } from '../appConfigs/staffSideBar';
import { loadTrxHistory } from '../mosybilling/PricingCards';
import { userHasBundle } from '../auth/authAccesControl';



export default function NavSidebar({
  appName = 'MosyApp',
  appLogo = '/img/sampleimg1.jpg',
  userAvatar = '/img/useravatar.png',
  appLogoStyle = { height: '50px', width: 'auto', marginRight: '20px' },
  indexPage = '/',
  userRole = 'User', // pass role from auth/session
}) {
  const { sessionPrefix, usernameCol } = saAuthConfigs;
  const cookieKey = `${sessionPrefix}_sa_authsess_${usernameCol}_val`;
  const [username, setUsername] = useState('User');

  const [isAttendant, setIsAttendant] = useState(true);
  // useEffect(() => {
  //   const usernameRaw = mosyGetLSData(cookieKey);
  //   if (usernameRaw) setUsername(usernameRaw.split(' ')[0]);
  //   initSidebarControls();
  //   setIsAttendant(userHasBundle(`QQC2C51`));

  // }, [isAttendant]);
  useEffect(() => {

    const usernameRaw = mosyGetLSData(cookieKey);
  
    if (usernameRaw) {
      setUsername(usernameRaw.split(' ')[0]);
    }
  
    setIsAttendant(userHasBundle('QQC2C51'));
  
  }, []);
  
  useEffect(() => {
  
    const cleanup = initSidebarControls();
  
    return () => {
      if (cleanup) cleanup();
    };
  
  }, [isAttendant]);

  const canView = (item) => {
    if (!item.roles) return true;          // no roles = show
    if (item.roles.length === 0) return true; // empty roles = show to everyone
    if (!userRole) return true;            // no userRole argument = show
    return item.roles.includes(userRole); // otherwise check match
  };
  
  const renderMenuItem = (item, idx) => {
    if (!canView(item)) return null;

    if (item.type === 'link') {
      return (
        <li key={idx}>
          <a className="nav-link" href={item.href(hiveRoutes)}>
            <i className={item.icon}></i> <span>{item.label}</span>
          </a>
        </li>
      );
    }

    if (item.type === 'action') {
      return (
        <li key={idx}>
          <a className="nav-link cpointer text-white"  onClick={item.onClick}>
            <i className={item.icon}></i> <span>{item.label}</span>
          </a>
        </li>
      );
    }

    if (item.type === 'submenu') {
      const visibleItems = item.items.filter(canView);
      if (visibleItems.length === 0) return null;

      return (
        <li className="submenu" key={idx}>
          <a href="#">
            <i className={item.icon}></i> <span>{item.label}</span>
            <span className="menu-arrow"></span>
          </a>
          <ul style={{ display: 'none' }}>
            {visibleItems.map((sub, sIdx) => (
              <li key={sIdx}>
                <a className="nav-link" href={sub.href(hiveRoutes)}>
                  {sub.label}
                </a>
              </li>
            ))}
          </ul>
        </li>
      );
    }

    return null;
  };

  return (
    <>
      {/* Header */}
      <div className="header">
        <div className="header-left">
          <a className="mobile_btn cpointer" id="mobile_btn"><i className="fa fa-bars" /></a>
          <span id="toggle_btn" className="cpointer"><i className="fe fe-text-align-left" /></span>
          <Link href={indexPage} className="logo logo-small text-dark" style={{ marginLeft: '-100px' }}>
            <Image src={appLogo} alt="Logo" style={appLogoStyle} width={30} height={30} />
            <span className="bold h5">{appName}</span>
          </Link>
        </div>

        <div className="top-nav-search pt-2">
          <Link href={indexPage} className="logo text-dark">
            <Image src={appLogo} alt="Logo" style={appLogoStyle} width={30} height={30} />
            <span className="bold h5">{appName}</span>
          </Link>
        </div>

        <ul className="nav user-menu">
          <li className="nav-item dropdown has-arrow">
            <a href="#" className="dropdown-toggle nav-link" data-bs-toggle="dropdown">
              <span className="text-primary mr-2">Good {dayTime()} {username}</span>
              <span className="user-img">
                <Image className="rounded-circle" src={userAvatar} width={31} height={31} alt="Avatar" />
              </span>
            </a>
            <div className="dropdown-menu">
              <div className="user-header">
                <div className="avatar avatar-sm">
                  <Image src={userAvatar} alt="User Image" className="avatar-img rounded-circle" width={40} height={40} />
                </div>
                <div className="user-text">
                  <h6>{username}</h6>
                  <p className="text-muted mb-0">{userRole}</p>
                </div>
              </div>
              <a className="dropdown-item cpointer" onClick={() => destroyAppSession()}>Logout</a>
            </div>
          </li>
        </ul>
      </div>

      {/* Sidebar */}
      <div className="sidebar" id="sidebar">
        <div className="sidebar-inner slimscroll">
          <div id="sidebar-menu" className="sidebar-menu">
          <ul>
            <li className="menu-title p-4"></li>
              {sidebarConfig.map(renderMenuItem)}

            {/*
                isAttendant
                    ? staffSidebarConfig.map(renderMenuItem)
                    : sidebarConfig.map(renderMenuItem)
            */}
        </ul>
          </div>
        </div>
      </div>
    </>
  );
}
