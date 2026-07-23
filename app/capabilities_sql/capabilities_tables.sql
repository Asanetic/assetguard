-- phpMyAdmin SQL Dump
-- version 4.3.11
-- http://www.phpmyadmin.net
--
-- Host: 127.0.0.1
-- Generation Time: Jun 02, 2026 at 01:15 PM
-- Server version: 5.6.24
-- PHP Version: 5.6.8

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Database: `supercrm`
--

-- --------------------------------------------------------

--
-- Table structure for table `smart_messages`
--

CREATE TABLE IF NOT EXISTS `smart_messages` (
  `primkey` int(11) NOT NULL,
  `record_id` varchar(100) NOT NULL,
  `message_number` varchar(500) DEFAULT NULL,
  `related_record_id` varchar(500) DEFAULT NULL,
  `recipient_name` varchar(500) DEFAULT NULL,
  `recipient_phone` varchar(50) DEFAULT NULL,
  `recipient_email` varchar(255) DEFAULT NULL,
  `message_channel` varchar(500) DEFAULT NULL,
  `message_subject` varchar(500) DEFAULT NULL,
  `message_content` longtext,
  `message_status` varchar(500) DEFAULT NULL,
  `delivery_status` varchar(500) DEFAULT NULL,
  `request_source` varchar(500) DEFAULT NULL,
  `request_id` varchar(500) DEFAULT NULL,
  `sent_by` varchar(500) DEFAULT NULL,
  `scheduled_for` datetime DEFAULT NULL,
  `sent_on` datetime DEFAULT NULL,
  `delivered_on` datetime DEFAULT NULL,
  `read_on` datetime DEFAULT NULL,
  `failed_on` datetime DEFAULT NULL,
  `failure_reason` longtext,
  `created_on` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `hive_site_id` varchar(100) DEFAULT NULL,
  `hive_site_name` varchar(255) DEFAULT NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;

--
-- Dumping data for table `smart_messages`
--

INSERT INTO `smart_messages` (`primkey`, `record_id`, `message_number`, `related_record_id`, `recipient_name`, `recipient_phone`, `recipient_email`, `message_channel`, `message_subject`, `message_content`, `message_status`, `delivery_status`, `request_source`, `request_id`, `sent_by`, `scheduled_for`, `sent_on`, `delivered_on`, `read_on`, `failed_on`, `failure_reason`, `created_on`, `created_at`, `updated_at`, `hive_site_id`, `hive_site_name`) VALUES
(1, 'QXIHW1X', '', '', 'Jeremiah Alex', '0710766390', 'jereasanya@gmail.com', 'draft', 'Payment Request so new new', 'Hello {name} updated but new', 'draft', 'draft', 'clients_smart_message_draft', '', '', '0000-00-00 00:00:00', '0000-00-00 00:00:00', '0000-00-00 00:00:00', '0000-00-00 00:00:00', '0000-00-00 00:00:00', '', '0000-00-00 00:00:00', '0000-00-00 00:00:00', '0000-00-00 00:00:00', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(2, 'JYGDFW6', '', '', 'Jeremiah Alex', '0710766390', 'jereasanya@gmail.com', 'draft', 'Payment Request so new new', 'Hello {name} updated but new but updated', 'draft', 'draft', 'clients_smart_message_draft', '', '', '0000-00-00 00:00:00', '0000-00-00 00:00:00', '0000-00-00 00:00:00', '0000-00-00 00:00:00', '0000-00-00 00:00:00', '', '0000-00-00 00:00:00', '0000-00-00 00:00:00', '0000-00-00 00:00:00', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin');

-- --------------------------------------------------------

--
-- Table structure for table `smart_message_templates`
--

CREATE TABLE IF NOT EXISTS `smart_message_templates` (
  `primkey` int(11) NOT NULL,
  `record_id` varchar(100) NOT NULL,
  `template_name` varchar(500) DEFAULT NULL,
  `template_code` varchar(500) DEFAULT NULL,
  `template_category` varchar(500) DEFAULT NULL,
  `message_channel` varchar(500) DEFAULT NULL,
  `subject` varchar(500) DEFAULT NULL,
  `message_content` longtext,
  `template_status` varchar(500) DEFAULT NULL,
  `created_by` varchar(500) DEFAULT NULL,
  `last_updated_by` datetime DEFAULT NULL,
  `created_on` datetime DEFAULT NULL,
  `updated_on` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `hive_site_id` varchar(100) DEFAULT NULL,
  `hive_site_name` varchar(255) DEFAULT NULL
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=latin1;

--
-- Dumping data for table `smart_message_templates`
--

INSERT INTO `smart_message_templates` (`primkey`, `record_id`, `template_name`, `template_code`, `template_category`, `message_channel`, `subject`, `message_content`, `template_status`, `created_by`, `last_updated_by`, `created_on`, `updated_on`, `created_at`, `updated_at`, `hive_site_id`, `hive_site_name`) VALUES
(1, '00M7P6G', 'Website Stage 8', 'Payment_Balance_reminder', 'Seut', '', '', '', '', '', '2026-05-31 19:16:00', '0000-00-00 00:00:00', '2026-05-31 19:16:00', '2026-05-31 19:16:00', '2026-05-31 19:16:00', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(2, '7IJIV2Q', 'Website Stage 8', 'Payment_Balance_reminder', 'Seut', '', '', '', '', '', '2026-05-31 19:16:00', '0000-00-00 00:00:00', '2026-05-31 19:16:00', '2026-05-31 19:16:00', '2026-05-31 19:16:00', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(3, 'UCB9RLG', 'Red', 'Payment_Balance_reminder', 'Seut', '', 'Josprix hardware POS Sales Report', 'Hello {full_name} Friendly reminder to review the proposal we shared with you. Phone number {phone_number}', '', '', '2026-05-31 19:16:00', '0000-00-00 00:00:00', '2026-05-31 19:16:00', '2026-05-31 19:16:00', '2026-05-31 19:16:00', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(4, '7XC43W5', 'Red', 'invoice_bal', 'Seut', '', 'Invoice Reminder', 'Hello {name},\r\n\r\nThis is a friendly reminder that an outstanding balance of {amount} remains due for Invoice #{invoice_number}. \r\nPlease make payment by {due_date} to avoid service interruption. \r\n\r\nThank you.\r\n', '', '', '2026-05-31 19:16:00', '0000-00-00 00:00:00', '2026-05-31 19:16:00', '2026-05-31 19:16:00', '2026-05-31 19:16:00', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(5, '7U4P443', 'Payment Recived', 'Receipt payment acknowledgement', 'Smart Message', '', 'Payment Recived', 'Hello {name} your payment amount of {amount} has been received. \nThank you for your purchase', 'Active', '', '0000-00-00 00:00:00', '0000-00-00 00:00:00', '0000-00-00 00:00:00', '0000-00-00 00:00:00', '0000-00-00 00:00:00', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(6, 'YLYA4BY', 'Payment request note', 'payment Request note', 'Smart Message', '', 'Payment request note', 'Dear {name}, \r\nOur records indicate that your {request_title} has an outstanding balance of {amount}.\r\n\r\nKindly settle the amount by {due_date}. \r\n\r\n{request_notes}\r\n\r\nPaybill number  : {payment_shortcode}\r\nAccount : {request_reference}\r\nAmount : {amount}\r\n\r\n Thank you.', 'Active', '', '2026-06-01 11:19:00', '0000-00-00 00:00:00', '2026-06-01 11:19:00', '2026-06-01 11:19:00', '2026-06-01 11:19:00', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(9, 'L3V1N61', NULL, NULL, NULL, 'draft', NULL, 'Hello Jeremiah Alex your payment amount of {amount} has been received. \nThank you for your purchase', NULL, NULL, NULL, '0000-00-00 00:00:00', NULL, '0000-00-00 00:00:00', '0000-00-00 00:00:00', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(10, 'QR6MDGT', NULL, NULL, NULL, 'draft', NULL, 'Hello Jeremiah Alex your payment amount of {amount} has been received. \nThank you for your purchase', NULL, NULL, NULL, '0000-00-00 00:00:00', NULL, '0000-00-00 00:00:00', '0000-00-00 00:00:00', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(11, 'NZR67DC', NULL, NULL, NULL, 'draft', NULL, 'Hello Jeremiah Alex your payment amount of {amount} has been received. \nThank you for your purchase', NULL, NULL, NULL, '0000-00-00 00:00:00', NULL, '0000-00-00 00:00:00', '0000-00-00 00:00:00', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(12, 'GAHRSUB', NULL, NULL, NULL, 'draft', NULL, 'Hello {name}', NULL, NULL, NULL, '0000-00-00 00:00:00', NULL, '0000-00-00 00:00:00', '0000-00-00 00:00:00', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(13, 'HBRWE47', NULL, NULL, NULL, 'draft', NULL, 'Hello {name}', NULL, NULL, NULL, '0000-00-00 00:00:00', NULL, '0000-00-00 00:00:00', '0000-00-00 00:00:00', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(14, 'U9MJHXA', NULL, NULL, NULL, 'draft', NULL, 'Hello {name}', NULL, NULL, NULL, '0000-00-00 00:00:00', NULL, '0000-00-00 00:00:00', '0000-00-00 00:00:00', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(15, 'IMZ57AB', NULL, NULL, NULL, 'draft', NULL, 'Hello {name}', NULL, NULL, NULL, '0000-00-00 00:00:00', NULL, '0000-00-00 00:00:00', '0000-00-00 00:00:00', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(16, 'R1D5FF5', NULL, NULL, NULL, 'draft', NULL, 'Hello {name} new one', NULL, NULL, NULL, '0000-00-00 00:00:00', NULL, '0000-00-00 00:00:00', '0000-00-00 00:00:00', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(17, 'CWTTRT1', NULL, NULL, NULL, 'draft', NULL, 'Hello {name} new one', NULL, NULL, NULL, '0000-00-00 00:00:00', NULL, '0000-00-00 00:00:00', '0000-00-00 00:00:00', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(18, '4O77Y6O', NULL, NULL, NULL, 'draft', NULL, 'Hello {name} new one', NULL, NULL, NULL, '0000-00-00 00:00:00', NULL, '0000-00-00 00:00:00', '0000-00-00 00:00:00', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(19, 'WOFQVE7', NULL, NULL, NULL, 'draft', NULL, 'Hello {name}', NULL, NULL, NULL, '0000-00-00 00:00:00', NULL, '0000-00-00 00:00:00', '0000-00-00 00:00:00', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(20, 'UIAP2PP', NULL, NULL, NULL, 'draft', NULL, 'Hello {name}  hh', NULL, NULL, NULL, '0000-00-00 00:00:00', NULL, '0000-00-00 00:00:00', '0000-00-00 00:00:00', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(21, 'H0QRNKB', NULL, NULL, NULL, 'draft', NULL, 'Hello {name}', NULL, NULL, NULL, '0000-00-00 00:00:00', NULL, '0000-00-00 00:00:00', '0000-00-00 00:00:00', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(22, '91YSVDL', NULL, NULL, NULL, 'draft', NULL, 'Hello {name}', NULL, NULL, NULL, '0000-00-00 00:00:00', NULL, '0000-00-00 00:00:00', '0000-00-00 00:00:00', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin');

-- --------------------------------------------------------

--
-- Table structure for table `smart_payments`
--

CREATE TABLE IF NOT EXISTS `smart_payments` (
  `primkey` int(11) NOT NULL,
  `record_id` varchar(100) NOT NULL,
  `payment_reference` varchar(500) DEFAULT NULL,
  `request_reference` varchar(500) DEFAULT NULL,
  `related_module` varchar(500) DEFAULT NULL,
  `related_record_id` varchar(500) DEFAULT NULL,
  `receipt_number` varchar(500) DEFAULT NULL,
  `payer_name` varchar(500) DEFAULT NULL,
  `payer_phone` varchar(50) DEFAULT NULL,
  `payer_email` varchar(255) DEFAULT NULL,
  `payment_method` varchar(500) DEFAULT NULL,
  `payment_channel` varchar(500) DEFAULT NULL,
  `transaction_code` varchar(500) DEFAULT NULL,
  `currency` varchar(500) DEFAULT NULL,
  `amount_paid` decimal(10,2) DEFAULT NULL,
  `payment_description` varchar(500) DEFAULT NULL,
  `payment_notes` longtext,
  `payment_date` datetime DEFAULT NULL,
  `payment_status` varchar(500) DEFAULT NULL,
  `processed_by` varchar(500) DEFAULT NULL,
  `created_on` datetime DEFAULT NULL,
  `updated_on` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `hive_site_id` varchar(100) DEFAULT NULL,
  `hive_site_name` varchar(255) DEFAULT NULL
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=latin1;

--
-- Dumping data for table `smart_payments`
--

INSERT INTO `smart_payments` (`primkey`, `record_id`, `payment_reference`, `request_reference`, `related_module`, `related_record_id`, `receipt_number`, `payer_name`, `payer_phone`, `payer_email`, `payment_method`, `payment_channel`, `transaction_code`, `currency`, `amount_paid`, `payment_description`, `payment_notes`, `payment_date`, `payment_status`, `processed_by`, `created_on`, `updated_on`, `created_at`, `updated_at`, `hive_site_id`, `hive_site_name`) VALUES
(1, 'C5OREAB', 'PAY-1780305784442', 'SPR-1780300651356', 'smartpaymentrequests', '8I8JIET', 'QVCHKNE5O8', 'John mwende', '+254***59', 'jereasanya@gmail.com', 'M-Pesa', 'Pay Bill', 'QVCHKNE5O8', 'KES', '638.00', 'Invoice payment', 'IPN BillRef: MARAJUN2026; OrgBalance: 000.00; ThirdPartyTransID: 0', '2026-06-01 00:00:00', 'Completed', 'ipn-webhook', '2026-06-01 00:00:00', '2026-06-01 12:23:04', '2026-06-01 12:23:04', '2026-06-01 12:23:04', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(2, 'ZPOFVVJ', 'PAY-1780306010626', 'SPR-1780300651356', 'smartpaymentrequests', '8I8JIET', 'QVN017YFBG', 'Francis mwende', '+254***46', 'jereasanya@gmail.com', 'M-Pesa', 'Pay Bill', 'QVN017YFBG', 'KES', '1205.00', 'Invoice payment', 'IPN BillRef: MARAJUN2026; OrgBalance: 000.00; ThirdPartyTransID: 0', '2026-06-01 00:00:00', 'Completed', 'ipn-webhook', '2026-06-01 00:00:00', '2026-06-01 12:26:50', '2026-06-01 12:26:50', '2026-06-01 12:26:50', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(3, 'NEIF2RW', 'PAY-1780306285717', 'SPR-1780300651356', 'smartpaymentrequests', '8I8JIET', 'QVZ4KKOPZR', 'Francis mwende', '+254***21', 'jereasanya@gmail.com', 'M-Pesa', 'Pay Bill', 'QVZ4KKOPZR', 'KES', '1573.00', 'Invoice payment', 'IPN BillRef: MARAJUN2026; OrgBalance: 000.00; ThirdPartyTransID: 0', '2026-06-01 00:00:00', 'Completed', 'ipn-webhook', '2026-06-01 00:00:00', '2026-06-01 12:31:25', '2026-06-01 12:31:25', '2026-06-01 12:31:25', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(4, 'KV44SHG', 'PAY-1780306332225', 'SPR-1780300651356', 'smartpaymentrequests', '8I8JIET', 'QV8A52BW4P', 'Michael Wanjiku', '+254***12', 'jereasanya@gmail.com', 'M-Pesa', 'Pay Bill', 'QV8A52BW4P', 'KES', '472.00', 'Invoice payment', 'IPN BillRef: MARAJUN2026; OrgBalance: 000.00; ThirdPartyTransID: 0', '2026-06-01 00:00:00', 'Completed', 'ipn-webhook', '2026-06-01 00:00:00', '2026-06-01 12:32:12', '2026-06-01 12:32:12', '2026-06-01 12:32:12', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(5, '3X465JH', 'PAY-1780306352939', 'SPR-1780300651356', 'smartpaymentrequests', '8I8JIET', 'QV89CSXLJQ', 'Steven mwende', '+254***32', 'jereasanya@gmail.com', 'M-Pesa', 'Pay Bill', 'QV89CSXLJQ', 'KES', '1834.00', 'Invoice payment', 'IPN BillRef: MARAJUN2026; OrgBalance: 000.00; ThirdPartyTransID: 0', '2026-06-01 00:00:00', 'Completed', 'ipn-webhook', '2026-06-01 00:00:00', '2026-06-01 12:32:32', '2026-06-01 12:32:32', '2026-06-01 12:32:32', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(6, '5EAREEN', 'PAY-1780306355108', 'SPR-1780300651356', 'smartpaymentrequests', '8I8JIET', 'QVKYRLYCSQ', 'Michael Okoye', '+254***35', 'jereasanya@gmail.com', 'M-Pesa', 'Pay Bill', 'QVKYRLYCSQ', 'KES', '963.00', 'Invoice payment', 'IPN BillRef: MARAJUN2026; OrgBalance: 000.00; ThirdPartyTransID: 0', '2026-06-01 00:00:00', 'Completed', 'ipn-webhook', '2026-06-01 00:00:00', '2026-06-01 12:32:35', '2026-06-01 12:32:35', '2026-06-01 12:32:35', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(7, 'TASPRW3', 'PAY-1780306355500', 'SPR-1780300651356', 'smartpaymentrequests', '8I8JIET', 'QVNFNMNDQH', 'Jeremiah moraa', '+254***35', 'jereasanya@gmail.com', 'M-Pesa', 'Pay Bill', 'QVNFNMNDQH', 'KES', '1449.00', 'Invoice payment', 'IPN BillRef: MARAJUN2026; OrgBalance: 000.00; ThirdPartyTransID: 0', '2026-06-01 00:00:00', 'Completed', 'ipn-webhook', '2026-06-01 00:00:00', '2026-06-01 12:32:35', '2026-06-01 12:32:35', '2026-06-01 12:32:35', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(8, 'P7Z5ULU', 'PAY-1780306819046', 'SPR-1780300651356', 'smartpaymentrequests', '8I8JIET', 'QVUQRXFN0Q', 'Wambui mwambi', '+254***10', 'jereasanya@gmail.com', 'M-Pesa', 'Pay Bill', 'QVUQRXFN0Q', 'KES', '605.00', 'Invoice payment', 'IPN BillRef: MARAJUN2026; OrgBalance: 000.00; ThirdPartyTransID: 0', '2026-06-01 00:00:00', 'Completed', 'ipn-webhook', '2026-06-01 00:00:00', '2026-06-01 12:40:18', '2026-06-01 12:40:18', '2026-06-01 12:40:18', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(9, 'BXRAYMA', 'PAY-1780309865426', 'SPR-1780300651356', 'smartpaymentrequests', '8I8JIET', 'QV5BT2QITX', 'Francis moraa', '+254***58', 'jereasanya@gmail.com', 'M-Pesa', 'Pay Bill', 'QV5BT2QITX', 'KES', '5000.00', 'Invoice payment', 'IPN BillRef: TKYK4B; OrgBalance: 000.00; ThirdPartyTransID: 0', '2026-06-01 00:00:00', 'Completed', 'ipn-webhook', '2026-06-01 00:00:00', '2026-06-01 13:31:05', '2026-06-01 13:31:05', '2026-06-01 13:31:05', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin');

-- --------------------------------------------------------

--
-- Table structure for table `smart_payment_requests`
--

CREATE TABLE IF NOT EXISTS `smart_payment_requests` (
  `primkey` int(11) NOT NULL,
  `record_id` varchar(100) NOT NULL,
  `request_reference` varchar(500) DEFAULT NULL,
  `request_title` varchar(500) DEFAULT NULL,
  `related_module` varchar(500) DEFAULT NULL,
  `related_record_id` varchar(500) DEFAULT NULL,
  `payer_name` varchar(500) DEFAULT NULL,
  `payer_phone` varchar(50) DEFAULT NULL,
  `payer_email` varchar(255) DEFAULT NULL,
  `amount_requested` decimal(10,2) DEFAULT NULL,
  `amount_paid` decimal(10,2) DEFAULT NULL,
  `balance_amount` decimal(10,2) DEFAULT NULL,
  `payment_shortcode` varchar(500) DEFAULT NULL,
  `payment_link` varchar(500) DEFAULT NULL,
  `request_notes` longtext,
  `expiry_date` datetime DEFAULT NULL,
  `request_status` varchar(500) DEFAULT NULL,
  `created_by` varchar(500) DEFAULT NULL,
  `created_on` datetime DEFAULT NULL,
  `updated_on` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `hive_site_id` varchar(100) DEFAULT NULL,
  `hive_site_name` varchar(255) DEFAULT NULL
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=latin1;

--
-- Dumping data for table `smart_payment_requests`
--

INSERT INTO `smart_payment_requests` (`primkey`, `record_id`, `request_reference`, `request_title`, `related_module`, `related_record_id`, `payer_name`, `payer_phone`, `payer_email`, `amount_requested`, `amount_paid`, `balance_amount`, `payment_shortcode`, `payment_link`, `request_notes`, `expiry_date`, `request_status`, `created_by`, `created_on`, `updated_on`, `created_at`, `updated_at`, `hive_site_id`, `hive_site_name`) VALUES
(1, '6MJCCZ4', 'dfghjkl', 'invoice web design ', '', '', '', '', '', '0.00', '0.00', '0.00', '', '', '', '2026-06-01 09:20:00', '', '', '0000-00-00 00:00:00', '2026-06-01 09:20:00', '2026-06-01 09:20:00', '2026-06-01 09:20:00', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(2, '8I8JIET', 'SPR-1780300651356', 'Invoice payment', 'smartpaymentrequests', '', 'Suneka inco', '0710766390', 'jereasanya@gmail.com', '25000.00', '1843.00', '23157.00', '490923', '', 'Please pay now nwo', '0000-00-00 00:00:00', 'Partially Paid', 'superadmin', '2026-06-01 00:00:00', '2026-06-01 12:26:50', '2026-06-01 08:20:55', '2026-06-01 12:26:50', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(3, '7ZVPPA3', 'SPR-1780300124929', 'Invoice payment', 'smartpaymentrequests', '', 'Jeremiah Asanya', '0710766390', 'jereasanya@gmail.com', '25000.00', '0.00', '25000.00', '490923', '', 'Please pay now nwo', '0000-00-00 00:00:00', 'Pending', 'superadmin', '2026-06-01 00:00:00', '2026-06-01 07:48:44', '2026-06-01 07:48:44', '2026-06-01 07:48:44', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(4, 'QKUDGTK', 'SPR-1780300531519', 'Invoice payment', 'smartpaymentrequests', '', 'Jeremiah Asanya', '0710766390', 'jereasanya@gmail.com', '25000.00', '0.00', '25000.00', '490923', '', 'Please pay now nwo', '0000-00-00 00:00:00', 'Pending', 'superadmin', '2026-06-01 00:00:00', '2026-06-01 07:55:31', '2026-06-01 07:55:31', '2026-06-01 07:55:31', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(5, 'EQIKQHJ', 'MARAJUN2026', 'Mara welfare Platform Development balance', 'smartpaymentrequests', '', 'Jeremiah Asanya', '0710766390', 'jereasanya@gmail.com', '20000.00', '6896.00', '13104.00', '490923', '', '', '0000-00-00 00:00:00', 'Partially Paid', 'superadmin', '2026-06-01 00:00:00', '2026-06-01 12:40:18', '2026-06-01 08:45:34', '2026-06-01 12:40:18', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(6, 'IJRR1HX', 'COMBOINCO', 'Tropical dessert combo file', 'smartpaymentrequests', '', 'Jeremiah Asanya', '0710766390', 'jereasanya@gmail.com', '9500.00', '0.00', '9500.00', '490923', '', '', '0000-00-00 00:00:00', 'Pending', 'superadmin', '2026-06-01 00:00:00', '2026-06-01 09:35:15', '2026-06-01 09:35:15', '2026-06-01 09:35:15', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(7, 'DJJ3AP0', 'TKYK4B', 'Invoice payment', 'smartpaymentrequests', '', 'Trufinds Kargo', '0710766390', 'jereasanya@gmail.com', '8000.00', '5000.00', '3000.00', '490923', '', '', '0000-00-00 00:00:00', 'Partially Paid', 'superadmin', '2026-06-01 00:00:00', '2026-06-01 13:31:05', '2026-06-01 10:28:41', '2026-06-01 13:31:05', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(8, '5XQKTDR', 'ECR9PE', 'Mpesa Ipn set up', 'smartpaymentrequests', '', 'Eugene Chrysolite', '0710766390', 'jereasanya@gmail.com', '7000.00', '0.00', '7000.00', '490923', '', '', '0000-00-00 00:00:00', 'Pending', 'superadmin', '2026-06-01 00:00:00', '2026-06-01 10:43:58', '2026-06-01 10:43:58', '2026-06-01 10:43:58', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(9, '99S2AR9', 'JABXX3', 'Payment request for Jeremiah Alex', 'smartpaymentrequests', '', 'Jeremiah Alex', '0710766390', 'jereasanya@gmail.com', '8898.00', '0.00', '8898.00', '409 - 1961', '', '', '0000-00-00 00:00:00', 'Pending', 'superadmin', '2026-06-02 00:00:00', '2026-06-02 08:53:06', '2026-06-02 08:53:06', '2026-06-02 08:53:06', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin');

-- --------------------------------------------------------

--
-- Table structure for table `smart_payment_settings`
--

CREATE TABLE IF NOT EXISTS `smart_payment_settings` (
  `primkey` int(11) NOT NULL,
  `record_id` varchar(100) NOT NULL,
  `setting_name` varchar(500) DEFAULT NULL,
  `setting_code` varchar(500) DEFAULT NULL,
  `setting_value` longtext,
  `setting_category` varchar(500) DEFAULT NULL,
  `setting_status` varchar(500) DEFAULT NULL,
  `created_by` varchar(500) DEFAULT NULL,
  `last_updated_by` datetime DEFAULT NULL,
  `created_on` datetime DEFAULT NULL,
  `updated_on` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `hive_site_id` varchar(100) DEFAULT NULL,
  `hive_site_name` varchar(255) DEFAULT NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;

--
-- Dumping data for table `smart_payment_settings`
--

INSERT INTO `smart_payment_settings` (`primkey`, `record_id`, `setting_name`, `setting_code`, `setting_value`, `setting_category`, `setting_status`, `created_by`, `last_updated_by`, `created_on`, `updated_on`, `created_at`, `updated_at`, `hive_site_id`, `hive_site_name`) VALUES
(1, 'AJXP3G6', '', 'admin_email', 'jereasanya@gmail.com', '', '', '', '2026-06-01 12:37:00', '0000-00-00 00:00:00', '2026-06-01 12:37:00', '2026-06-01 12:37:00', '2026-06-01 12:37:00', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin'),
(2, '2K8XG6W', '', 'admin_tel', '0710766390', '', '', '', '2026-06-01 12:37:00', '0000-00-00 00:00:00', '2026-06-01 12:37:00', '2026-06-01 12:37:00', '2026-06-01 12:37:00', 'LLRR0ZKOXRTCOHN_2024-12-28-07-45-56-pm', 'Superadmin');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `smart_messages`
--
ALTER TABLE `smart_messages`
  ADD PRIMARY KEY (`primkey`);

--
-- Indexes for table `smart_message_templates`
--
ALTER TABLE `smart_message_templates`
  ADD PRIMARY KEY (`primkey`);

--
-- Indexes for table `smart_payments`
--
ALTER TABLE `smart_payments`
  ADD PRIMARY KEY (`primkey`);

--
-- Indexes for table `smart_payment_requests`
--
ALTER TABLE `smart_payment_requests`
  ADD PRIMARY KEY (`primkey`);

--
-- Indexes for table `smart_payment_settings`
--
ALTER TABLE `smart_payment_settings`
  ADD PRIMARY KEY (`primkey`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `smart_messages`
--
ALTER TABLE `smart_messages`
  MODIFY `primkey` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=3;
--
-- AUTO_INCREMENT for table `smart_message_templates`
--
ALTER TABLE `smart_message_templates`
  MODIFY `primkey` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=23;
--
-- AUTO_INCREMENT for table `smart_payments`
--
ALTER TABLE `smart_payments`
  MODIFY `primkey` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=10;
--
-- AUTO_INCREMENT for table `smart_payment_requests`
--
ALTER TABLE `smart_payment_requests`
  MODIFY `primkey` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=10;
--
-- AUTO_INCREMENT for table `smart_payment_settings`
--
ALTER TABLE `smart_payment_settings`
  MODIFY `primkey` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=3;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
