<?php
//a.I tAKE NOTE : SUPER IMPORTTANT NOTE : ON YOUR FINAL RESULT DO NOT DELETE COMMENTED CODE

////1. user_bundle_role_functions

//"primkey" , "record_id" , "bundle_id" , "bundle_name" , "role_id" , "role_name" , "remark" , "hive_site_id" , "hive_site_name" , <br><br>


//{{table_cols_head}}

  
//Important A.I notes below 
  
//important columns on list : record_id, bundle_id, bundle_name, role_id, role_name, remark, created_at    
//important columns on profile : record_id, bundle_id, bundle_name, role_id, role_name, remark, created_at, updated_at    

/*================= How the module related to the whole app / app flow ==================== 

This module manages the relationship between bundles and roles.
It defines which roles belong to a specific bundle and enables
grouped permission assignment through bundles.

Key relationships:
- Linked to system_role_bundles via bundle_id
- Linked to system_roles via role_id
- Used in access control validation logic

================= How the module related to the whole app / app flow ==================== */

/// A.I. NOTES : create $primary_table__ config file inplace of app_users please dont omit any keys or variables rewrite new values with code leave keys intact, dont delete commented code , where possible replace it with new commented values if you are capable .
//A.I Notes  : max list col should be have 7 data important and relevant columns  , skip_cols_list the rest. eg if table have 20 cols  "skip_cols_list" => ["hive_site_id","hive_site_name", + the 13 cols ],  hive_site_id and hive_site_name should always be skipped in skip_cols_list skip_cols_profile

  // =========================
  // Core definitions
  // =========================
  $primary_table__="user_bundle_role_functions";
  $__page_title ="User Role Functions";

  $core_module_configs_=[

    //important
    "primary_table"=>$primary_table__,
    "table_alias" =>"bundlefunctions",     
    "primary_key"=>"primkey",
    "record_id"=>"record_id",
    "main_page_title"=>$__page_title,
    "api_endpoint_name"=>"userbundlerolefunctions",
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
      "data2" => "role_name",         
      "data3" => "bundle_id",     
      "data4" => "role_id"                

  ];


  /*
  |--------------------------------------------------------------------------
  | Example 2: Profile Dictionary
  |--------------------------------------------------------------------------
  | Notice same data slots, different column mapping.
  */

  $profile_dictionary = [

      "data1" => "bundle_name",               
      "data2" => "role_name",         
      "data3" => "bundle_id",         
      "data4" => "role_id"         

  ];


  $input_prefix="";

  $novanest_module_ui_blueprint_ = [

    // =========================
    // Database schema section
    // =========================
    "db_schema" => [

        // Extra table columns dont use for now 
        "custom_tbl_cols" => [
           //"user_bundle_role_functions" => ["total_functions"]
        ],

        // Default values for profile | dont use for now
        "custom_profile_default_data" => [
            //"remark" => "checkblank(getarr_val_(\$user_bundle_role_functions_node,'remark'),'Active mapping')"
        ],

        "dataRowMutations"=>[

         /* "total_roles_under_bundle" => [
              "type" => "count",
              "table" => "user_bundle_role_functions",
              "link"  => "bundle_id:bundle_id"
          ],*/ 
                 
        ],

      
    ],


    // =========================
    // UI schema section
    // =========================
    "page_layout" => [

        // Column order
        "desired_column_order" => [
            "user_bundle_role_functions" => ["primkey","record_id","bundle_id","bundle_name","role_id","role_name","remark","created_at","updated_at"]
        ],

        // Grouped inputs
        "form_input_segmentation_arr" => [
            "user_bundle_role_functions00" => [
                "Permission details" => ["role_id","remark"]
            ]
        ],

//Table name : user_bundle_role_functions

// columns : "primkey" , "record_id" , "bundle_id" , "bundle_name" , "role_id" , "role_name" , "remark" , "hive_site_id" , "hive_site_name" , 


        "image_columns" => [],
        "default_col_class" => "col-md-4",
        "hidden_inputs" => ["remark","bundle_id","bundle_name","role_name" ], 
        "print_tables" => ["user_bundle_role_functions"], 
        "skip_cols_profile" => ["hive_site_id","hive_site_name"], 
        "skip_cols_list" => ["hive_site_id","hive_site_name","updated_at","bundle_id","remark","role_name"],  
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
            "bundle_id" => "Bundle Code",
            "bundle_name" => "Role name",
            "role_id" => "Permission:col-md-7"
        ],

        "rename_tables_array" => [
            "user_bundle_role_functions" => "User Role Functions"
        ],

        "new_label_buttons_arr" => [ 
            "user_bundle_role_functions" => "link:Add permission:{`Permission / \${user_bundle_role_functionsNode?.role_name}`}" 
        ],

        "profile_pic_style" => ""
    ],
    
    "import"=>[
      "user_bundle_role_functiongs"=>["csv"=>"bundle_id,bundle_name,role_id,role_name,remark","record_id"=>""]
    ],

    // =========================
    // Behaviour schema section
    // =========================
    "data_behaviour" => [
        //this will add cehck boxes on each row   
       "add_grid_check_boxes"=>[
          "user_bundle_role_functionsf"=>"loadBundleRoleFunctions()"
        ],
                 
        //Ai Notes  dont clear this custom_multi_grid_rows instead customize if possible
        // A custom_multi_grid_rows uses data extracted from dataRowMutations 
        "custom_multi_grid_rows" => [
          /*"bundleRoles"=>[
            "table"=>"system_roles",
            "link"=>"roles_list",
            "query"=>"bundle_id='{{bundle_id}}'",
            "title"=>"Roles Under Bundle",
            "columns"=>["role_name","role_code","created_at"]
          ]*/
        ], 
      
        "custom_profile_col_data" => [
          //"total_functions"=>"?"
        ], 
      //Table name : system_role_bundles

// columns : "primkey" , "record_id" , "bundle_id" , "bundle_name" , "remark" , "hive_site_id" , "hive_site_name" , 

//Table name : system_module_manifest_

// columns : "primkey" , "record_id" , "component_name" , "module_key" , "module_name" , "permission_type" , "capability_key" , "access_name" , "relative_path" , "hive_site_id" , "hive_site_name" , 

      

        "custom_profile_default_data" => [],
        "connection_cols" => [ 
           "bundle_id" => "system_role_bundles:record_id:bundle_name:apiRoutes.systemroles.base",
           "role_id" => "system_module_manifest_:capability_key:access_name:apiRoutes.systemmodulemanifest.base: loadBundleRoleFunctions(dataRes, handleInputChange) "
        ]
    ]
  
  ];
//filterfile, title, table, column
  /// Ai Notes  button you want on the list page dont remove commented code replace instead
  $list_btn_table_array=[
      $primary_table__=>[
         /*"filter: Filter by Bundle" => [
             "fe" => "filterByBundle({router,stateSetters:stateItemSetters})",
             "file" => "user-bundle-role-functions-filters"
         ]*/      
      ],  
  ];

  /// Ai Notes buttons you want on the profile /form page dont remove commented code replace instead
  $profile_btn_table_array=[
      $primary_table__=>[
         /*"copy: Duplicate Mapping" => [
             "fe" => "loadBundleRoleFunctions(user_bundle_role_functionsNode)",
             "file" => "role-utils"
         ]*/      
      ],
  ];

  ////Ai Notes  on each row you add more actions eg, view collections, send message dont remove commented code replace instead
  $global_new_drop_down_link_arr = [
        $primary_table__=>[
         /*"eye: View Bundle Details" => [
             "fe" => "viewBundleDetails(listuser_bundle_role_functions_result.bundle_id)",
             "file" => "user-bundle-role-functions-details"
         ]*/        
      ]
  ];

  ///Ai Notes  append mini list for interlinked data eg farmers & collections dont remove commented code replace instead
  $interlink_lists=[
  /*"bundleRoleList"=>[ 
     "filter_str"=>"{bundleId:btoa(user_bundle_role_functionsNode?.bundle_id)}",
     "module_name"=>"Userrolefunctions",
     "list_title"=>"Permissions",
     "event_name"=>"",
     "custom"=>false,
     "external"=>false,
     "alias"=>'bundlefunctions', 
     "event_name"=>"",
     "event_path"=>"",
     "module_path"=>"",    
     "list_url"=>"",
     "profile_url"=>"",
   ]*/
  ];
   
  ///Ai Notes append mini profile for interlinked data dont remove commented code replace instead
  $interlink_profile=[
   
   /*"linkedBundleProfile"=>[ 
     "filter_str"=>"bundle_id='{user_bundle_role_functionsNode?.bundle_id}'",
     "module_name"=>"SystemRoleBundles",
     "profile_title"=>"Bundle Details",
     "custom"=>false,
     "external"=>true,
     "alias"=>'system_role_bundles',      
     "event_name"=>"",
     "event_path"=>"",
     "list_table_name"=>"system_role_bundles",
   ]*/
   
  ];  

  ///for interlinked data included as component
  $customProfileData="{}";

  ///=================================== basic template setup 

  $override_def_col_size="col-md-4 hive_data_cell ";
  $override_segmentation_section_class="col-md-12 bg-white border border_set shadow-md p-4 mb-4 hive_form_section";

  $additional_details_segment_title="";

  $col_size_def='col-md-12';

  $def_profile_container_class="col-md-12 rounded text-left p-2 mb-0   ";
  $def_profile_inner_container_class='` profile_container col-md-12 shadow-sm pb-4 m-0 pl-lg-3  ${showNavigationIsle &&("pr-lg-4 pl-lg-4 m-0")}`';  
  $override_justify_class="justify-content-center";
  $overide_img_section_class="col-md-6 mr-lg-5";
  $override_large_col_size="col-md-12 hive_data_cell";
  $image_style_="product_image";
  $mutations=$novanest_module_ui_blueprint_["db_schema"]["dataRowMutations"]
  ///=================================== basic template setup 

?>