-- phpMyAdmin SQL Dump
-- version 4.3.11
-- http://www.phpmyadmin.net
--
-- Host: 127.0.0.1
-- Generation Time: Feb 22, 2026 at 05:07 PM
-- Server version: 5.6.24
-- PHP Version: 5.6.8

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Database: `bluenova`
--

-- --------------------------------------------------------

--
-- Table structure for table `page_manifest_`
--

CREATE TABLE IF NOT EXISTS `page_manifest_` (
  `primkey` int(255) NOT NULL,
  `manikey` varchar(500) NOT NULL,
  `page_group` varchar(500) NOT NULL,
  `site_id` varchar(500) NOT NULL,
  `page_url` varchar(500) NOT NULL,
  `hive_site_id` varchar(500) NOT NULL,
  `hive_site_name` varchar(500) NOT NULL,
  `project_id` varchar(500) NOT NULL,
  `project_name` varchar(500) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=latin1;

--
-- Dumping data for table `page_manifest_`
--

INSERT INTO `page_manifest_` (`primkey`, `manikey`, `page_group`, `site_id`, `page_url`, `hive_site_id`, `hive_site_name`, `project_id`, `project_name`) VALUES
(1, 'appdna', 'Mpesa', '', 'appdna', '', '', '', ''),
(2, 'disbursmentwebhook', 'Mpesa', '', 'disbursmentwebhook', '', '', '', ''),
(3, 'initrecon', 'Mpesa', '', 'initrecon', '', '', '', ''),
(4, 'mosy_paginate', 'Mpesa', '', 'mosy_paginate', '', '', '', ''),
(5, 'mpesacollections_list', 'Mpesa', '', 'mpesacollections_list', '', '', '', ''),
(6, 'mpesacollections_profile', 'Mpesa', '', 'mpesacollections_profile', '', '', '', ''),
(7, 'overall_user_functions_list', 'Mpesa', '', 'overall_user_functions_list', '', '', '', ''),
(8, 'paymentwebhook', 'Mpesa', '', 'paymentwebhook', '', '', '', ''),
(9, 'reconciliations_list', 'Mpesa', '', 'reconciliations_list', '', '', '', ''),
(10, 'reconciliations_profile', 'Mpesa', '', 'reconciliations_profile', '', '', '', ''),
(11, 'role_functions_list', 'Mpesa', '', 'role_functions_list', '', '', '', ''),
(12, 'role_functions_profile', 'Mpesa', '', 'role_functions_profile', '', '', '', ''),
(13, 'sysconfigs_list', 'Mpesa', '', 'sysconfigs_list', '', '', '', ''),
(14, 'sysconfigs_profile', 'Mpesa', '', 'sysconfigs_profile', '', '', '', ''),
(15, 'system_role_bundles_list', 'User role management', '', 'system_role_bundles_list', '', '', '', ''),
(16, 'system_role_bundles_profile', 'User role management', '', 'system_role_bundles_profile', '', '', '', ''),
(17, 'system_users_list', 'Mpesa', '', 'system_users_list', '', '', '', ''),
(18, 'system_users_profile', 'Mpesa', '', 'system_users_profile', '', '', '', ''),
(19, 'system_users_w_roles_list', 'Mpesa', '', 'system_users_w_roles_list', '', '', '', ''),
(20, 'system_users_w_roles_profile', 'Mpesa', '', 'system_users_w_roles_profile', '', '', '', ''),
(21, 'trxrecon', 'Mpesa', '', 'trxrecon', '', '', '', ''),
(22, 'acc_control', 'User roles', '', 'acc_control', '', '', '', ''),
(23, 'bundle_functions_list', 'User roles', '', 'bundle_functions_list', '', '', '', ''),
(24, 'bundle_functions_profile', 'User roles', '', 'bundle_functions_profile', '', '', '', ''),
(25, 'login', 'User roles', '', 'login', '', '', '', ''),
(26, 'register', 'User roles', '', 'register', '', '', '', ''),
(27, 'resetpassword', 'User roles', '', 'resetpassword', '', '', '', ''),
(28, 'saconfig', 'User roles', '', 'saconfig', '', '', '', ''),
(29, 'sasplash', 'User roles', '', 'sasplash', '', '', '', ''),
(30, 'sauth_oauth', 'User roles', '', 'sauth_oauth', '', '', '', ''),
(31, 'sauth_sessionlogout', 'User roles', '', 'sauth_sessionlogout', '', '', '', ''),
(32, 'sauth_sessionmonitor', 'User roles', '', 'sauth_sessionmonitor', '', '', '', ''),
(33, 'sa_access', 'User roles', '', 'sa_access', '', '', '', ''),
(34, 'superadmin_acc_control', 'User roles', '', 'superadmin_acc_control', '', '', '', ''),
(35, 'userdenied', 'Basic pages', '', 'userdenied', '', '', '', '');

-- --------------------------------------------------------

--
-- Table structure for table `system_module_manifest_`
--

CREATE TABLE IF NOT EXISTS `system_module_manifest_` (
  `primkey` int(255) NOT NULL,
  `record_id` varchar(255) NOT NULL,
  `component_name` varchar(255) NOT NULL,
  `module_key` varchar(255) NOT NULL,
  `module_name` varchar(255) NOT NULL,
  `permission_type` varchar(100) NOT NULL,
  `capability_key` varchar(255) NOT NULL,
  `access_name` varchar(255) NOT NULL,
  `relative_path` varchar(500) NOT NULL,
  `hive_site_id` varchar(500) NOT NULL,
  `hive_site_name` varchar(500) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=latin1;

--
-- Dumping data for table `system_module_manifest_`
--

INSERT INTO `system_module_manifest_` (`primkey`, `record_id`, `component_name`, `module_key`, `module_name`, `permission_type`, `capability_key`, `access_name`, `relative_path`, `hive_site_id`, `hive_site_name`) VALUES
(1, '', 'SystemmodulemanifestList', 'ACCESSCONTROL', 'Accesscontrol', 'VIEW', 'VIEW_SYSTEM_MODULE_MANIFEST_', 'View system module manifest ', 'accesscontrol/uiControl/SystemmodulemanifestList.jsx', '', ''),
(2, '', 'SystemmodulemanifestProfile', 'ACCESSCONTROL', 'Accesscontrol', 'MANAGE', 'MANAGE_SYSTEM_MODULE_MANIFEST_', 'Manage system module manifest ', 'accesscontrol/uiControl/SystemmodulemanifestProfile.jsx', '', ''),
(3, '', 'AppUsersProfile', 'APP_USERS', 'App users', 'MANAGE', 'APP_USERS_MANAGE', 'App users manage', 'app_users/uiControl/AppUsersProfile.jsx', '', ''),
(4, '', 'DigitalassetlistList', 'ASSETS', 'Assets', 'VIEW', 'VIEW_ASSETS', 'View assets', 'assets/uiControl/DigitalassetlistList.jsx', '', ''),
(5, '', 'DigitalassetlistProfile', 'ASSETS', 'Assets', 'MANAGE', 'MANAGE_ASSETS', 'Manage assets', 'assets/uiControl/DigitalassetlistProfile.jsx', '', ''),
(6, '', 'AssetpricingList', 'ASSET_PRICING', 'Asset pricing', 'VIEW', 'VIEW_ASSET_PRICING', 'View asset pricing', 'asset_pricing/uiControl/AssetpricingList.jsx', '', ''),
(7, '', 'AssetpricingProfile', 'ASSET_PRICING', 'Asset pricing', 'MANAGE', 'MANAGE_ASSET_PRICING', 'Manage asset pricing', 'asset_pricing/uiControl/AssetpricingProfile.jsx', '', ''),
(8, '', 'UserrolefunctionsList', 'BUNDLEFUNCTIONS', 'Bundlefunctions', 'VIEW', 'VIEW_USER_BUNDLE_ROLE_FUNCTIONS', 'View user bundle role functions', 'bundlefunctions/uiControl/UserrolefunctionsList.jsx', '', ''),
(9, '', 'UserrolefunctionsProfile', 'BUNDLEFUNCTIONS', 'Bundlefunctions', 'MANAGE', 'MANAGE_USER_BUNDLE_ROLE_FUNCTIONS', 'Manage user bundle role functions', 'bundlefunctions/uiControl/UserrolefunctionsProfile.jsx', '', ''),
(10, '', 'EntitlementsList', 'ENTITLEMENTS', 'Entitlements', 'VIEW', 'ENTITLEMENTS_VIEW', 'Entitlements view', 'entitlements/uiControl/EntitlementsList.jsx', '', ''),
(11, '', 'InvoicesList', 'INVOICES', 'Invoices', 'VIEW', 'VIEW_INVOICES', 'View invoices', 'invoices/uiControl/InvoicesList.jsx', '', ''),
(12, '', 'InvoicesProfile', 'INVOICES', 'Invoices', 'MANAGE', 'MANAGE_INVOICES', 'Manage invoices', 'invoices/uiControl/InvoicesProfile.jsx', '', ''),
(13, '', 'ManageassetpricingList', 'MANAGEPRICING', 'Managepricing', 'VIEW', 'VIEW_ASSET_PRICING', 'View asset pricing', 'managepricing/uiControl/ManageassetpricingList.jsx', '', ''),
(14, '', 'ManageassetpricingProfile', 'MANAGEPRICING', 'Managepricing', 'MANAGE', 'MANAGE_ASSET_PRICING', 'Manage asset pricing', 'managepricing/uiControl/ManageassetpricingProfile.jsx', '', ''),
(15, '', 'SentmessagesList', 'MESSAGES', 'Messages', 'VIEW', 'VIEW_SENT_MESSAGES', 'View sent messages', 'messages/uiControl/SentmessagesList.jsx', '', ''),
(16, '', 'SentmessagesProfile', 'MESSAGES', 'Messages', 'MANAGE', 'MANAGE_SENT_MESSAGES', 'Manage sent messages', 'messages/uiControl/SentmessagesProfile.jsx', '', ''),
(17, '', 'OrdersList', 'ORDERS', 'Orders', 'VIEW', 'VIEW_ORDERS', 'View orders', 'orders/uiControl/OrdersList.jsx', '', ''),
(18, '', 'OrdersProfile', 'ORDERS', 'Orders', 'MANAGE', 'MANAGE_ORDERS', 'Manage orders', 'orders/uiControl/OrdersProfile.jsx', '', ''),
(19, '', 'OrderItemsList', 'ORDER_ITEMS', 'Order items', 'VIEW', 'ORDER_ITEMS_VIEW', 'Order items view', 'order_items/uiControl/OrderItemsList.jsx', '', ''),
(20, '', 'PaymentsList', 'PAYMENTS', 'Payments', 'VIEW', 'VIEW_PAYMENTS', 'View payments', 'payments/uiControl/PaymentsList.jsx', '', ''),
(21, '', 'PaymentsProfile', 'PAYMENTS', 'Payments', 'MANAGE', 'MANAGE_PAYMENTS', 'Manage payments', 'payments/uiControl/PaymentsProfile.jsx', '', ''),
(22, '', 'SystemrolesList', 'ROLEBUNDLES', 'Rolebundles', 'VIEW', 'VIEW_SYSTEM_ROLE_BUNDLES', 'View system role bundles', 'rolebundles/uiControl/SystemrolesList.jsx', '', ''),
(23, '', 'SystemrolesProfile', 'ROLEBUNDLES', 'Rolebundles', 'MANAGE', 'MANAGE_SYSTEM_ROLE_BUNDLES', 'Manage system role bundles', 'rolebundles/uiControl/SystemrolesProfile.jsx', '', ''),
(24, '', 'SelectsubscriptiontoinvoiceList', 'SUBSCRIPTIONS', 'Subscriptions', 'VIEW', 'VIEW_SUBSCRIPTIONS', 'View subscriptions', 'subscriptions/uiControl/SelectsubscriptiontoinvoiceList.jsx', '', ''),
(25, '', 'SelectsubscriptiontoinvoiceProfile', 'SUBSCRIPTIONS', 'Subscriptions', 'MANAGE', 'MANAGE_SUBSCRIPTIONS', 'Manage subscriptions', 'subscriptions/uiControl/SelectsubscriptiontoinvoiceProfile.jsx', '', ''),
(26, '', 'SubscriptionsList', 'SUBSCRIPTIONS', 'Subscriptions', 'VIEW', 'VIEW_SUBSCRIPTIONS', 'View subscriptions', 'subscriptions/uiControl/SubscriptionsList.jsx', '', ''),
(27, '', 'SubscriptionsProfile', 'SUBSCRIPTIONS', 'Subscriptions', 'MANAGE', 'MANAGE_SUBSCRIPTIONS', 'Manage subscriptions', 'subscriptions/uiControl/SubscriptionsProfile.jsx', '', ''),
(28, '', 'SystemusersList', 'SYSUSERS', 'Sysusers', 'VIEW', 'VIEW_SYSTEM_USERS', 'View system users', 'sysusers/uiControl/SystemusersList.jsx', '', ''),
(29, '', 'SystemusersProfile', 'SYSUSERS', 'Sysusers', 'MANAGE', 'MANAGE_SYSTEM_USERS', 'Manage system users', 'sysusers/uiControl/SystemusersProfile.jsx', '', ''),
(30, '', 'ActiveappusersList', 'USERS', 'Users', 'VIEW', 'VIEW_APP_USERS', 'View app users', 'users/uiControl/ActiveappusersList.jsx', '', ''),
(31, '', 'ActiveappusersProfile', 'USERS', 'Users', 'MANAGE', 'MANAGE_APP_USERS', 'Manage app users', 'users/uiControl/ActiveappusersProfile.jsx', '', ''),
(32, '', 'ApiuserlistList', 'USERS', 'Users', 'VIEW', 'VIEW_APP_USERS', 'View app users', 'users/uiControl/ApiuserlistList.jsx', '', ''),
(33, '', 'ApiuserlistProfile', 'USERS', 'Users', 'MANAGE', 'MANAGE_APP_USERS', 'Manage app users', 'users/uiControl/ApiuserlistProfile.jsx', '', ''),
(34, '', 'InactiveusersList', 'USERS', 'Users', 'VIEW', 'VIEW_APP_USERS', 'View app users', 'users/uiControl/InactiveusersList.jsx', '', ''),
(35, '', 'InactiveusersProfile', 'USERS', 'Users', 'MANAGE', 'MANAGE_APP_USERS', 'Manage app users', 'users/uiControl/InactiveusersProfile.jsx', '', ''),
(36, '', 'PlatformuserlistList', 'USERS', 'Users', 'VIEW', 'VIEW_APP_USERS', 'View app users', 'users/uiControl/PlatformuserlistList.jsx', '', ''),
(37, '', 'PlatformuserlistProfile', 'USERS', 'Users', 'MANAGE', 'MANAGE_APP_USERS', 'Manage app users', 'users/uiControl/PlatformuserlistProfile.jsx', '', '');

-- --------------------------------------------------------

--
-- Table structure for table `system_role_bundles`
--

CREATE TABLE IF NOT EXISTS `system_role_bundles` (
  `primkey` int(255) NOT NULL,
  `record_id` varchar(500) NOT NULL,
  `bundle_id` varchar(500) NOT NULL,
  `bundle_name` varchar(500) NOT NULL,
  `remark` longtext NOT NULL,
  `hive_site_id` varchar(500) NOT NULL,
  `hive_site_name` varchar(500) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=latin1;

--
-- Dumping data for table `system_role_bundles`
--

INSERT INTO `system_role_bundles` (`primkey`, `record_id`, `bundle_id`, `bundle_name`, `remark`, `hive_site_id`, `hive_site_name`) VALUES
(2, 'SAKKRGH', 'ZHQBB44RD1', 'Station manager', 'Station manager role', '', ''),
(4, 'EEYP1J3', '', 'Station attendant', 'Station attendant', '', ''),
(5, 'OY9TU6C', '', 'Regional manager', 'Regional manager', '', ''),
(6, '3TT9BJ2', '', 'Finance manager', 'Finance manager', '', ''),
(7, '4I9JFN3', '', 'Team lead', '', '', ''),
(8, 'YEPA2OZ', '', 'Invoice manager', '', '', '');

-- --------------------------------------------------------

--
-- Table structure for table `system_users`
--

CREATE TABLE IF NOT EXISTS `system_users` (
  `primkey` int(255) NOT NULL,
  `record_id` varchar(500) NOT NULL,
  `name` varchar(500) NOT NULL,
  `email` varchar(500) NOT NULL,
  `tel` varchar(500) NOT NULL,
  `login_password` varchar(500) NOT NULL,
  `ref_id` varchar(500) NOT NULL,
  `regdate` datetime NOT NULL,
  `user_no` varchar(500) NOT NULL,
  `user_pic` varchar(500) NOT NULL,
  `user_gender` varchar(500) NOT NULL,
  `last_seen` varchar(500) NOT NULL,
  `about` longtext NOT NULL,
  `hive_site_id` varchar(500) NOT NULL,
  `hive_site_name` varchar(500) NOT NULL,
  `auth_token` varchar(500) NOT NULL,
  `token_status` varchar(500) NOT NULL,
  `token_expiring_in` varchar(500) NOT NULL,
  `project_id` varchar(500) NOT NULL,
  `project_name` varchar(500) NOT NULL,
  `user_role` varchar(500) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;

--
-- Dumping data for table `system_users`
--

INSERT INTO `system_users` (`primkey`, `record_id`, `name`, `email`, `tel`, `login_password`, `ref_id`, `regdate`, `user_no`, `user_pic`, `user_gender`, `last_seen`, `about`, `hive_site_id`, `hive_site_name`, `auth_token`, `token_status`, `token_expiring_in`, `project_id`, `project_name`, `user_role`) VALUES
(1, '1FN4ZHN', 'Superadmin', 'superadmin', '', 'admin001', 'ZH1OA9PUWQ', '2024-12-28 00:00:00', '', 'media/system_users/1771736164066_4f364804-58bb-427b-a566-2ffbd2f78268.png', '', '', '', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin', '08ZQCN6TVG02X3LPBJJGGAWJ49COOYV2ZC5FDV9ZPJRHASR40LVL6G66MAAJRL9WCCP0SZP2WIWS1DBE1JMM9HUOJ6L9630M37MGKYKZHCEY6T9JHCPIQEV1SYBV0H477XWSQTRTG1A0O4KLA079L69AFLDC7QMOOKKZ9JDHSM', 'Active', '2025-03-18 16:42:55', '', '', 'OY9TU6C'),
(3, 'NCPLHWZ', 'Jeremiah Alex mgr', 'jereasanya@gmail.com', '0710766390', 'alex', 'SHZMXAWFO0', '2025-03-12 00:00:00', '', 'media/system_users/1771710613108_gift_basket (1).png', 'Male', '', '', '', '', '', '', '', '', '', 'YEPA2OZ');

-- --------------------------------------------------------

--
-- Table structure for table `user_bundle_role_functions`
--

CREATE TABLE IF NOT EXISTS `user_bundle_role_functions` (
  `primkey` int(255) NOT NULL,
  `record_id` varchar(500) NOT NULL,
  `bundle_id` varchar(500) NOT NULL,
  `bundle_name` varchar(500) NOT NULL,
  `role_id` varchar(500) NOT NULL,
  `role_name` varchar(500) NOT NULL,
  `remark` longtext NOT NULL,
  `hive_site_id` varchar(500) NOT NULL,
  `hive_site_name` varchar(500) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=latin1;

--
-- Dumping data for table `user_bundle_role_functions`
--

INSERT INTO `user_bundle_role_functions` (`primkey`, `record_id`, `bundle_id`, `bundle_name`, `role_id`, `role_name`, `remark`, `hive_site_id`, `hive_site_name`) VALUES
(1, 'RHZGTZE', '5PT77YI2YB', 'Accountant', 'Basic pages', '', '', '', ''),
(2, 'T5D609X', '5PT77YI2YB', 'Accountant', 'User roles', '', '', '', ''),
(3, 'G6C5BJX', '5PT77YI2YB', 'Accountant', 'Mpesa', '', '', '', ''),
(4, 'NYZME5V', '5PT77YI2YB', 'Accountant', 'User role management', '', '', '', ''),
(10, 'MRKWT1A', '', '', 'MAKE_PAYMENTS', '', '', '', ''),
(12, 'MILI2X3', '', '', 'MAKE_PAYMENTS', '', '', '', ''),
(13, 'IF6U5QX', '', '', 'MAKE_PAYMENTS', '', '', '', ''),
(14, '1X2VHDW', '', '', 'MAKE_PAYMENTS', 'Make payments', '', '', ''),
(15, 'HRO5F9S', '3TT9BJ2', 'Finance manager', 'MAKE_PAYMENTS', 'Make payments', '', '', ''),
(16, 'MLDYGNJ', '3TT9BJ2', 'Finance manager', 'MANAGE_SUBSCRIPTIONS', 'Manage subscriptions', '', '', ''),
(17, 'NTE4MS2', '3TT9BJ2', 'Finance manager', 'MANAGE_INVOICES', 'Manage invoices', '', '', ''),
(18, 'JEGJRHY', '3TT9BJ2', 'Finance manager', 'MANAGE_ASSETS', 'Manage assets', '', '', ''),
(19, 'ZJBOCIM', '3TT9BJ2', 'Finance manager', 'VIEW_ASSETS', 'View assets', '', '', ''),
(21, '9XN90ZB', '3TT9BJ2', 'Finance manager', 'VIEW_ASSET_PRICING', 'View asset pricing', '', '', ''),
(22, '3N4THMW', '3TT9BJ2', 'Finance manager', 'VIEW_APP_USERS', 'View app users', '', '', ''),
(24, '966AV2A', 'OY9TU6C', 'Regional manager', 'VIEW_ASSETS', 'View assets', '', '', ''),
(25, 'Z37NJL1', 'OY9TU6C', 'Regional manager', 'MANAGE_ASSETS', 'Manage assets', '', '', ''),
(26, 'VIE12XX', 'OY9TU6C', 'Regional manager', 'MANAGE_INVOICES', 'Manage invoices', '', '', ''),
(27, 'T7R2WBG', 'OY9TU6C', 'Regional manager', 'VIEW_INVOICES', 'View invoices', '', '', ''),
(28, 'T2SZOQO', 'OY9TU6C', 'Regional manager', 'VIEW_APP_USERS', 'View app users', '', '', ''),
(29, 'SOMU4LO', 'OY9TU6C', 'Regional manager', 'MANAGE_APP_USERS', 'Manage app users', '', '', ''),
(30, 'LVJHQ6R', 'EEYP1J3', 'Station attendant', 'VIEW_APP_USERS', 'View app users', '', '', ''),
(32, '9DJY1WW', '4I9JFN3', 'Team lead', 'VIEW_SYSTEM_MODULE_MANIFEST_', 'View system module manifest ', '', '', ''),
(33, 'QI3S2ZC', '4I9JFN3', 'Team lead', 'MAKE_PAYMENTS', 'Make payments', '', '', ''),
(34, 'HU6I303', 'SAKKRGH', 'Station manager', 'MANAGE_APP_USERS', 'Manage app users', '', '', ''),
(35, 'I056CXU', 'SAKKRGH', 'Station manager', 'MANAGE_SUBSCRIPTIONS', 'Manage subscriptions', '', '', ''),
(36, 'I53TGRW', 'YEPA2OZ', 'Invoice manager', 'VIEW_INVOICES', 'View invoices', '', '', ''),
(37, '4PMTKIZ', 'YEPA2OZ', 'Invoice manager', 'VIEW_PAYMENTS', 'View payments', '', '', ''),
(39, 'VV2USQ6', 'YEPA2OZ', 'Invoice manager', 'MANAGE_SYSTEM_ROLE_BUNDLES', 'Manage system role bundles', '', '', ''),
(41, '2KKNSL3', 'YEPA2OZ', 'Invoice manager', 'VIEW_USER_BUNDLE_ROLE_FUNCTIONS', 'View user bundle role functions', '', '', ''),
(42, 'Q7HQFR3', 'YEPA2OZ', 'Invoice manager', 'MANAGE_USER_BUNDLE_ROLE_FUNCTIONS', 'Manage user bundle role functions', '', '', ''),
(43, 'ZGL4382', 'YEPA2OZ', 'Invoice manager', 'MANAGE_APP_USERS', 'Manage app users', '', '', ''),
(44, '0SXKKYM', 'YEPA2OZ', 'Invoice manager', 'VIEW_APP_USERS', 'View app users', '', '', ''),
(45, 'TBWG3G1', 'YEPA2OZ', 'Invoice manager', 'VIEW_SYSTEM_ROLE_BUNDLES', 'View system role bundles', '', '', ''),
(46, 'FVZROJU', 'YEPA2OZ', 'Invoice manager', 'VIEW_SYSTEM_MODULE_MANIFEST_', 'View system module manifest ', '', '', ''),
(47, 'ZPQ8AJF', 'YEPA2OZ', 'Invoice manager', 'MANAGE_SYSTEM_MODULE_MANIFEST_', 'Manage system module manifest ', '', '', '');

-- --------------------------------------------------------

--
-- Table structure for table `user_manifest_`
--

CREATE TABLE IF NOT EXISTS `user_manifest_` (
  `primkey` int(255) NOT NULL,
  `admin_mkey` varchar(500) NOT NULL,
  `user_id` varchar(500) NOT NULL,
  `user_name` varchar(500) NOT NULL,
  `role_id` varchar(500) NOT NULL,
  `site_id` varchar(500) NOT NULL,
  `role_name` varchar(500) NOT NULL,
  `hive_site_id` varchar(500) NOT NULL,
  `hive_site_name` varchar(500) NOT NULL,
  `project_id` varchar(500) NOT NULL,
  `project_name` varchar(500) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `page_manifest_`
--
ALTER TABLE `page_manifest_`
  ADD PRIMARY KEY (`primkey`);

--
-- Indexes for table `system_module_manifest_`
--
ALTER TABLE `system_module_manifest_`
  ADD PRIMARY KEY (`primkey`);

--
-- Indexes for table `system_role_bundles`
--
ALTER TABLE `system_role_bundles`
  ADD PRIMARY KEY (`primkey`);

--
-- Indexes for table `system_users`
--
ALTER TABLE `system_users`
  ADD PRIMARY KEY (`primkey`);

--
-- Indexes for table `user_bundle_role_functions`
--
ALTER TABLE `user_bundle_role_functions`
  ADD PRIMARY KEY (`primkey`);

--
-- Indexes for table `user_manifest_`
--
ALTER TABLE `user_manifest_`
  ADD PRIMARY KEY (`primkey`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `page_manifest_`
--
ALTER TABLE `page_manifest_`
  MODIFY `primkey` int(255) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=36;
--
-- AUTO_INCREMENT for table `system_module_manifest_`
--
ALTER TABLE `system_module_manifest_`
  MODIFY `primkey` int(255) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=38;
--
-- AUTO_INCREMENT for table `system_role_bundles`
--
ALTER TABLE `system_role_bundles`
  MODIFY `primkey` int(255) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=9;
--
-- AUTO_INCREMENT for table `system_users`
--
ALTER TABLE `system_users`
  MODIFY `primkey` int(255) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=4;
--
-- AUTO_INCREMENT for table `user_bundle_role_functions`
--
ALTER TABLE `user_bundle_role_functions`
  MODIFY `primkey` int(255) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=48;
--
-- AUTO_INCREMENT for table `user_manifest_`
--
ALTER TABLE `user_manifest_`
  MODIFY `primkey` int(255) NOT NULL AUTO_INCREMENT;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
