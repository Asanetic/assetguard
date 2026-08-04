<?php
//a.I tAKE NOTE : SUPER IMPORTTANT NOTE : ON YOUR FINAL RESULT DO NOT DELETE COMMENTED CODE

////1. system_users

//"login_password" , "primkey" , "user_id" , "name" , "email" , "tel" , "ref_id" , "regdate" , "user_no" , "user_pic" , "user_gender" , "last_seen" , "about" , "hive_site_id" , "hive_site_name" , "auth_token" , "token_status" , "token_expiring_in" , "project_id" , "project_name" , <br><br>

//Table name : system_users

// columns : "primkey" , "user_id" , "name" , "email" , "tel" , "login_password" , "ref_id" , "regdate" , "user_no" , "user_pic" , "user_gender" , "last_seen" , "about" , "hive_site_id" , "hive_site_name" , "auth_token" , "token_status" , "token_expiring_in" , "project_id" , "project_name" , "user_role" , 


//{{table_cols_head}}

  
//Important A.I notes below 
  
//important columns on list : user_id, name, email, tel, user_gender, regdate, last_seen    
//important columns on profile : user_id, name, email, tel, user_gender, about, regdate, last_seen, token_status, token_expiring_in, project_id, project_name    

/*================= How the module related to the whole app / app flow ==================== 

This module manages system-level users who access the backend platform.
It handles authentication credentials, token management, and project-level
access control for administrative and internal users.

Key relationships:
- Linked to projects via project_id
- Uses auth_token for API authentication
- Controls backend access and authorization

================= How the module related to the whole app / app flow ==================== */

/// A.I. NOTES : create $primary_table__ config file inplace of app_users please dont omit any keys or variables rewrite new values with code leave keys intact, dont delete commented code , where possible replace it with new commented values if you are capable .
//A.I Notes  : max list col should be have 7 data important and relevant columns  , skip_cols_list the rest. eg if table have 20 cols  "skip_cols_list" => ["hive_site_id","hive_site_name", + the 13 cols ],  hive_site_id and hive_site_name should always be skipped in skip_cols_list skip_cols_profile

  // =========================
  // Core definitions
  // =========================
  $primary_table__="system_users";
  $__page_title ="System Users";

  $core_module_configs_=[

    //important
    "primary_table"=>$primary_table__,
    "table_alias" =>"sysusers",     
    "primary_key"=>"primkey",
    "record_id"=>"record_id",
    "main_page_title"=>$__page_title,
    "api_endpoint_name"=>"systemusers",
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
  //$list_template= file_get_contents('../novatemplates/dna_user_card_list.tdna');
  //$list_template= file_get_contents('../novatemplates/dna_grid3.tdna');
  
  //custom profile ui template path
  //$profile_template= file_get_contents('../novatemplates/bgprofile.tdna');
  //$profile_template= file_get_contents('../novatemplates/profile8.tdna');

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

      "data1" => "user_pic",      
      "data2" => "name",         
      "data3" => "email",     
      "data4" => "token_status"                

  ];


  /*
  |--------------------------------------------------------------------------
  | Example 2: Profile Dictionary
  |--------------------------------------------------------------------------
  | Notice same data slots, different column mapping.
  */

  $profile_dictionary = [

      "data1" => "user_pic",               
      "data2" => "name",         
      "data3" => "email",         
      "data4" => "about"         

  ];


  $input_prefix="";

  $novanest_module_ui_blueprint_ = [

    // =========================
    // Database schema section
    // =========================
    "db_schema" => [

        // Extra table columns dont use for now 
        "custom_tbl_cols" => [
           "system_users" => ["permissions","permission_list"]
        ],

        // Default values for profile | dont use for now
        "custom_profile_default_data" => [
            //"token_status" => "checkblank(getarr_val_(\$system_users_node,'token_status'),'inactive')"
        ],

        "dataRowMutations"=>[

          "permissions" => [
              "type" => "count",
              "table" => "user_bundle_role_functions",
              "link"  => "bundle_id:user_role"
          ],
          
          "permission_list" => [
              "type" => "mini",
              "table" => "user_bundle_role_functions",
              "link"  => "bundle_id:user_role",
              "columns"=>"role_name",
              "limit"=>"20"
          ],                 
        ],

      
    ],


    // =========================
    // UI schema section
    // =========================
    "page_layout" => [

        // Column order
        "desired_column_order" => [
            "system_users" => ["primkey","record_id","name","email","tel","user_gender","about","project_id","project_name","token_status","token_expiring_in","regdate","last_seen"]
        ],

        // Grouped inputs
        "form_input_segmentation_arr" => [
            "system_users" => [
                "User Information" => ["name","email","tel","user_gender","about","login_password","regdate","user_role","permissions"]
            ]
        ],


        "image_columns" => ["user_pic"],
        "default_col_class" => "col-md-4",
        "hidden_inputs" => ["auth_token"], 
        "print_tables" => ["system_users"], 
        "skip_cols_profile" => ["ref_id","hive_site_id","hive_site_name", "last_seen" , "about" , "hive_site_id" , "hive_site_name" , "auth_token" , "token_status" , "token_expiring_in" , "project_id" , "project_name","user_no"], 
        "skip_cols_list" => ["hive_site_id","hive_site_name","login_password","auth_token","about","project_id","project_name","token_expiring_in", "last_seen" , "about" , "hive_site_id" , "hive_site_name" , "auth_token" , "token_status" , "token_expiring_in" , "project_id" , "project_name","user_no","ref_id"],  
        "running_bal_col_tbl" => [],
        "grid_tbl" => [], 
        "view_tbl_only" => [],
        "sum_cols_list" => [], 
        "textarea_array" => ["about"], 
        "content_editable" => [], 

        "static_drop_down_array" => [
            "user_gender" => "Male,Female",
            "token_status" => "active,inactive,expired"
        ],

        "dynamic_drop_down_array" => ["project_id"], 
        "password_columns" => ["login_password"], 
        "title_columns" => [], 
        "date_columns" => ["regdate","last_seen","token_expiring_in"],
        "datetime_columns" => [],

        //incase you want to change the way the column name displays on the UI eg trx_date to Date paid add it here 
        "rename_cols_array" => [ 
            "user_id" => "User ID",
            "regdate" => "Registration Date",
            "last_seen" => "Last Seen",
            "tel" => "Phone"
        ],

        "rename_tables_array" => [
            "system_users" => "System Users"
        ],

        "new_label_buttons_arr" => [ 
            "system_users" => "user-plus:New System User:{`System User / \${system_usersNode?.name}`}" 
        ],

        "profile_pic_style" => "width:120px; height:120px; border-radius:10%;"
    ],
    
    "import"=>[
      "system_users"=>["csv"=>"user_id,name,email,tel,user_gender,project_id,project_name","record_id"=>""]
    ],

    // =========================
    // Behaviour schema section
    // =========================
    "data_behaviour" => [
        //this will add cehck boxes on each row   
       "add_grid_check_boxes"=>[
          "system_users_"=>"loadSystemUsers()"
        ],
                 
        //Ai Notes  dont clear this custom_multi_grid_rows instead customize if possible
        // A custom_multi_grid_rows uses data extracted from dataRowMutations 
        "custom_multi_grid_rows" => [
          "permission_list"=>[
            "table"=>"user_bundle_role_functions",
            "link"=>"",
            "query"=>"bundleId={{user_role}}",
            "title"=>"Permissions",
            "columns"=>["role_name"]
          ]
        ], 
      
        "custom_profile_col_data" => [
          "permissions"=>"?"
        ], 
      //Table name : user_bundle_role_functions

// columns : "primkey" , "record_id" , "bundle_id" , "bundle_name" , "role_id" , "role_name" , "remark" , "hive_site_id" , "hive_site_name" , 

//Table name : system_role_bundles

// columns : "primkey" , "record_id" , "bundle_id" , "bundle_name" , "remark" , "hive_site_id" , "hive_site_name" , 


        "custom_profile_default_data" => [],
        "connection_cols" => [ 
           "user_role" => "system_role_bundles:record_id:bundle_name:apiRoutes.systemroles.base"
        ]
    ]
  
  ];
//filterfile, title, table, column
  /// Ai Notes  button you want on the list page dont remove commented code replace instead
  $list_btn_table_array=[
      $primary_table__=>[
         /*"clock: Filter by Last Seen" => [
             "fe" => "filterByLastSeen({router,stateSetters:stateItemSetters})",
             "file" => "system-users-filters"
         ]*/      
      ],  
  ];

  /// Ai Notes buttons you want on the profile /form page dont remove commented code replace instead
  $profile_btn_table_array=[
      $primary_table__=>[
         "shield: View roles" => [
             "fe" => "userRoles(system_usersNode?.user_role)",
             "file" => "system-users-utils"
         ]
      ],
  ];

  ////Ai Notes  on each row you add more actions eg, view collections, send message dont remove commented code replace instead
  $global_new_drop_down_link_arr = [
        $primary_table__=>[
         /*"eye: View Project Details" => [
             "fe" => "viewProjectDetails(listsystem_users_result.project_id)",
             "file" => "system-users-details"
         ]*/        
      ]
  ];

  ///Ai Notes  append mini list for interlinked data eg farmers & collections dont remove commented code replace instead
  $interlink_lists=[
   "userSessions"=>[ 
     "filter_str"=>"{bundleId:btoa(system_usersNode?.user_role)}  ",
     "module_name"=>"Userrolefunctions",
     "list_title"=>"Permissions",
     "event_name"=>"",
     "custom"=>false,
     "external"=>true,
     "alias"=>'bundlefunctions', 
     "event_name"=>"",
     "event_path"=>"",
     "module_path"=>"",    
     "list_url"=>"",
     "profile_url"=>"",
   ]
  ];
   
  ///Ai Notes append mini profile for interlinked data dont remove commented code replace instead
  $interlink_profile=[
   
   /*"linkedProjectProfile"=>[ 
     "filter_str"=>"bundleId='{system_usersNode?.user_role}'",
     "module_name"=>"Userrolefunctions",
     "profile_title"=>"Permissions",
     "custom"=>false,
     "external"=>true,
     "alias"=>'bundlefunctions',      
     "event_name"=>"",
     "event_path"=>"",
     "list_table_name"=>"user_bundle_role_functions",
   ]*/
   
  ];  

  ///for interlinked data included as component
  $customProfileData="{}";

  ///=================================== basic template setup 

  $override_def_col_size="col-md-4 hive_data_cell ";
  $override_segmentation_section_class="col-md-11 bg-white border border_set shadow-md p-4 mb-4 hive_form_section";

  $additional_details_segment_title="";

  $col_size_def='col-md-12';

  $def_profile_container_class="col-md-12 rounded text-left p-2 mb-0  bg-white ";
  $def_profile_inner_container_class='` profile_container col-md-12 m-0 p-0  ${showNavigationIsle &&("pr-lg-4 pl-lg-4 m-0")}`';  
  $override_justify_class="justify-content-start";
  $overide_img_section_class="col-md-6 mr-lg-5";
  $override_large_col_size="col-md-12 hive_data_cell";
  $image_style_="product_image";
  $mutations=$novanest_module_ui_blueprint_["db_schema"]["dataRowMutations"]
  ///=================================== basic template setup 

?>