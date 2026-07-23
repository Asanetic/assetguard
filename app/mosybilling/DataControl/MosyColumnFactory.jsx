const MosyColumnFactory = {

   //-- app_features cols--//
  app_features: ["feature_name", "feature_description", "feature_id", "app_id", "order_number"],

   //-- app_list cols--//
  app_list: ["app_name", "logo", "account_id", "remark", "payment_redirect", "pricing_page_message"],

   //-- billing_account cols--//
  billing_account: ["account_name", "account_no", "account_tel", "account_email", "plan_id", "plan_name", "plan_amount", "plan_type", "plan_period", "expiring_on", "active_status", "hive_site_id", "hive_site_name", "app_id", "date_created", "previous_plan"],

   //-- billing_log cols--//
  billing_log: ["transaction_ref", "trx_type", "trx_time", "amount", "trx_source", "ref_id", "site_id", "message", "appid", "hive_site_id", "hive_site_name"],

   //-- billing_transactions cols--//
  billing_transactions: ["trx_id", "trx_date", "trx_month_year", "trx_remark", "amount", "trx_type", "business_id", "client_id", "admin_id", "TransactionType", "BusinessShortCode", "BillRefNumber", "InvoiceNumber", "OrgAccountBalance", "ThirdPartyTransID", "MSISDN", "FirstName", "MiddleName", "LastName", "trx_msg", "account_id", "used_status", "filter_date", "flw_id", "flag_state", "reconciled", "corrected_number", "hive_site_id", "hive_site_name", "app_id"],

   //-- checkout_orders cols--//
  checkout_orders: ["payment_account", "checkout_date", "amount", "tel", "account_number"],

   //-- mosy_sql_roll_back cols--//
  mosy_sql_roll_back: ["table_name", "roll_type", "where_str", "roll_timestamp", "value_entries", "hive_site_id", "hive_site_name"],

   //-- mosycomms_array cols--//
  mosycomms_array: ["receiver_contacts", "reciver_names", "message_type", "site_id", "group_name", "message_date", "sent_state", "msg_read_state", "subject", "message_label", "message", "delvery_receipt", "mosycomms_dictionary", "sms_cost", "page_count", "hive_site_id", "hive_site_name"],

   //-- mosycomms_settings cols--//
  mosycomms_settings: ["company_name", "company_email", "hive_site_id", "hive_site_name"],

   //-- page_manifest_ cols--//
  page_manifest_: ["page_group", "site_id", "page_url", "hive_site_id", "hive_site_name"],

   //-- plan_features cols--//
  plan_features: ["feature_id", "feature_name", "app_id", "plan_id"],

   //-- plans cols--//
  plans: ["plan_id", "plan_name", "plan_amount", "plan_type", "plan_period", "active_status", "hive_site_id", "hive_site_name", "remark", "app_id", "currency"],

   //-- system_users cols--//
  system_users: ["name", "email", "tel", "login_password", "ref_id", "regdate", "user_no", "user_pic", "user_gender", "last_seen", "about", "hive_site_id", "hive_site_name", "auth_token", "token_status", "token_expiring_in"],

   //-- user_manifest_ cols--//
  user_manifest_: ["user_id", "user_name", "role_id", "site_id", "role_name", "hive_site_id", "hive_site_name"],


};
export default MosyColumnFactory;