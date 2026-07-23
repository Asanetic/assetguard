
<?php

//=============================================================================
// A.I INSTRUCTIONS
//=============================================================================

// FILL IN THE ARRAY VALUES FROM THE TABLE SCHEMA PROVIDED BELOW
// FOLLOW THE COMMENTED A.I EXAMPLES PROVIDED INSIDE EACH ARRAY
// DO NOT DELETE COMMENTED CODE
// DO NOT REMOVE ARRAY KEYS
// REWRITE VALUES ONLY
// APPEND NEW VALUES WHERE NECESSARY
// KEEP THE EXISTING FILE STRUCTURE INTACT
// USE THE TABLE SCHEMA TO INFER THE MOST RELEVANT UI CONFIGURATION
// KEEP desired_column_order COMPLETE
// LIMIT IMPORTANT LIST COLUMNS TO ABOUT 5-7 RELEVANT FIELDS
// PUT LESS IMPORTANT FIELDS INTO skip_cols_list
// hive_site_id AND hive_site_name SHOULD USUALLY BE SKIPPED
// USE HUMAN READABLE LABELS IN rename_cols_array
// GROUP RELATED INPUTS INTO form_input_segmentation_arr
// DETECT POSSIBLE:
// - image columns
// - password columns
// - textarea columns
// - dropdown/status columns
// - date/datetime columns
// - relationship columns
// PRESERVE COMMENTED A.I EXAMPLES
//=============================================================================


//=============================================================================
// A.I SYSTEM NOTES
//=============================================================================

// IMPORTANT : DO NOT DELETE COMMENTED CODE
// IMPORTANT : REWRITE VALUES ONLY
// IMPORTANT : KEEP ALL ARRAY KEYS INTACT
// IMPORTANT : APPEND MISSING VALUES INSTEAD OF REMOVING STRUCTURE
// IMPORTANT : ALWAYS PRESERVE EXISTING CONFIG ARCHITECTURE


//=============================================================================
// TABLE INFORMATION
//=============================================================================

// Table : user_manifest_

// Columns :

//"primkey","record_id","admin_manifest_key","user_id","user_name","role_id","site_id","role_name","project_id","project_name","created_at","updated_at","hive_site_id","hive_site_name"


//=============================================================================
// GENERATION RULES
//=============================================================================

// A.I NOTES :

// - Keep desired_column_order complete
// - Prefer human readable labels
// - Prefer clean profile optimized layouts
// - Max visible list columns should be 7
// - Remaining columns should go into skip_cols_list
// - Use textarea_array for long text columns
// - Detect image columns automatically
// - Detect password fields automatically
// - Detect date/datetime columns automatically
// - Detect dropdown/status columns automatically
// - Detect possible relationship columns automatically
// - Prefer grouping related fields into form_input_segmentation_arr


//=============================================================================
// FRAMEWORK RULES
//=============================================================================

// hive_site_id and hive_site_name should usually be skipped in:
// - skip_cols_list
// - skip_cols_profile


//=============================================================================
// EXPECTED OUTPUT RULES
//=============================================================================

// Create or rewrite config values only
// Do NOT remove existing keys
// Preserve commented suggestions where possible
// Prefer appending instead of deleting existing architecture


$user_manifest__page_layout_preset=[
    
    //==========================================================
    // COLUMN ORDER
    //==========================================================
    
    "desired_column_order" => [
        
        "user_manifest_" => [

            "primkey","record_id","admin_manifest_key","user_id","user_name","role_id","site_id","role_name","project_id","project_name","created_at","updated_at","hive_site_id","hive_site_name"

        ]

    ],


    //==========================================================
    // FORM SEGMENTATION
    //==========================================================
    
    "form_input_segmentation_arr" => [

        "user_manifest_" => [

            //A.I Example :
            //"Basic Information" => ["full_name","email","phone_number"],

            //A.I Example :
            //"Address Information" => ["country","city","address"],

            //A.I Example :
            //"Account Settings" => ["account_status","role","permissions"],

            //A.I Example :
            //"System Information" => ["created_at","updated_at"]

        ]

    ],


    //==========================================================
    // IMAGE COLUMNS
    //==========================================================
    
    "image_columns" => [

        //A.I Example :
        //"profile_pic",

        //A.I Example :
        //"company_logo",

        //A.I Example :
        //"thumbnail"

    ],


    //==========================================================
    // GENERAL UI SETTINGS
    //==========================================================
    
    "default_col_class" => "col-md-4",


    "hidden_inputs" => [

        //A.I Example :
        //"primkey",

        //A.I Example :
        //"record_id",

        //A.I Example :
        //"created_at"

    ],


    "print_tables" => [

        "user_manifest_"

    ],


    //==========================================================
    // SKIP COLUMNS
    //==========================================================
    
    "skip_cols_profile" => [

        //A.I Example :
        //"hive_site_id",

        //A.I Example :
        //"hive_site_name",

        //A.I Example :
        //"internal_token"

    ],


    "skip_cols_list" => [

        //A.I Example :
        //"hive_site_id",

        //A.I Example :
        //"hive_site_name",

        //A.I Example :
        //"description",

        //A.I Example :
        //"updated_at"

    ],


    //==========================================================
    // SPECIAL TABLE TYPES
    //==========================================================
    
    "running_bal_col_tbl" => [

        //A.I Example :
        //"transactions"

    ],


    "grid_tbl" => [

        //A.I Example :
        //"permissions"

    ],


    "view_tbl_only" => [

        //A.I Example :
        //"audit_logs"

    ],


    //==========================================================
    // SUM COLUMNS
    //==========================================================
    
    "sum_cols_list" => [

        //A.I Example :
        //"amount",

        //A.I Example :
        //"balance",

        //A.I Example :
        //"price",

        //A.I Example :
        //"total"

    ],


    //==========================================================
    // TEXT AREA COLUMNS
    //==========================================================
    
    "textarea_array" => [

        //A.I Example :
        //"description",

        //A.I Example :
        //"remark",

        //A.I Example :
        //"notes",

        //A.I Example :
        //"message"

    ],


    //==========================================================
    // CONTENT EDITABLE
    //==========================================================
    
    "content_editable" => [

        //A.I Example :
        //"description",

        //A.I Example :
        //"notes"

    ],


    //==========================================================
    // STATIC DROPDOWNS
    //==========================================================
    
    "static_drop_down_array" => [

        //A.I Example :
        //"status" => "active,inactive,pending",

        //A.I Example :
        //"gender" => "Male,Female",

        //A.I Example :
        //"priority" => "Low,Medium,High"

    ],


    //==========================================================
    // DYNAMIC DROPDOWNS
    //==========================================================
    
    "dynamic_drop_down_array" => [

        //A.I Example :
        //"branch_id" => "branches",

        //A.I Example :
        //"merchant_id" => "merchant_list",

        //A.I Example :
        //"user_id" => "system_users"

    ],


    //==========================================================
    // PASSWORD FIELDS
    //==========================================================
    
    "password_columns" => [

        //A.I Example :
        //"login_password",

        //A.I Example :
        //"user_password"

    ],


    //==========================================================
    // TITLE COLUMNS
    //==========================================================
    
    "title_columns" => [

        //A.I Example :
        //"full_name",

        //A.I Example :
        //"product_name",

        //A.I Example :
        //"device_name"

    ],


    //==========================================================
    // DATE COLUMNS
    //==========================================================
    
    "date_columns" => [

        //A.I Example :
        //"dob",

        //A.I Example :
        //"activation_date"

    ],


    //==========================================================
    // DATETIME COLUMNS
    //==========================================================
    
    "datetime_columns" => [

        //A.I Example :
        //"created_at",

        //A.I Example :
        //"updated_at",

        //A.I Example :
        //"last_seen"

    ],


    //==========================================================
    // RENAME COLUMNS
    //==========================================================
    
    "rename_cols_array" => [

        //A.I Example :
        //"userid" => "Account No",

        //A.I Example :
        //"tel" => "Phone Number",

        //A.I Example :
        //"dob" => "Date Of Birth"

    ],


    //==========================================================
    // RENAME TABLES
    //==========================================================
    
    "rename_tables_array" => [

        "user_manifest_" => "User Manifest "

    ],


    //==========================================================
    // NEW LABEL BUTTONS
    //==========================================================
    
    "new_label_buttons_arr" => [

        //A.I Example :
        //"users" => "plus:Add User:{`Profile / \${usersNode?.full_name}`}",

        //A.I Example :
        //"products" => "plus:Add Product:{`Product / \${productsNode?.product_name}`}"

    ],


    //==========================================================
    // PROFILE PIC STYLE
    //==========================================================
    
    "profile_pic_style" => ""

]
?>
;
