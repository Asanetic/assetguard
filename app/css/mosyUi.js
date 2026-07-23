import mosyThemeConfigs from '../appConfigs/mosyTheme'; // <-- Import your global config


const MosyUiTheme = () => (
  <style>{`
      
    .premium_search_wrap {
  position: relative;
}

.premium_search_input {
  border: none;
  border-bottom: 1px solid ${mosyThemeConfigs.btnBg};
  background: transparent;
  padding: 6px 2px;
  font-size: 14px;
  transition: all 0.3s ease;
}

.premium_search_input:focus {
  outline: none;
  border-bottom-color: transparent;
}

.premium_search_line {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  width: 0%;
  background: ${mosyThemeConfigs.btnBg};
  transition: width 0.35s ease;
}

.premium_search_input:focus + .premium_search_line {
  width: 100%;
}

.premium_search_input::placeholder {
  color: #98a2b3;
  font-weight: 400;
  letter-spacing: 0.3px;
}

.premium_search_btn {
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 500;
  border-radius: ${mosyThemeConfigs.systemBorderRadius};
  transition: all 0.25s ease;
}

.premium_search_btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(99, 102, 241, 0.35);
}

.premium_search_btn:active {
  transform: translateY(0px);
  box-shadow: 0 3px 8px rgba(99, 102, 241, 0.25);
}

.premium_refresh_link {
  font-size: 13px;
  font-weight: 500;
  color: ${mosyThemeConfigs.btnBg};
  text-decoration: none;
  padding: 6px 8px;
  border-radius: ${mosyThemeConfigs.systemBorderRadius};
  transition: all 0.2s ease;
}

.premium_refresh_link:hover {
  color: #111827;
  background: rgba(0,0,0,0.05);
}
  
/* ===== Mobile Layout (max 700px) ===== */
@media (max-width: 700px) {

  .premium_search_wrap {
    width: 100% !important;
  }

  .premium_search_input {
    font-size: 16px; /* better for mobile tap/zoom */
  }

  .premium_search_btn,
  .premium_refresh_link {
    flex: 1;
    text-align: center;
    padding: 10px 0;
    font-size: 14px;
  }

}

/* ===== Desktop Layout (min 700px) ===== */


















    
    .msg_alert_modal {
  display: block;
  position: fixed;
  z-index: 1;
  padding-top: 100px;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: #000;
  background-color: rgba(0, 0, 0, .4)
}

@media print {
 
  html, body {
    margin: 10 !important;
    padding: 10 !important;
    width: 100% !important;
    height: 100% !important;
  }  

  .skip_print{
  display:none;
  }

}

@media (max-width: 768px) {
  .pagination-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}


.rows_per_record{
 width:50px;
}

/* nprogress custom styling */
#nprogress {
  pointer-events: none;
}

#nprogress .bar {
  background: ${mosyThemeConfigs.btnBg}; /* YouTube uses red, you can use #ff0000 */
  height: 5px;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 9999;
}

  
.sidebar-inner {
  scrollbar-width: thin;
  scrollbar-color: ${mosyThemeConfigs.btnBg} transparent;
  overflow-y: auto;

}


/* File: bootstrapSkeleton.css */
.skeleton-loader .skeleton-box {
  background: #e0e0e0;
  border-radius: 4px;
  animation: skeletonPulse 1.5s infinite ease-in-out;
}

@keyframes skeletonPulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
  100% {
    opacity: 1;
  }
}

  
.rounded_avatar {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  object-fit: cover;
}

.rounded_border_avatar{
  width: 300px;
  height: 300px;
  border-radius: 50%;
  border: 10px solid #e0e0e0!important;
  padding:9px;
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.2);
  }

.product_image {
  width: 450px;
  max-width:100%;
  height: auto;
  border-radius: 5%;
  object-fit: contain;
}

.banner_profile {
  width: 100%;
  height: 250px;
  object-fit: cover;
  border-radius: 0;
  background-size: cover;
  background-position: center;
}

.small_thumbnail {
  width: 70px;
  height: 70px;
  border-radius: 10px;
  object-fit: cover;
}
          
//image viewer           
.btn-outline-primary         
{
  border-color:${mosyThemeConfigs.btnBg}
}
          
.btn-outline-primary:hover       
{
  border-color:${mosyThemeConfigs.btnBg};
  background-color:${mosyThemeConfigs.btnBg};
  color: ${mosyThemeConfigs.btnTxt};
}
   
.bottom_tbl_handler{
 padding-bottom:150px;
 margin-top:0px;
}

/* All modals take full width on small screens */
/* Pure percentage-based modal widths */
.mosycard_wide {
  width: 80% !important;
  max-width: 80% !important;
}

.mosycard_medium {
  width: 65% !important;
  max-width: 65% !important;
}

.mosycard_50{
  width: 50% !important;
  max-width: 50% !important;
}

.mosycard_full {
  width: 95% !important;
  max-width: 95% !important;
}

/* On mobile: full width always */
@media (max-width: 768px) {
  .mosycard_wide,
  .mosycard_medium,
  .mosycard_full, 
  .mosycard_50 {
    width: 100% !important;
    max-width: 100% !important;
  }
}


/* Ensure the modal content doesn't overflow the screen */
.mosycard_scrollable {
  max-height: 90vh;
  overflow-y: auto;
}

/* Optional: prevent backdrop scroll */
body.modal-open {
  overflow: hidden;
}



.main_list_container{
  padding-left:20px!important;
  padding-right:20px!important;
}          
.fancy-gradient-spinner {
  width: 90px;
  height: 90px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hide_livesearch_add_new{
 display:none;
}

.show_livesearch_add_new{
 display : block!important;
}


.fancy-gradient-spinner::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(from 0deg,
    ${mosyThemeConfigs. btnSecondColor}10,
    #ccc,
    ${mosyThemeConfigs.btnSecondColor},
    ${mosyThemeConfigs.btnFirstColor}
  );
  
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3px), black 0);
  mask: radial-gradient(farthest-side, transparent calc(100% - 3px), black 0);
  animation: spin 2s linear infinite;
  z-index: 0;
}

.fancy-gradient-spinner i {
  z-index: 1;
  font-size: 1.5rem;
  color: #007bff;
}

.max_height_300px{
max-height:300px;
overflow-y:auto;
} 

.smart_editor_editor_page {
  width: 21cm; /* A4 width */
  height: 29.7cm; /* A4 height */
  padding: 2cm;
  margin: 1cm auto;
  border: 1px solid #ddd;
  background: white;
  box-shadow: 0 0 5px rgba(0,0,0,0.1);
  overflow: hidden;
  page-break-after: always;
}

@media print {
  .smart_editor_editor_page {
    border: none;
    box-shadow: none;
    page-break-after: always;
  }
}


@keyframes fadeInSlide {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.btn.disabled, .btn:disabled {
  opacity: 0.6;
  pointer-events: none;
}

                                
.msg_modal-content {
  background-color: #fefefe;
  margin: auto;
  padding: 20px;
  border: 1px solid #888;
  width: 40%;
  text-align: center;
}

.modal-content{
  background-color: ${mosyThemeConfigs.ctnBg};
  margin: auto;
  padding: 20px;
  border: 1px solid #FFF;
  text-align: center;
  border-radius:${mosyThemeConfigs.systemBorderRadius};
}
     
          
.modal-backdrop.show {
    opacity: .1;
}          
          
.msg_modal-content_banner {
  background-color: #fefefe;
  margin: auto;
  padding: 20px;
  border: 1px solid #888;
  width: 52%;
  font-size: 16px
}

.msg_modalclose {
  color: #aaa;
  float: right;
  font-size: 28px;
  font-weight: 700
}

.msg_modalclose:focus,
.msg_modalclose:hover {
  color: #000;
  text-decoration: none;
  cursor: pointer
}

.validate_error_class {
  font-size: 11px;
  color: red
}

.hide_error_class {
  display: none
}

@media screen and (max-width:700px) {
  .msg_modal-content {
    width: 98%
  }

  .msg_modal-content_banner {
    padding: 5px;
    width: 98%
  }
}



/*------------------------custom theme color scheme  ------------------------------*/
.hive_form_section {
  border-radius: ${mosyThemeConfigs.systemBorderRadius};
}

p {
  padding: 0px;
  margin: 0px;
}

.title_text {
  letter-spacing: -0.80px;
}


thead {
  background-color: ${mosyThemeConfigs.btnSecondColor}10;
}

.description_text {
  font-size: 12px;
}

::placeholder {
  font-size: 14px;
  /*color:#19162c!important;*/
}


.form-control {
  height: 48px !important;
  border-radius:${mosyThemeConfigs.systemBorderRadius};
}

.label_text {
  font-size: 14px;
  font-weight: 600 !important;
}

body {
  line-height: 1.6
}

.btn {
  height: 48px !important;
  line-height: 37px !important;
}

/* ---------------------------------------------------- Modern Ui --------------------- */
.header .header-left {
  background: ${mosyThemeConfigs.sideBarChipBg};
  box-shadow: 0 4px 4px rgb(66 11 161/20%);
  border-top-right-radius: ${mosyThemeConfigs.systemBorderRadius};
}

@media only screen and (min-width: 992px) {
    .mini-sidebar .page-wrapper {
       // margin-left: 0px;
    }
}

#toggle_btn {
  color: ${mosyThemeConfigs.sideBarChipTxt};
  margin-left: 0px;
}

.sidebar-inner {
  background: ${mosyThemeConfigs.sideBarBg};
}

.sidebar-menu>ul>li:hover {
  background: ${mosyThemeConfigs.sideBarBg};
}

.sidebar-menu li a {
  color: ${mosyThemeConfigs.sideBarTxt};
}

.nav-link:focus,
.nav-link:hover {
  color: ${mosyThemeConfigs.sideBarTxt};
}

.table thead th {
  white-space: nowrap;
  vertical-align: center;
  border-top: 1px solid #dee2e6;
  font-size: 14px;
}

.table tbody td {
  white-space: nowrap;
  vertical-align: center;
  border-top: 1px solid #dee2e6;
  font-size: 14px;
}

.mosy_modal {
  position: fixed;
  z-index: 1;
  left: 30%;
  top: 29%;
  width: 40%;
  height: 50%;
  overflow: auto;
}

@media screen and (max-width: 700px) {
  .mosy_modal {
    width: 99%;
    left: 1%;
  }

  .header .header-left {
    background: ${mosyThemeConfigs.sideBarChipTxt};
  }

  #toggle_btn {
    color: ${mosyThemeConfigs.sideBarChipBg};
  }
}

.table-search button {
  background-color: #008F59;
  color: #fff !important;
}

.table-search button span {
  background-color: #008F59;
  color: #fff !important;
}

.navbar-light .navbar-nav .nav-link {
  color: #FFF;
}

.navbar-light .navbar-nav .nav-link:focus,
.navbar-light .navbar-nav .nav-link:hover {
  color: #008F59;
}

.primary_clr {
  color: #008F59
}

.trim_text {
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.overflow_y {
  overflow-y: auto;
}

.max_height_350 {
  max-height: 350px;
  overflow-y: auto;
}

.desk_font {
  font-size: 14px;
}

.large_icon {
  font-size: 50px !important;
}

.medium_icon {
  font-size: 35px !important;
}

.rounded_big {
  border-radius: 30px !important;
  overflow: hidden;
}

.rounded_medium {
  border-radius: 10px;
  overflow: hidden;
}
  
.medium_curve{
  border-radius:10px;
}

.useravatar_small {
  width: 50px;
  height: 50px;
  border-radius: 50%;
}

.useravatar_90 {
  width: 80px;
  height: 80px;
  border-radius: 50%;
}


.useravatar_120 {
  width: 120px;
  height: 120px;
  border-radius: 50%;
}


.card-img-overlay {
  background: rgba(255, 255, 255, 0.8);
}

.bg_w_img_overlay {
  background: rgba(255, 255, 255, 0.8);

}

.shadow {
  box-shadow: 0 20px 27px 0 rgb(0 0 0 / 5%) !important;
}

.slanted_tray {
  clip-path: polygon(0 0, 95% 0%, 100% 100%, 0% 100%);
  padding-right: 30px;
}

.sticky_scroll {
  position: sticky;
  top: 0px;
}

.stats_knob {
  border: 3px solid #008F59;
  border-bottom-color: #F8DD83;
  border-left-color: #F8DD83;
}

.bg-warning {
  background-color: #f7c72f !important;
}

@keyframes zoom_in_out_anime {
  0% {
    transform: scale(1, 1);
  }

  50% {
    transform: scale(1.2, 1.2);
  }

  100% {
    transform: scale(1, 1);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.btn:hover {
  animation: zoom_in_out_anime 1s linear;
}

.bounce_up_down:hover {
  animation: bounce_anime 2s linear alternate;
  -webkit-animation: bounce_anime 2s linear alternate;
}

.zoom_in_out:hover {
  animation: zoom_in_out_anime 2s linear alternate;
  -webkit-animation: zoom_in_out_anime 2s linear alternate;
}

.badge:hover {
  animation: zoom_in_out_anime 2s linear alternate;
  -webkit-animation: zoom_in_out_anime 2s linear alternate;
}

.badge-primary {
  margin-bottom: 10px;
  color: #fff;

}

.badge {
  color: #000;

}

@-webkit-keyframes bounce_anime {

  0%,
  100% {
    -webkit-transform: translateY(0);
  }

  50% {
    -webkit-transform: translateY(-10px);
  }
}


@keyframes bounce_anime {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-10px);
  }
}


@-webkit-keyframes bounce_left_right_anime {

  0%,
  100% {
    -webkit-transform: translateX(0);
  }

  50% {
    -webkit-transform: translateX(-10px);
  }
}


@keyframes bounce_left_right_anime {

  0%,
  100% {
    transform: translateX(0);
  }

  50% {
    transform: translateX(-10px);
  }
}

.bounce_left_right:hover {
  animation: bounce_left_right_anime 2s linear alternate;
  -webkit-animation: bounce_left_right_anime 2s linear alternate;
}

.auto_bounce_left_right {
  animation: bounce_left_right_anime 2s linear alternate;
  -webkit-animation: bounce_left_right_anime 2s linear alternate;
}

.tr:hover {
  animation: bounce_left_right_anime 2s linear alternate;
  -webkit-animation: bounce_left_right_anime 2s linear alternate;
}

@-webkit-keyframes fadeindown {
  0% {
    opacity: 0;
    -webkit-transform: translateY(-10px);
  }

  100% {
    opacity: 1;
    -webkit-transform: translateY(0);
  }
}

@keyframes fadeindown {
  0% {
    opacity: 0;
    transform: translateY(-10px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.fadeindown {
  -webkit-animation: fadeindown;
  animation: fadeindown ease 2s;
}


.table_cell_dropdown-content a {
  font-size: 13px;
  padding-top: 6px !important;
  padding-bottom: 6px !important;
  z-index: 1!important;

}

table_cell_dropbtn {
      font-size: 16px;
      font-weight: 700
}

.table_cell_dropdown {
      display: inline-block
}

.table_cell_dropdown-content {
      display: none;
      position: absolute;
      background-color: #fff;
      min-width: 160px;
      box-shadow: 0 8px 16px 0 rgba(0, 0, 0, .2);
      z-index: 1;
      text-align: left;
      padding-left: 5px;
      border-left: 2px solid #00f
}

.table_cell_dropdown-content a {
      color: #000;
      padding: 12px 16px;
      text-decoration: none;
      display: block
}

.table_cell_dropdown-content span {
      color: #000;
      padding: 12px 16px;
      text-decoration: none;
      display: block;
      cursor: pointer
}

.table_cell_dropdown-content a:hover {
      background-color: #ddd
}

.table_cell_dropdown-content span:hover {
      background-color: #ddd
}

.table_cell_dropdown:hover .table_cell_dropdown-content {
      display: block
}

tr:hover .table_cell_dropdown-content {
      display: block
}
  
.datarow_card:hover .table_cell_dropdown-content {
      display: block  
} 
  
.bg_w_img {
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
}

body {
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  background: ${mosyThemeConfigs.bodyColor};
  font-family: "Poppins", "Helvetica Neue", "Open Sans", "Arial", "sans-serif";
  line-height: 30px;
  font-weight: 400;
  font-size: 16px;
  color: #000;
}

.msg_alert_modal {
  animation: bounce_anime 1s linear alternate;
  -webkit-animation: bounce_anime 1s linear alternate;
  border-radius: 4px;

}

.msg_modal-content {
  border-top: 7px solid ${mosyThemeConfigs.btnBg} !important;
  text-align: center;
  background-color: #FFF !important;
  border-radius: 15px;
  color: #000;
}

.auto_bounce {
  animation: bounce_anime 1s linear alternate;
  -webkit-animation: bounce_anime 1s linear alternate;
}

.command_pic_ring {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  padding: 0px;
  display: inline-block;
  margin: 50px;
  border-top: 1px solid #000;
  animation-name: spin;
  animation-duration: 17000ms;
  animation-iteration-count: infinite;
  animation-timing-function: linear;
}

.command_pic_ring2 {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  box-shadow: 1px 1px 1px 1px #008F59;
  padding: 0px;
  display: inline-block;
  border-top: 1px solid #000;
  animation-name: spin;
  animation-duration: 13000ms;
  animation-iteration-count: infinite;
  animation-timing-function: linear;
}



.toast_card {
  z-index: 99999;
}

.toast {
  background-color: ${mosyThemeConfigs.btnBg} !important;

}

::-webkit-file-upload-button {
  border-radius: 4px;
  background: linear-gradient(225deg,  ${mosyThemeConfigs.btnFirstColor}, ${mosyThemeConfigs.btnSecondColor});
  border: 0px;
  color: #fff;
  padding: 4px;
  padding-right: 7px;
  padding-left: 7px;
}

.border_set {
  border-color: ${mosyThemeConfigs.btnBg} !important;
  border-width: 1px !important;
}

.btn_neo {
  border-radius: 4px;
  background: linear-gradient(225deg,  ${mosyThemeConfigs.btnFirstColor}, ${mosyThemeConfigs.btnSecondColor});
  border: 0px;
  color: #fff;
}

.text-primary {
  color: #000 !important;
}

.btn_neoo2 {
  color: #fff;
  border-radius: 4px;
  background: linear-gradient(225deg, ${mosyThemeConfigs.btnFirstColor}, ${mosyThemeConfigs.btnSecondColor});
  /*box-shadow:  -10px 10px 90px #000000,
             10px -10px 50px #ffffff;*/
}

.btn-primary {
  background: linear-gradient(225deg, ${mosyThemeConfigs.btnFirstColor}, ${mosyThemeConfigs.btnSecondColor});
  /*box-shadow:  -10px 10px 90px #000000,
             10px -10px 50px #ffffff;*/
  border: 2px;
}

.nav-pills .nav-link.active,
.nav-pills .show>.nav-link {
  border-radius: 0px;
  background: linear-gradient(225deg, ${mosyThemeConfigs.btnFirstColor}, ${mosyThemeConfigs.btnSecondColor});
  /*box-shadow:  -10px 10px 90px #000000,
             10px -10px 50px #ffffff;*/
  border: 0px;
}

.ctn_set {
  background-color: #fff;
  color: #000;
}

.btn_set {
  background-color: ${mosyThemeConfigs.btnBg};
  color: ${mosyThemeConfigs.btnTxt};
}

.body_set {
  background-color: ${mosyThemeConfigs.bodyColor};
  color: ${mosyThemeConfigs.bodyTxt};
}

.nav_bar_set {
  background-color: #FFF;
  border-bottom: 1px solid #ccc;
}

.page-item.active .page-link {
  color: #fff;
  background-color: ${mosyThemeConfigs.btnBg};
  border-color: ${mosyThemeConfigs.btnBg};
}

.skin_plasma {
  height: auto;
  background-color: rgba(255, 255, 255, 0.0)
}

/* width */
::-webkit-scrollbar {
  width: 8px;
}

/* Track */
::-webkit-scrollbar-track {
  background: #ccc;
}

/* Handle */
::-webkit-scrollbar-thumb {
  background: ${mosyThemeConfigs.btnBg};
}

/* Handle on hover */
::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/*------------------------custom theme color scheme  ------------------------------*/

.form-control {
  background-color: transparent;
  border: 1px solid ${mosyThemeConfigs.genBorderColor} !important;
  color: #000;
}

.form-control:focus {
  color: #495057;
  background-color: #fff;
  border-color: #80bdff !important;
  box-shadow: 0 0 0 .2rem rgba(0, 123, 255, .25);
}

.sun-editor {
  border: 1px solid #d0d0d0;
  border-radius: 12px;
  font-family: 'Inter', sans-serif;
}

.sun-editor .se-toolbar {
  background-color: ${mosyThemeConfigs.btnSecondColor}10;
  border-bottom: 1px solid #fff;
}

.sun-editor .se-btn {
  border-radius: 20px;
}


.table {
  color: #343a40;
}

.form-group label {
  font-size: 14px;
  font-weight: 600 !important;
  padding: 0px !important;
  margin: 0px !important;
}

.cpointer {
  cursor: pointer;
}

.padding_row_gen {
  margin-top: 0px !important;
}

.padding_row {
  margin-top: 0px !important;
}

.navbar-brand {
  font-size: 27px;
}

.s_show_title {

  margin-top: 15%;

}

@media screen and (max-width: 700px) {


  .s_show_title {

    margin-top: 30%;

  }

  .badge-primary {
    margin-bottom: 10px;
    color: #fff;
  }

  .msg_alert_modal {
    padding-top: 60px !important;
  }

  /* width */
  ::-webkit-scrollbar {
    width: 1px;
  }

  .padding_row {
    margin-top: 50px !important;
  }

  .navbar-brand {
    font-size: 14px;
  }

  .padding_row_gen {
    margin-top: 50px !important;
  }

  .skin_plasma {
    height: auto;
  }

  .text_center_mobi {
    text-align: center !important;
  }

}

.mosy_text_area{
 min-height:200px;
}

.title_text {
  letter-spacing: -0.80px;
}

.description_text {
  font-size: 12px;
}

::placeholder {
  font-size: 14px;
  /*color:#19162c!important;*/
}


.form-control {
  height: 48px !important;
}

.label_text {
  font-size: 14px;
  font-weight: 600 !important;
}

body {
  line-height: 1.6
}

.btn {
  height: 48px !important;
  line-height: 37px !important;
  border-radius:${mosyThemeConfigs.systemBorderRadius};
}


.table thead tr th {
  box-sizing: border-box;
  text-overflow: ellipsis;
  outline: none;
  text-align: left;
}

.table thead tr {
  height: 56px;
}

.table tbody tr {
  height: 52px;
}

.table tbody tr td {
  box-sizing: border-box;
  text-align: left;
  text-overflow: ellipsis;
  vertical-align: middle
}

.search_input {
  border: 1px solid #ccc;
  padding: 7px;
  border-radius: 20px;
}

.custom-search-input {
  width: 100%;
  border: 1px solid #ccc;
  border-radius: ${mosyThemeConfigs.systemBorderRadius};
  padding: 10px 100px 10px 20px;
  line-height: 1;
  box-sizing: border-box;
  outline: none;
}

.custom-search-botton {
  position: absolute;
  right: 3px;
  top: 3px;
  bottom: 3px;
  border: 0;
  background: transparent;
  color: #008F59;
  outline: none;
  margin: 0;
  padding: 0 10px;
  border-radius: 0.5rem !important;
  z-index: 2;
}

.medium_btn {
  display: inline-block;
  padding: 10px;
  font-size: 14px;
  border-radius:${mosyThemeConfigs.systemBorderRadius};
  white-space: nowrap;
  margin-bottom:9px;
}

.hive_data_cell {
  padding-right: 15px;
  padding-left: 15px;

}

.hive_list_nav_tray {
  padding-top: 0px !important;
}

.hive_list_search_divider {
  padding-top: 10px !important;
}

@media screen and (max-width: 700px) {

  .medium_btn {
    padding: 7px;
    font-size: 12px;
    margin-top: 10px;
  }

  .hive_list_nav_refresh {
    margin-top: 0px;
  }

  .hive_list_nav_new {
    margin-top: 0px;
    margin-left: 0px !important;
  }

  .hive_list_nav_tray {
    padding-left: 0px !important;
    padding-top: 10px !important;
  }

  .hive_profile_nav_add_new_tray {
    padding-top: 17px !important;
    text-align: left !important;
    padding-bottom: 12px !important;
    padding-left: 0px;
    padding-right: 0px;
  }

  .hive_profile_nav_del_btn {
    margin-left: 0px !important;
  }

  .hive_profile_navigation {

    padding-left: 0px !important;
  }

  .hive_profile_navigation {
    padding-top: 0px !important;
    margin-bottom: 0px !important;
  }

  .hive_list_search_divider {
    display: none;
  }

  .hive_profile_navigation_divider {
    display: none;
  }

  .hive_profile_nav_back_to_list_tray {
    border-bottom: 1px solid;
    border-color: #ccc;
  }

  .hive_list_search_tray {
    margin-bottom: 10px;
  }

  .title_text {
    font-size: 18px;
  }

  .hive_data_cell {
    padding-right: 0px;
    padding-left: 0px;
  }

}

.login-body {
  background-image: url('');
}

.login-wrapper .loginbox {
  box-shadow: 0 0 0px;
  background-color:transparent;

}

      .login_logo_tray_{
          width: 350px;
          height: 350px;
          border-radius: 50%;
          background-color: #ffffff;
          margin: auto; /* Center the container */
      }

      @media (max-width: 768px) {
          /* Adjust styles for smaller screens */
          .login_logo_tray_{
              width: 80%;
              height: 80%;
          }
      }
                              
  `}</style>
);

export default MosyUiTheme;
  