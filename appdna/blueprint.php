<?php  
/// 1. - set up the tables list 
$tables_array_="mosy_sql_roll_back,billing_log,billing_transactions";

$run_create_tbls="yes";   //yes | no
$show_jsontbl_keys="yes"; //yes | no

$write_conn_file="yes";  //yes | no
$write_backend_files="no"; //yes | no

//  2.  --- create navigation bar 
$node_group=
[
  "Client & Vehicles"=>["car","vehicles:Client Vehicles Report","cars_list","customers"],
];


$write_navbar___="yes";
$base_theme_color ="#1ECBD8";


/// 3. set aut tables and nav bars to yes 

/// 4. search and run app exe
  
    // Remove the protocol and domain part
    $primary_path = str_replace("http://localhost/", "", magic_current_url());

    // Split the URL into parts
    $main_primary_segments = explode('/', $primary_path);

    // Extract the second segment, which is "codeoasis"
    $primary_project_name = isset($main_primary_segments[2]) ? $main_primary_segments[2] : null;

   ////echo " Primary url $primary_path";
  

$app_links_=[
  'superauth'=>'http://localhost/asanetic/superauth/be/jsondb.php',
  $primary_project_name=>'http://localhost/nextv2/mainapps/'.$primary_project_name.'/jsondb.php'
];

//echo $app_links_[$primary_project_name];

$desired_column_order_bp=[
    'system_users' => ['login_password', 'client_tel', 'client_name'],
];

$custom_tbl_cols_bp=[
  "send_list_tbl"=>['contact_count','messages_sent','amount_spend']    
];

if(isset($desired_column_order))
{
 $desired_column_order_bp=$desired_column_order;
}

if(isset($custom_tbl_cols))
{
 $custom_tbl_cols_bp=$custom_tbl_cols;
}

$jsondb_url=$app_links_[$primary_project_name];
//$jsondb_url=$app_links_["superauth"];

if(!isset($single_table_call))
{
 $single_table_call="";
}

$reorder_cols="?desired_col_order=".base64_encode(json_encode($desired_column_order_bp, true))."";
$custom_tbl_cols_encoded="&custom_tbl_cols=".base64_encode(json_encode($custom_tbl_cols_bp, true))."";

$jsondb_url_call=$jsondb_url.$reorder_cols.$custom_tbl_cols_encoded."&db=".$db."";

if($single_table_call!="")
{
  $jsondb_url_call=$jsondb_url.$reorder_cols."&table=".$single_table_call."".$custom_tbl_cols_encoded."&db=".$db."";
}

$appname = array_search($jsondb_url, $app_links_);

$module_name_=$appname;

$next_baseDir = "../app";
$api_root_folder_ = "../app/api/".$module_name_;


$site_id_filter_config="";
//$site_id_filter_config="hive_site_id='\$".$appname."_session_hive_site_id'";
$site_id_filter_config_var="".$appname."_session_hive_site_id";
$site_name_filter_config_var="".$appname."_session_hive_site_name";

$root_folder=$next_baseDir;

$parent_hive_js_folder_="../js/hives";
$hive_js_folder_=$parent_hive_js_folder_."/".$appname;
$js_nodes_control=$parent_hive_js_folder_."/hive_node_control.js";
$js_folder="./js/";
$hive_control="../".$module_name_."/hive_control";

$cc_folder=$hive_js_folder_."/cc";
$behive_folder=$hive_js_folder_."/behive";
$chive_folder=$hive_js_folder_."/cohive";
$features_folder=$root_folder."/".$module_name_."";

$jsondb_response=magic_post_curl($jsondb_url_call);

$db_tables_list=json_decode($jsondb_response, true);

?>