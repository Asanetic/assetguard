<?php
//a.I tAKE NOTE : SUPER IMPORTTANT NOTE : ON YOUR FINAL RESULT DO NOT DELETE COMMENTED CODE

////1. system_role_bundles

//"primkey" , "record_id" , "bundle_id" , "bundle_name" , "remark" , "hive_site_id" , "hive_site_name" , <br><br>


//{{table_cols_head}}

  
//Important A.I notes below 
  
//important columns on list : record_id, bundle_id, bundle_name, remark, created_at    
//important columns on profile : record_id, bundle_id, bundle_name, remark, created_at, updated_at    

/*================= How the module related to the whole app / app flow ==================== 

This module manages system role bundles. It defines permission groupings
that can be attached to system roles and users to control access levels
across the platform.

Key relationships:
- Referenced by system roles
- Controls grouped permission logic
- Used during access validation & authorization checks

================= How the module related to the whole app / app flow ==================== */

/// A.I. NOTES : create $primary_table__ config file inplace of app_users please dont omit any keys or variables rewrite new values with code leave keys intact, dont delete commented code , where possible replace it with new commented values if you are capable .
//A.I Notes  : max list col should be have 7 data important and relevant columns  , skip_cols_list the rest. eg if table have 20 cols  "skip_cols_list" => ["hive_site_id","hive_site_name", + the 13 cols ],  hive_site_id and hive_site_name should always be skipped in skip_cols_list skip_cols_profile

  // =========================
  // Core definitions
  // =========================
  $primary_table__="system_role_bundles";
  $__page_title ="System Roles";

  $core_module_configs_=[

    //important
    "primary_table"=>$primary_table__,
    "table_alias" =>"rolebundles",     
    "primary_key"=>"primkey",
    "record_id"=>"record_id",
    "main_page_title"=>$__page_title,
    "api_endpoint_name"=>"systemrolebundles",
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

      "data1" => "bundle_name",      
      "data2" => "bundle_id",         
      "data3" => "remark",     
      "data4" => "record_id"                

  ];


  /*
  |--------------------------------------------------------------------------
  | Example 2: Profile Dictionary
  |--------------------------------------------------------------------------
  | Notice same data slots, different column mapping.
  */

  $profile_dictionary = [

      "data1" => "bundle_name",               
      "data2" => "bundle_id",         
      "data3" => "remark",         
      "data4" => "record_id"         

  ];


  $input_prefix="";

  $novanest_module_ui_blueprint_ = [

    // =========================
    // Database schema section
    // =========================
    "db_schema" => [

        // Extra table columns dont use for now 
        "custom_tbl_cols" => [
           "system_role_bundles" => ["permissions","permission_list"]
        ],

        // Default values for profile | dont use for now
        "custom_profile_default_data" => [
            //"bundle_name" => "checkblank(getarr_val_(\$system_role_bundles_node,'bundle_name'),'New Bundle')"
        ],
//Table name : user_bundle_role_functions

// columns : "primkey" , "record_id" , "bundle_id" , "bundle_name" , "role_id" , "role_name" , "remark" , "hive_site_id" , "hive_site_name" , 


        "dataRowMutations"=>[

          "permissions" => [
              "type" => "count",
              "table" => "user_bundle_role_functions",
              "link"  => "bundle_id:record_id"
          ],
          
          "permission_list" => [
              "type" => "mini",
              "table" => "user_bundle_role_functions",
              "link"  => "bundle_id:record_id",
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
            "system_role_bundles" => ["primkey","record_id","bundle_id","bundle_name","remark","created_at","updated_at"]
        ],

        // Grouped inputs
        "form_input_segmentation_arr" => [
            "system_role_bundles" => [
                "Role detail" => ["bundle_id","bundle_name","permissions","remark"],
                //"System Information" => ["created_at","updated_at"]
            ]
        ],


        "image_columns" => [],
        "default_col_class" => "col-md-4",
        "hidden_inputs" => ["created_at","updated_at","bundle_id"], 
        "print_tables" => ["system_role_bundles"], 
        "skip_cols_profile" => ["hive_site_id","hive_site_name","created_at","updated_at","bundle_id"], 
        "skip_cols_list" => ["hive_site_id","hive_site_name","updated_at","created_at","bundle_id"],  
        "running_bal_col_tbl" => [],
        "grid_tbl" => [], 
        "view_tbl_only" => [],
        "sum_cols_list" => [], 
        "textarea_array" => ["remark"], 
        "content_editable" => [], 

        "static_drop_down_array" => [],

        "dynamic_drop_down_array" => [], 
        "password_columns" => [], 
        "title_columns" => [], 
        "date_columns" => [],
        "datetime_columns" => ["created_at","updated_at"],

        //incase you want to change the way the column name displays on the UI eg trx_date to Date paid add it here 
        "rename_cols_array" => [ 
            "bundle_id" => "Role Code",
            "bundle_name" => "Role Name:col-md-8",
            "role_name" => "Permission name"
        ],

        "rename_tables_array" => [
            "system_role_bundles" => "System Role Bundles"
        ],

        "new_label_buttons_arr" => [ 
            "system_role_bundles" => "plus-circle:New Role:{`Role / \${system_role_bundlesNode?.bundle_name}`}" 
        ],

        "profile_pic_style" => ""
    ],
    
    "import"=>[
      "system_role_bunjdles"=>["csv"=>"bundle_id,bundle_name,remark","record_id"=>""]
    ],

    // =========================
    // Behaviour schema section
    // =========================
    "data_behaviour" => [
        //this will add cehck boxes on each row   
       "add_grid_check_boxes"=>[
          "system_role_bundlesj"=>"loadRoleBundles()"
        ],
                 
        //Ai Notes  dont clear this custom_multi_grid_rows instead customize if possible
        // A custom_multi_grid_rows uses data extracted from dataRowMutations 
        "custom_multi_grid_rows" => [
          "permission_list"=>[
            "table"=>"user_bundle_role_functions",
            "link"=>"roles_list",
            "query"=>"bundleId={{bundle_id}}",
            "title"=>"Permissions",
            "columns"=>["role_name"]
          ]
        ], 
      
        "custom_profile_col_data" => [
          "permissions"=>"?"
        ], 
      
        "custom_profile_default_data" => [],
        "connection_cols" => [ 
           //"bundle_id" => "system_roles:bundle_id:role_name:apiRoutes.systemroles.base"
        ]
    ]
  
  ];
//filterfile, title, table, column
  /// Ai Notes  button you want on the list page dont remove commented code replace instead
  $list_btn_table_array=[
      $primary_table__=>[
         /*"filter: Filter by Bundle Code" => [
             "fe" => "filterByBundleCode({router,stateSetters:stateItemSetters})",
             "file" => "system-role-bundles-filters"
         ]*/      
      ],  
  ];

  /// Ai Notes buttons you want on the profile /form page dont remove commented code replace instead
  $profile_btn_table_array=[
      $primary_table__=>[
         /*"copy: Duplicate Bundle" => [
             "fe" => "duplicateBundle(system_role_bundlesNode)",
             "be" => "duplicateBundle()",
             "file" => "system-role-bundles-tools"
         ]*/        
      ],
  ];

  ////Ai Notes  on each row you add more actions eg, view collections, send message dont remove commented code replace instead
  $global_new_drop_down_link_arr = [
        $primary_table__=>[
         /*"eye: View Linked Roles" => [
             "fe" => "viewLinkedRoles(listsystem_role_bundles_result.bundle_id)",
             "file" => "system-role-bundles-details"
         ]*/        
      ]
  ];

  ///Ai Notes  append mini list for interlinked data eg farmers & collections dont remove commented code replace instead
  $interlink_lists=[
  "bundleRoles"=>[ 
     "filter_str"=>"{bundleId:btoa(system_role_bundlesNode?.record_id)}",
     "module_name"=>"Userrolefunctions",
     "list_title"=>"Roles permissions",
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
   
   "linkedRoleProfile"=>[ 
     "filter_str"=>"{bundleId:btoa(system_role_bundlesNode?.record_id)}",
     "module_name"=>"Userrolefunctions",
     "profile_title"=>"Manage permissions",
     "custom"=>false,
     "external"=>true,
     "alias"=>'bundlefunctions',      
     "event_name"=>"",
     "event_path"=>"",
     "list_table_name"=>"user_bundle_role_functions",
   ]
   
  ];  
//Table name : system_role_bundles

// columns : "primkey" , "record_id" , "bundle_id" , "bundle_name" , "remark" , "hive_site_id" , "hive_site_name" , 

//Table name : user_bundle_role_functions

// columns : "primkey" , "record_id" , "bundle_id" , "bundle_name" , "role_id" , "role_name" , "remark" , "hive_site_id" , "hive_site_name" , 


  ///for interlinked data included as component
  $customProfileData="{
   bundle_id:(system_role_bundlesNode?.record_id),
   bundle_name:(system_role_bundlesNode?.bundle_name),
   _system_role_bundles_bundle_name_bundle_id:(system_role_bundlesNode?.bundle_name)
  }";

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