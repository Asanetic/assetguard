// appConfigs.js
import Image from 'next/image';
import logo from '../img/logo/logo.png'; // outside public!


const commonRoot = ""; // Update this path if needed

const mosyThemeConfigs = {
  // App Identity
  mosyAppName: "Super ERP",
  mosySystemName: "supercrmv7",
  mosyAppLogo: logo.src,
  mosyAppLogoStyle: {
    width: "auto",
    height: "70px",
  },

  // Color Scheme
  themeName: "Mosy",
  btnBg: "#14315D",
  btnTxt: "#fff",
  ctnBg: "#FCFCFC",
  ctnTxt: "#000",
  bodyColor: "#fff",//"rgba(247, 244, 244, 0.9)",
  bodyTxt: "#000",
  navBarBgColor: "#FFF",
  navbarBorderColor: "#ccc",
  navbarBorderSize: "1",
  navShadowClass: "shadow-sm",
  genBorderColor: "#ccc",
  genBorderSize: "1",
  wildColor: "",
  skinPlasma: "rgba(255, 255, 255, 0.0)",
  bodySkinCss: "#fff",

  systemBorderRadius : "10px",

  // Gradient and Sidebar
  btnFirstColor: "#000000",
  btnSecondColor: "#14315D",
  get sideBarBg() {
    return `linear-gradient(225deg, ${this.btnFirstColor}, ${this.btnSecondColor})`;
    //return this.btnBg;
  },

  get sideBarTxt() {
    return this.btnTxt;
  },


  get sideBarChipBg() {
    return this.sideBarBg;
  },
  get sideBarChipTxt() {
    return this.sideBarTxt;
  },
  sideBarType: "mini-sidebar", // mini-sidebar || ""

  // App Colors Shortcut
  get skinClr() {
    return this.ctnBg;
  },
  get buttonClr() {
    return this.btnBg;
  },
  get genTxtClr() {
    return this.ctnTxt;
  },
  get buttonTxtClr() {
    return this.btnTxt;
  },

  // App Routing (placeholder, update with actual Next.js routes)
  appIndexPage: "/sedcoclient/mywallet",
};

export default mosyThemeConfigs;
