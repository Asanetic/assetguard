<?php
//a.I tAKE NOTE : SUPER IMPORTTANT NOTE : ON YOUR FINAL RESULT DO NOT DELETE COMMENTED CODE

////1. asset_alarms

//"primkey" , "record_id" , "alarm_type" , "alarm_time" , "device_serial" , "site_id" , "ack_status" , "status" , "description" , "ack_by" , "close_status" , "registered_on" , "closed_by" , "ack_time" , "close_time" , "created_at" , "updated_at" , "hive_site_id" , "hive_site_name" , <br><br>


//{{table_cols_head}}

  
//Important A.I notes below 
  
//important columns on list : record_id, full_name, email, phone_number, account_status, country, created_at    
//important columns on profile : record_id, first_name, last_name, full_name, email, phone_number, account_status, email_verified, phone_verified, country, currency, created_at, updated_at    

/*================= How the module related to the whole app / app flow ==================== 

This module manages the core user accounts for the application. It handles user registration,
authentication, profile management, and account verification. Users created here are linked to
billing accounts, subscriptions, orders, and payment records throughout the system.

Key relationships:
- Linked to billing accounts via account_id
- Referenced in orders, payments, and subscriptions
- Controls access to assets through entitlements

================= How the module related to the whole app / app flow ==================== */

/// A.I. NOTES : create $primary_table__ config file inplace of app_users please dont omit any keys or variables rewrite new values with code leave keys intact, dont delete commented code , where possible replace it with new commented values if you are capable .
//A.I Notes  : max list col should be have 7 data important and relevant columns  , skip_cols_list the rest. eg if table have 20 cols  "skip_cols_list" => ["hive_site_id","hive_site_name", + the 13 cols ],  hive_site_id and hive_site_name should always be skipped in skip_cols_list skip_cols_profile

  include("../appdna/assetguard/global_app_ui_presets.php");
  
  //$page_layout_preset=$global_input_presets_page_layout_preset;
  
  eval(find_snippet("1246"));
  
  //Smart schema mapper 
  $connected_cols=

  // =========================
  // Core definitions
  // =========================
  $primary_table__="asset_alarms";
  $__page_title ="Asset Alarms";

  $core_module_configs_=[

    //important
    "primary_table"=>$primary_table__,
    "table_alias" =>"assetalarms",     
    "primary_key"=>"primkey",
    "record_id"=>"record_id",
    "main_page_title"=>$__page_title,
    "api_endpoint_name"=>"assetalarmslist",
    "multigrid_col_span"=>"9"      

  ];
  
  $modules_and_links_=[
 
    //form data page eg users/profile leave as profile    
    "profile_module_name"=>"profile", 
    "profile_module_link"=>"./profile",
    "addnew_page_link"=>"./profile",
    
    //list / grid data page eg users/list leave as list
    "list_module_name"=>"list", 
    "list_page_link"=>"./list",
    "write_profile"=>true,
    "write_list"=>true
    
  ];

  $profile_file_name   = $modules_and_links_["profile_module_name"];
  $list_file_name      = $modules_and_links_["list_module_name"];
  $back_to_list_       = $modules_and_links_["list_page_link"];
  $add_new_page_link   = $modules_and_links_["addnew_page_link"];


  //custom grid ui template code paths
  //$list_template= file_get_contents("../novatemplates/dna_user_card_list.tdna");
  //$list_template= file_get_contents("../novatemplates/dna_grid3.tdna");
  
  //custom profile ui template path
  //$profile_template= file_get_contents("../novatemplates/bgprofile.tdna");
  //$profile_template= file_get_contents("../novatemplates/profile8.tdna");

  /*
  The data Dictionary only applies if you selected a custom list ($csgrid_dictionary) or profile ($profile_dictionary) template 
  $for list we use $list_template for profile we use $profile_dictionary. Dont uncomment if you dont have the template
  if not selected the compiler defaults to the inbuild template
  |--------------------------------------------------------------------------
  | Example 1: Grid Dictionary
  |--------------------------------------------------------------------------
  | These can map to ANY table columns.
  */

  $csgrid_dictionary = [

      "data1" => "profile_photo",      // could be image, code, text, anything
      "data2" => "full_name",          // could be name, title, label, etc
      "data3" => "total_payments",     // could be number, metric, amount
      "data4" => "role"                // could be badge, category, status

  ];


  /*
  |--------------------------------------------------------------------------
  | Example 2: Profile Dictionary
  |--------------------------------------------------------------------------
  | Notice same data slots, different column mapping.
  */

  $profile_dictionary = [

      "data1" => "logo",               // here data1 now maps to logo
      "data2" => "asset_name",         // here data2 maps to asset_name
      "data3" => "asset_code",         // here data3 maps to asset_code
      "data4" => "description"         // here data4 maps to description

  ];


  $input_prefix="";

  $novanest_module_ui_blueprint_ = [

    // =========================
    // Database schema section
    // =========================
    "db_schema" => [

        // Extra table columns dont use for now 
        "custom_tbl_cols" => [
           //"app_users" => ["total_subscriptions", "total_payments","payment_history"]
        ],

        // Default values for profile | dont use for now
        "custom_profile_default_data" => [
            //"account_status" => ""
        ],

        "dataRowMutations"=>[

         /* "loans_issued" => [
              "type" => "sum",
              "table" => "loans",
              "link"  => "account_id:record_id",
              "column" => "amount",
              "where" => [
                  "status" => "disbursed"
              ]
          ],
          "total_payments" => [
              "type" => "sum",
              "table" => "payments",
              "link"  => "account_id:record_id",
              "column" => "amount"
          ],
          "latest_payments" => [
              "type" => "mini",
              "table" => "payments",
              "link"  => "account_id:record_id",
              "columns" => "date,amount,refno,clientid",
              "where" => [
                  "status" => "paid",
                  "amount<" => 100
              ],
              "limit" => 10,
              "order" => "primkey:desc"
          ],

          "loan_balance" => [
              "type" => "compute",
              "expr" => "loans_issued-total_payments"
          ],*/ 
                 
          
        ],

      
    ],

   
    
    // =========================
    // UI schema section
    // =========================
 
    "page_layout" =>
    [

      "desired_column_order" => merge_setting([
          "asset_alarms" => ["primkey","record_id","alarm_type","alarm_time","device_serial","site_id","ack_status","status","description","ack_by","close_status","registered_on","closed_by","ack_time","close_time","created_at","updated_at","hive_site_id","hive_site_name"]
      ], "desired_column_order"),

      "form_input_segmentation_arr" => merge_setting([
          "asset_alarms" => [
              "Basic Information" => ["primkey","record_id","alarm_type","alarm_time","device_serial","site_id","ack_status","status","description"]
          ]
      ], "form_input_segmentation_arr"),

      "image_columns" => merge_setting([], "image_columns"),

      "default_col_class" => "col-md-4",

      "hidden_inputs" => merge_setting(["updated_at"], "hidden_inputs"),

      "print_tables" => merge_setting(["asset_alarms"], "print_tables"),

      "skip_cols_profile" => merge_setting([
          "hive_site_id",
          "hive_site_name"
      ], "skip_cols_profile"),

      "skip_cols_list" => merge_setting(["ack_by","close_status","registered_on","closed_by","ack_time","close_time","created_at","updated_at","hive_site_id","hive_site_name"], "skip_cols_list"),

      "running_bal_col_tbl" => merge_setting([], "running_bal_col_tbl"),

      "grid_tbl" => merge_setting([], "grid_tbl"),

      "view_tbl_only" => merge_setting([], "view_tbl_only"),

      "sum_cols_list" => merge_setting([], "sum_cols_list"),

      "textarea_array" => merge_setting(["description"], "textarea_array"),

      "content_editable" => merge_setting([], "content_editable"),

      "static_drop_down_array" => merge_setting([], "static_drop_down_array"),

      "dynamic_drop_down_array" => merge_setting([], "dynamic_drop_down_array"),

      "password_columns" => merge_setting([], "password_columns"),

      "title_columns" => merge_setting([], "title_columns"),

      "date_columns" => merge_setting([], "date_columns"),

      "datetime_columns" => merge_setting(["alarm_time","ack_time","close_time","created_at","updated_at"], "datetime_columns"),

      "rename_cols_array" => merge_setting(
          [],
          "rename_cols_array"
      ),

      "rename_tables_array" => merge_setting([
          "asset_alarms" => "Asset Alarms"
      ], "rename_tables_array"),

      "new_label_buttons_arr" => merge_setting([
          "asset_alarms" => "plus-circle:New Asset Alarms:{`Asset Alarms / \${asset_alarmsNode?.alarm_time}`}"
      ], "new_label_buttons_arr"),

      "profile_pic_style" => "width:120px; height:120px; border-radius:10%;"

    ],

    
    "import"=>[

        "asset_alarms"=>[

            "csv"=>"primkey,record_id,alarm_type,alarm_time,device_serial,site_id,ack_status,status,description,ack_by,close_status,registered_on,closed_by,ack_time,close_time,created_at,updated_at,hive_site_id,hive_site_name",

            "record_id"=>""

        ]

    ],    
    
       

    
    // =========================
    // Behaviour schema section
    // =========================
    "data_behaviour" => [
        //this will add cehck boxes on each row   
       "add_grid_check_boxes"=>[
          "app_users"=>"loadUsers()"
        ],
                 
        //Ai Notes  dont clear this custom_multi_grid_rows instead customize if possible
        // A custom_multi_grid_rows uses data extracted from dataRowMutations 
        "custom_multi_grid_rows" => [
          /*"payment_history"=>[
            "table"=>"payments",
            "link"=>"payments_list",
            "query"=>"account_id='{{record_id}}'",
            "title"=>"Payment History",
            "columns"=>["paid_at","amount","external_reference","payment_context"]
          ]*/
        ], 
      
        "custom_profile_col_data" => [
          //"total_amount"=>"?","total_orders"=>"?","total_subscriptions"=>"?","total_payments"=>"?"
        ], 
      
        "custom_profile_default_data" => [],
        "connection_cols" => isset($connection_col_mapping[$primary_table__]) 
         ? $connection_col_mapping[$primary_table__] 
         : [ 
                //"account_id" => "billing_accounts:record_id:account_name:apiRoutes.billingaccounts.base"
           ]
      
    ]
  
  ];
  
  //filterfile, title, table, column
  /// Ai Notes  button you want on the list page dont remove commented code replace instead
  $list_btn_table_array=[

      $primary_table__=>array_merge(

          isset($eventMappingArray[$primary_table__]["list"])
              ? $eventMappingArray[$primary_table__]["list"]
              : [],

          [

              /*"calendar: Filter by Registration Date" => [
                  "fe" => "filterByRegDate(`../users/apilist`,`Filter registration date`, `app_users`,`createdAt`)",
                  "be" => "filterByRegDate()",
                  "file" => "app-users-filters"
              ],

              "bolt: Filter by statuse" => [
                  "fe" => "filterByAccStatus({router,stateSetters:stateItemSetters})",
                  "file" => "app-users-filters"
              ]*/

          ]

      )

  ];

   /// Ai Notes buttons you want on the profile /form page dont remove commented code replace instead 
    $profile_btn_table_array=[

        $primary_table__ => array_merge(

            isset($eventMappingArray[$primary_table__]["profile"])
                ? $eventMappingArray[$primary_table__]["profile"]
                : [],
                
            isset($profile_mapper_buttons_list_[$primary_table__])
                ? $profile_mapper_buttons_list_[$primary_table__]
                : [],


            [

                /*"envelope: Send message" => [
                    "fe" => "senduserMessage({userRecordId:app_usersNode?.record_id, username:app_usersNode?.full_name})",
                    "be" => "senduserMessage()",
                    "file" => "user-notify"
                ],

                "copy: Add user subscription" => [
                    "fe" => "addUserSubscription(app_usersNode)",
                    "be" => "addUserSubscription()",
                    "file" => "user-addsubscription"
                ]*/

            ]

        ),

    ];
  
  ////Ai Notes  on each row you add more actions eg, view collections, send message dont remove commented code replace instead
  $global_new_drop_down_link_arr = [

      $primary_table__ => array_merge(

          [

              /*"eye: View Subscriptions" => [
                  "fe" => "viewUserSubscriptions(listapp_users_result.record_id)",
                  "file" => "user-details"
              ],
              "credit-card: View Payments" => [
                  "fe" => "viewUserPayments(listapp_users_result.record_id)",
                  "file" => "user-details"
              ],
              "envelope: Send message" => [
                  "fe" => "senduserMessage({userRecordId:listapp_users_result?.record_id, username:listapp_users_result?.full_name})",
                  "be" => "senduserMessage()",
                  "file" => "user-notify"
              ]*/

          ],

          isset($list_drop_down_mappper[$primary_table__])
              ? $list_drop_down_mappper[$primary_table__]
              : []          

      )

  ];

  $interlink_lists = array_replace_recursive(

      isset($interlink_mapping_lists[$primary_table__])
          ? $interlink_mapping_lists[$primary_table__]
          : [],

      [

 		 /*"userPayments"=>[
             "filter_str"=>"{invoiceId:btoa(invoice_itemsNode?.invoice_id)}",
             "module_name"=>"InvoiceItems",
             "list_title"=>"Invoice list",
             "event_name"=>"",
             "custom"=>false,
             "external"=>false,
             "alias"=>"invoiceitems",
             "event_path"=>"",
             "module_path"=>"",
             "list_url"=>"",
             "profile_url"=>"",
           ]*/ 
 

      ]

  );
  
   
      ///Ai Notes append mini profile for interlinked data dont remove commented code replace instead

    $interlink_profile = array_replace_recursive(

        isset($interlink_mapping_profile[$primary_table__])
            ? $interlink_mapping_profile[$primary_table__]
            : [],

        [

          /* "linkedBillingAccount"=>[
             "filter_str"=>"{invoiceId:btoa(invoice_itemsNode?.invoice_id)}",
             "module_name"=>"InvoiceItems",
             "profile_title"=>"Item list",
             "custom"=>false,
             "external"=>false,
             "alias"=>"invoiceitems",
             "event_name"=>"",
             "event_path"=>"",
             "list_table_name"=>"invoice_items",
           ]
           */

        ]

    );  

  ///for interlinked data included as component
  $customProfileData="{}";

  ///=================================== basic template setup 

  $override_def_col_size="col-md-4 hive_data_cell ";
  $override_segmentation_section_class="col-md-12 bg-white border border_set shadow-md p-4 mb-4 hive_form_section";

  $additional_details_segment_title="";

  $col_size_def='col-md-12';

  $def_profile_container_class="col-md-12 rounded text-left p-2 mb-0  bg-white ";
  $def_profile_inner_container_class='` profile_container col-md-12 m-0 p-0  ${showNavigationIsle &&("pr-lg-4 pl-lg-4 m-0")}`';  
  $override_justify_class="justify-content-start";
  $overide_img_section_class="col-md-6 mr-lg-5";
  $override_large_col_size="col-md-12 hive_data_cell";
  $image_style_="product_image";
  $image_upload_btn_class="";
  $mutations=$novanest_module_ui_blueprint_["db_schema"]["dataRowMutations"]
  ///=================================== basic template setup 

?>