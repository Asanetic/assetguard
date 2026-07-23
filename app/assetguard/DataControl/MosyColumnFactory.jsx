const MosyColumnFactory = {

   //-- asset_alarms cols--//
  asset_alarms: ["record_id", "alarm_type", "alarm_time", "device_serial", "site_id", "ack_status", "status", "description", "ack_by", "close_status", "registered_on", "closed_by", "ack_time", "close_time", "created_at", "updated_at", "hive_site_id", "hive_site_name"],

   //-- device_list cols--//
  device_list: ["record_id", "device_name", "date_installed", "serial_number", "remark", "registered_on", "geofence", "site_id", "site_name", "low_battery_level", "geofence_limit_distance", "device_location", "speed_alert_value", "created_at", "updated_at", "hive_site_id", "hive_site_name"],

   //-- device_pings cols--//
  device_pings: ["record_id", "device_id", "ping_time", "signal_strength", "battery_level", "remark", "status", "created_on", "created_at", "updated_at", "hive_site_id", "hive_site_name"],

   //-- gps_logs cols--//
  gps_logs: ["record_id", "log_type", "site_name", "device_id", "battery_level", "latitude", "longitude", "log_details", "speed", "remark", "timestamp", "created_on", "created_at", "updated_at", "hive_site_id", "hive_site_name"],

   //-- mosy_sql_roll_back cols--//
  mosy_sql_roll_back: ["roll_bk_key", "table_name", "roll_type", "where_str", "roll_timestamp", "value_entries", "hive_site_id", "hive_site_name"],

   //-- page_manifest_ cols--//
  page_manifest_: ["manikey", "page_group", "site_id", "page_url", "hive_site_id", "hive_site_name", "project_id", "project_name"],

   //-- sites cols--//
  sites: ["record_id", "site_name", "site_code", "country", "city", "county", "town", "latitude", "longitude", "location_address", "remark", "created_on", "manager", "manager_mobile", "manager_email", "contact_person", "contact_person_mobile", "contact_person_email", "company_security_manager", "company_security_contacts", "vendor_contact_person", "vendor_contacts", "response_team_contact_person", "response_team_contacts", "crew_commander_contact_person", "crew_commander_contacts", "vehicle_registration_number", "alternate_phone_number", "vendor", "management_company", "created_at", "updated_at", "hive_site_id", "hive_site_name"],

   //-- smart_message_templates cols--//
  smart_message_templates: ["record_id", "template_name", "template_code", "template_category", "message_channel", "subject", "message_content", "template_status", "created_by", "last_updated_by", "created_on", "updated_on", "created_at", "updated_at", "hive_site_id", "hive_site_name"],

   //-- smart_messages cols--//
  smart_messages: ["record_id", "message_number", "related_record_id", "recipient_name", "recipient_phone", "recipient_email", "message_channel", "message_subject", "message_content", "message_status", "delivery_status", "request_source", "request_id", "sent_by", "scheduled_for", "sent_on", "delivered_on", "read_on", "failed_on", "failure_reason", "created_on", "created_at", "updated_at", "hive_site_id", "hive_site_name"],

   //-- system_module_manifest_ cols--//
  system_module_manifest_: ["record_id", "component_name", "module_key", "module_name", "permission_type", "capability_key", "access_name", "relative_path", "hive_site_id", "hive_site_name"],

   //-- system_role_bundles cols--//
  system_role_bundles: ["record_id", "bundle_id", "bundle_name", "remark", "hive_site_id", "hive_site_name"],

   //-- system_users cols--//
  system_users: ["record_id", "name", "email", "tel", "login_password", "ref_id", "regdate", "user_no", "user_pic", "user_gender", "last_seen", "about", "hive_site_id", "hive_site_name", "auth_token", "token_status", "token_expiring_in", "project_id", "project_name", "user_role"],

   //-- user_bundle_role_functions cols--//
  user_bundle_role_functions: ["record_id", "bundle_id", "bundle_name", "role_id", "role_name", "remark", "hive_site_id", "hive_site_name"],

   //-- user_manifest_ cols--//
  user_manifest_: ["admin_mkey", "user_id", "user_name", "role_id", "site_id", "role_name", "hive_site_id", "hive_site_name", "project_id", "project_name"],


};
export default MosyColumnFactory;