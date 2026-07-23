<?php
//a.I tAKE NOTE : SUPER IMPORTTANT NOTE : ON YOUR FINAL RESULT DO NOT DELETE COMMENTED CODE

//{{table_cols_head}}

//Important A.I notes below 

//important columns on list : primkey, component_name, module_key, permission_type, capability_key, relative_path    
//important columns on profile : primkey, component_name, module_key, permission_type, capability_key, relative_path    

/*================= How the module related to the whole app / app flow ==================== 

This module manages the system module manifest registry for the application. 
It defines registered system components, their module keys, permissions, 
capability bindings, and relative paths used for routing and access control.

Key relationships:
- Referenced by permission middleware
- Controls feature-level capability access
- Used by routing engine for dynamic module resolution

================= How the module related to the whole app / app flow ==================== */

/// A.I. NOTES : create $primary_table__ config file inplace of app_users please dont omit any keys or variables rewrite new values with code leave keys intact, dont delete commented code , where possible replace it with new commented values if you are capable .
//A.I Notes  : max list col should be have 7 data important and relevant columns  , skip_cols_list the rest. eg if table have 20 cols  "skip_cols_list" => ["hive_site_id","hive_site_name", + the 13 cols ],  hive_site_id and hive_site_name should always be skipped in skip_cols_list skip_cols_profile

  // =========================
  // Core definitions
  // =========================
  $primary_table__="system_module_manifest_";
  $__page_title ="System Module Manifest";

  $core_module_configs_=[

    //important
    "primary_table"=>$primary_table__,
    "table_alias" =>"accesscontrol",     
    "primary_key"=>"primkey",
    "record_id"=>"record_id",
    "main_page_title"=>$__page_title,
    "api_endpoint_name"=>"accesscontrol",
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
  //$profile_template= file_get_contents('../novatemplates/dna_profile_w_bg.tdna');
  //$profile_template= file_get_contents('../novatemplates/profile8.tdna');

  /*
  |--------------------------------------------------------------------------
  | Example 1: Grid Dictionary
  |--------------------------------------------------------------------------
  */

  $csgrid_dictionary = [

      "data1" => "component_name",
      "data2" => "module_key",
      "data3" => "permission_type",
      "data4" => "capability_key"

  ];


  /*
  |--------------------------------------------------------------------------
  | Example 2: Profile Dictionary
  |--------------------------------------------------------------------------
  */

  $profile_dictionary = [

      "data1" => "component_name",
      "data2" => "module_key",
      "data3" => "permission_type",
      "data4" => "relative_path"

  ];


  $input_prefix="";

  $novanest_module_ui_blueprint_ = [

    // =========================
    // Database schema section
    // =========================
    "db_schema" => [

        // Extra table columns dont use for now 
        "custom_tbl_cols" => [
           //"system_module_manifest_" => ["computed_permission_label"]
        ],

        // Default values for profile | dont use for now
        "custom_profile_default_data" => [
            //"permission_type" => "read"
        ],

        "dataRowMutations"=>[

         /* "total_capabilities" => [
              "type" => "count",
              "table" => "system_capabilities",
              "link"  => "module_key:module_key"
          ]*/ 
                 
        ],

      
    ],


    // =========================
    // UI schema section
    // =========================
    "page_layout" => [

        // Column order
        "desired_column_order" => [
            "system_module_manifest_" => ["primkey","record_id","component_name","module_name","access_name","permission_type","capability_key","module_key","relative_path"]
        ],
//Table name : system_module_manifest_

// columns : "primkey" , "record_id" , "component_name" , "module_key" , "module_name" , "permission_type" , "capability_key" , "access_name" , "relative_path" , "hive_site_id" , "hive_site_name" , 


        // Grouped inputs
        "form_input_segmentation_arr" => [
            "system_module_manifest_" => [
                "Module Identity" => ["component_name","module_key","module_name","access_name"],
                "Permission Settings" => ["permission_type","capability_key"],
                "Routing Configuration" => ["relative_path"]
            ]
        ],

        "image_columns" => [],
        "default_col_class" => "col-md-4",
        "hidden_inputs" => [], 
        "print_tables" => ["system_module_manifest_"], 
        "skip_cols_profile" => ["hive_site_id","hive_site_name"], 
        "skip_cols_list" => ["hive_site_id","hive_site_name"],  
        "running_bal_col_tbl" => [],
        "grid_tbl" => [], 
        "view_tbl_only" => [],
        "sum_cols_list" => [], 
        "textarea_array" => [], 
        "content_editable" => [], 

        "static_drop_down_array" => [
            //"permission_type" => "read,write,execute,admin"
        ],

        "dynamic_drop_down_array" => ["module_name","permission_type","access_name","module_key"], 
        "password_columns" => [], 
        "title_columns" => [], 
        "date_columns" => [],
        "datetime_columns" => [],

        "rename_cols_array" => [ 
            "component_name" => "Component Name",
            "module_key" => "Module Key",
            "permission_type" => "Permission Type",
            "capability_key" => "Capability Key",
            "relative_path" => "Relative Path:col-md-12"
        ],

        "rename_tables_array" => [
            "system_module_manifest_" => "System Module Manifest"
        ],

        "new_label_buttons_arr" => [ 
            "system_module_manifest_" => "plus:New Module:{`Module Profile / \${system_module_manifest_Node?.component_name} / \${system_module_manifest_Node?.access_name}`}"
        ],

        "profile_pic_style" => "width:120px; height:120px; border-radius:10%;"
    ],
    
    "import"=>[
      "system_module_manifest_d"=>["csv"=>"component_name,module_key,permission_type,capability_key,relative_path","record_id"=>""]
    ],

    // =========================
    // Behaviour schema section
    // =========================
    "data_behaviour" => [
         
       "add_grid_check_boxes"=>[
          "system_module_manisfest_"=>"loadSystemModuleManifest()"
        ],
                 
        "custom_multi_grid_rows" => [
          /*"linked_capabilities"=>[
            "table"=>"system_capabilities",
            "link"=>"system_capabilities_list",
            "query"=>"module_key='{{module_key}}'",
            "title"=>"Linked Capabilities",
            "columns"=>["capability_key","description"]
          ]*/
        ], 
      
        "custom_profile_col_data" => [
          //"computed_permission_label"=>"?"
        ], 
      
        "custom_profile_default_data" => [],
        "connection_cols" => [ 
           //"capability_key" => "system_capabilities:capability_key:description:apiRoutes.systemcapabilities.base"
        ]
    ]
  
  ];

//filterfile, title, table, column
  $list_btn_table_array=[
      $primary_table__=>[
         /*"filter: Filter by Permission" => [
             "fe" => "filterByPermission(`../systemmodulemanifest/apilist`,`Filter permission`, `system_module_manifest_`,`permission_type`)",
             "be" => "filterByPermission()",
             "file" => "system-module-manifest-filters"
         ]*/      
      ],  
  ];

  $profile_btn_table_array=[
      $primary_table__=>[
         /*"shield: Validate Capability" => [
             "fe" => "validateCapability(system_module_manifest_Node?.module_key)",
             "be" => "validateCapability()",
             "file" => "system-module-manifest-tools"
         ]*/        
      ],
  ];

  $global_new_drop_down_link_arr = [
        $primary_table__=>[
         /*"eye: View Linked Capabilities" => [
             "fe" => "viewLinkedCapabilities(listsystem_module_manifest__result.module_key)",
             "file" => "system-module-manifest-details"
         ]*/        
      ]
  ];

  $interlink_lists=[
  "moduleCapabilities"=>[ 
     "filter_str"=>" ",
     "module_name"=>"Systemmodulemanifest",
     "list_title"=>"More Modules",
     "event_name"=>"",
     "custom"=>false,
     "external"=>false,
     "alias"=>'accesscontrol', 
     "event_name"=>"",
     "event_path"=>"",
     "module_path"=>"",    
     "list_url"=>"",
     "profile_url"=>"",
   ]
  ];
   
  $interlink_profile=[
   
   /*"linkedCapabilityProfile"=>[ 
     "filter_str"=>"capability_key='{system_module_manifest_Node?.capability_key}'",
     "module_name"=>"SystemCapabilities",
     "profile_title"=>"Capability Profile",
     "custom"=>false,
     "external"=>true,
     "alias"=>'system_capabilities',      
     "event_name"=>"",
     "event_path"=>"",
     "list_table_name"=>"system_capabilities",
   ]*/
   
  ];  

  $customProfileData="{}";

  ///=================================== basic template setup 

  $override_def_col_size="col-md-6 hive_data_cell ";
  $override_segmentation_section_class="col-md-8 bg-white border border_set shadow-md p-4 mb-4 hive_form_section";

  $additional_details_segment_title="";

  $col_size_def='col-md-12';

  $def_profile_container_class="col-md-9 rounded text-left p-2 mb-0  bg-white ";
  $def_profile_inner_container_class='` profile_container col-md-12 m-0 p-0  ${showNavigationIsle &&("pr-lg-4 pl-lg-4 m-0")}`';  
  $override_justify_class="justify-content-center";
  $overide_img_section_class="col-md-6 mr-lg-5";
  $override_large_col_size="col-md-12 hive_data_cell";
  $image_style_="product_image";
  $mutations=$novanest_module_ui_blueprint_["db_schema"]["dataRowMutations"]
  ///=================================== basic template setup 

?>