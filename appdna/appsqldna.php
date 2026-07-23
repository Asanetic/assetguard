
$asset_alarms_table_script = "


`primkey` int(11) PRIMARY KEY AUTO_INCREMENT,
`record_id` varchar(100) NOT NULL,

`alarm_type` varchar(500),
`alarm_time` datetime,
`device_serial` varchar(500),
`site_id` varchar(500),
`ack_status` varchar(500),
`status` varchar(500),
`description` longtext,
`ack_by` varchar(500),
`close_status` varchar(500),
`registered_on` datetime,
`closed_by` varchar(500),
`ack_time` datetime,
`close_time` datetime,

`created_at` datetime DEFAULT CURRENT_TIMESTAMP,
`updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
`hive_site_id` varchar(100),
`hive_site_name` varchar(255)

        

";

$asset_alarms_table = 'asset_alarms';

create_table(

    $mysqliconn,
    $dbname,
    $asset_alarms_table,
    $asset_alarms_table_script

);





$device_list_table_script = "


`primkey` int(11) PRIMARY KEY AUTO_INCREMENT,
`record_id` varchar(100) NOT NULL,

`device_name` varchar(500),
`date_installed` datetime,
`serial_number` varchar(500),
`remark` longtext,
`registered_on` datetime,
`geofence` varchar(500),
`site_id` varchar(500),
`site_name` varchar(500),
`low_battery_level` varchar(500),
`geofence_limit_distance` varchar(500),
`device_location` varchar(500),
`speed_alert_value` varchar(500),

`created_at` datetime DEFAULT CURRENT_TIMESTAMP,
`updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
`hive_site_id` varchar(100),
`hive_site_name` varchar(255)

        

";

$device_list_table = 'device_list';

create_table(

    $mysqliconn,
    $dbname,
    $device_list_table,
    $device_list_table_script

);





$device_pings_table_script = "


`primkey` int(11) PRIMARY KEY AUTO_INCREMENT,
`record_id` varchar(100) NOT NULL,

`device_id` varchar(500),
`ping_time` datetime,
`signal_strength` varchar(500),
`battery_level` varchar(500),
`remark` longtext,
`status` varchar(500),
`created_on` datetime,

`created_at` datetime DEFAULT CURRENT_TIMESTAMP,
`updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
`hive_site_id` varchar(100),
`hive_site_name` varchar(255)

        

";

$device_pings_table = 'device_pings';

create_table(

    $mysqliconn,
    $dbname,
    $device_pings_table,
    $device_pings_table_script

);





$gps_logs_table_script = "


`primkey` int(11) PRIMARY KEY AUTO_INCREMENT,
`record_id` varchar(100) NOT NULL,

`log_type` varchar(500),
`site_name` varchar(500),
`device_id` varchar(500),
`battery_level` varchar(500),
`latitude` varchar(500),
`longitude` varchar(500),
`log_details` longtext,
`speed` varchar(500),
`remark` longtext,
`timestamp` datetime,
`created_on` datetime,

`created_at` datetime DEFAULT CURRENT_TIMESTAMP,
`updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
`hive_site_id` varchar(100),
`hive_site_name` varchar(255)

        

";

$gps_logs_table = 'gps_logs';

create_table(

    $mysqliconn,
    $dbname,
    $gps_logs_table,
    $gps_logs_table_script

);





$page_manifest__table_script = "


`primkey` int(11) PRIMARY KEY AUTO_INCREMENT,
`record_id` varchar(100) NOT NULL,

`manifest_key` varchar(500),
`page_group` varchar(500),
`site_id` varchar(500),
`page_url` varchar(500),
`project_id` varchar(500),
`project_name` varchar(500),

`created_at` datetime DEFAULT CURRENT_TIMESTAMP,
`updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
`hive_site_id` varchar(100),
`hive_site_name` varchar(255)

        

";

$page_manifest__table = 'page_manifest_';

create_table(

    $mysqliconn,
    $dbname,
    $page_manifest__table,
    $page_manifest__table_script

);





$sites_table_script = "


`primkey` int(11) PRIMARY KEY AUTO_INCREMENT,
`record_id` varchar(100) NOT NULL,

`site_name` varchar(500),
`site_code` varchar(500),
`country` varchar(500),
`city` varchar(500),
`county` varchar(500),
`town` varchar(500),
`latitude` varchar(500),
`longitude` varchar(500),
`location_address` varchar(500),
`remark` longtext,
`created_on` datetime,
`manager` varchar(500),
`manager_mobile` varchar(500),
`manager_email` varchar(255),
`contact_person` varchar(500),
`contact_person_mobile` varchar(500),
`contact_person_email` varchar(255),
`company_security_manager` varchar(500),
`company_security_contacts` varchar(500),
`vendor_contact_person` varchar(500),
`vendor_contacts` varchar(500),
`response_team_contact_person` varchar(500),
`response_team_contacts` varchar(500),
`crew_commander_contact_person` varchar(500),
`crew_commander_contacts` varchar(500),
`vehicle_registration_number` varchar(500),
`alternate_phone_number` varchar(50),
`vendor` varchar(500),
`management_company` varchar(500),

`created_at` datetime DEFAULT CURRENT_TIMESTAMP,
`updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
`hive_site_id` varchar(100),
`hive_site_name` varchar(255)

        

";

$sites_table = 'sites';

create_table(

    $mysqliconn,
    $dbname,
    $sites_table,
    $sites_table_script

);





$system_role_bundles_table_script = "


`primkey` int(11) PRIMARY KEY AUTO_INCREMENT,
`record_id` varchar(100) NOT NULL,

`bundle_id` varchar(500),
`bundle_name` varchar(500),
`remark` longtext,

`created_at` datetime DEFAULT CURRENT_TIMESTAMP,
`updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
`hive_site_id` varchar(100),
`hive_site_name` varchar(255)

        

";

$system_role_bundles_table = 'system_role_bundles';

create_table(

    $mysqliconn,
    $dbname,
    $system_role_bundles_table,
    $system_role_bundles_table_script

);





$system_users_table_script = "


`primkey` int(11) PRIMARY KEY AUTO_INCREMENT,
`record_id` varchar(100) NOT NULL,

`user_id` varchar(500),
`name` varchar(500),
`email` varchar(255),
`telephone` varchar(50),
`login_password` varchar(500),
`reference_id` varchar(500),
`registered_on` datetime,
`user_number` varchar(500),
`user_profile_photo` text,
`gender` varchar(500),
`last_seen` datetime,
`about` longtext,
`authentication_token` varchar(500),
`token_status` varchar(500),
`token_expires_in` varchar(500),
`project_id` varchar(500),
`project_name` varchar(500),

`created_at` datetime DEFAULT CURRENT_TIMESTAMP,
`updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
`hive_site_id` varchar(100),
`hive_site_name` varchar(255)

        

";

$system_users_table = 'system_users';

create_table(

    $mysqliconn,
    $dbname,
    $system_users_table,
    $system_users_table_script

);





$user_bundle_role_functions_table_script = "


`primkey` int(11) PRIMARY KEY AUTO_INCREMENT,
`record_id` varchar(100) NOT NULL,

`bundle_id` varchar(500),
`bundle_name` varchar(500),
`role_id` varchar(500),
`role_name` varchar(500),
`remark` longtext,

`created_at` datetime DEFAULT CURRENT_TIMESTAMP,
`updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
`hive_site_id` varchar(100),
`hive_site_name` varchar(255)

        

";

$user_bundle_role_functions_table = 'user_bundle_role_functions';

create_table(

    $mysqliconn,
    $dbname,
    $user_bundle_role_functions_table,
    $user_bundle_role_functions_table_script

);





$user_manifest__table_script = "


`primkey` int(11) PRIMARY KEY AUTO_INCREMENT,
`record_id` varchar(100) NOT NULL,

`admin_manifest_key` varchar(500),
`user_id` varchar(500),
`user_name` varchar(500),
`role_id` varchar(500),
`site_id` varchar(500),
`role_name` varchar(500),
`project_id` varchar(500),
`project_name` varchar(500),

`created_at` datetime DEFAULT CURRENT_TIMESTAMP,
`updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
`hive_site_id` varchar(100),
`hive_site_name` varchar(255)

        

";

$user_manifest__table = 'user_manifest_';

create_table(

    $mysqliconn,
    $dbname,
    $user_manifest__table,
    $user_manifest__table_script

);




