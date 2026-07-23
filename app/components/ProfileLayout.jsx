import Image from 'next/image';
import logo from '../img/logo/logo.png'; // outside public!

// ProfileLayout.js
export function UserProfileCard({ 
  navigationIsle, 
  profileTitle,  
  profilePic = "/img/logo/logo.png", 
  profileUploadBtn, 
  mainContent }) 
{
  let finalImage=profilePic;
  
  if(profilePic=="")
  {
    finalImage=logo.src
  }
  return (
    <div className="col-md-12 rounded text-left mb-0">
      {navigationIsle}
      <h3 className="col-md-12 title_text text-left p-0 mb-3 pl-lg-2">{profileTitle}</h3>
      <div className="row justify-content-center m-0 p-0 col-md-12">
        <div
          className="col-md-12 bg_w_img p-0 m-0"
          style={{ backgroundImage: `url(${finalImage})` }}
        >
          <div className="col-md-12 p-0 m-0" style={{ backgroundColor: "rgba(255,255,255,0.7)" }}>
            <div className="col-md-12 p-0 text-center m-0 pt-3">
              <img
                src={finalImage}
                className="cpointer"
                style={{ width: "200px", height: "200px", borderRadius: "50%" }}
              />
              {profileUploadBtn}
            </div>
          </div>
        </div>
        <div className="col-md-12 pt-5 p-0"></div>
        <div className="col-md-12 border-top border_set mb-4"></div>
        <div className="col-md-12 row justify-content-left m-0 p-0">
          {mainContent}
        </div>
      </div>
    </div>
  );
}

