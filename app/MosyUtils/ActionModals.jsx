import {MosyCard, closeMosyCard } from '../components/MosyCard';         
import React, { useEffect, useState } from 'react';

// This should be declared once in a shared scope
let mosyNotifyTimer = null;

function clearMosyTimer() {
  if (mosyNotifyTimer) {
    clearTimeout(mosyNotifyTimer);
    mosyNotifyTimer = null;
  }
}


export function MosyAlertCard({
  icon = "bell",
  iconColor = "text-danger",
  message = "Are you sure?",
  yesLabel = "Yes",
  noLabel = "No",
  onYes,
  onNo,
  dismissable = true,
  autoDismissOnClick=true,
  id="smartmodaldefaultId"
}) {
  clearMosyTimer(); // Stop notify if active

  function handleYes() {
    if (typeof onYes === "function") onYes();

    if(autoDismissOnClick){
     closeMosyCard();
    }

  }

  function handleNo() {
    if (typeof onNo === "function") onNo();

    if(autoDismissOnClick){
     closeMosyCard();
    }
  
  }

  const showYes = yesLabel && yesLabel.toLowerCase() !== "none";
  const showNo = noLabel && noLabel.toLowerCase() !== "none";

  const buttonRow = (showYes || showNo) ? (
    <div className="row col-md-12 justify-content-center mt-4 border-top border_set pt-3 p-0 m-0">
      {showYes && (
        <button
          className="btn btn-outline-primary border border_set ml-lg-4 col-lg-4 col-5"
          onClick={handleYes}
        >
          {yesLabel}
        </button>
      )}
      {showYes && showNo && <div className="col-2"></div>}
      {showNo && (
        <button
          className="btn btn-outline-primary border border_set col-lg-4 col-5"
          onClick={handleNo}
        >
          {noLabel}
        </button>
      )}
    </div>
  ) : null;

  return MosyCard(
    "",
    <>
    <div className="row col-md-12 justify-content-center p-0 m-0 ">
      <div className="fancy-gradient-spinner" title="Alert">
        <i className={`fa fa-${icon} large_icon ${iconColor}`}></i>
      </div>
    </div> 
    <div className="text-center">
      <p className="mt-3 mb-3">{message}</p>
      {buttonRow}
    </div>
    </>,
    dismissable,
    id
  );
}


export function MosyNotify({ 
  message = "Done!", 
  icon = "info-circle", 
  iconColor = "text-primary", 
  duration = 5000 ,
  addTimer = true,
  id= "smartmodaldefaultId"
}) {
  clearMosyTimer(); //  Stop old timer
  console.log(` Notify DynamicModal `, id , message)

  MosyCard(
    "",
    <div className="row col-md-12 justify-content-center">
      <div className="fancy-gradient-spinner" title="Notice">
        <i className={`fa fa-${icon} medium_icon ${iconColor}`}></i>
      </div>
      <div className="text-center col-md-12 p-2">
        <p className="mt-3">{message}</p>
      </div>      
    </div>, // no buttons
    true,
    id
  );

  if(addTimer){
    mosyNotifyTimer = setTimeout(() => {
      closeMosyCard()
      mosyNotifyTimer = null;
    }, duration);
}
}


export function closeMosyModal()
{

  closeMosyCard()
  clearMosyTimer()

}

export function MosyConfirm({
    icon = "warning",
    iconColor = "text-danger",
    message = "Are you sure?",
    yesLabel = "Yes",
    noLabel = "Cancel",
    onYes = () => {},
    onNo = () => {}
  }) {
    MosyCard(
      <div className="text-center">
        <i className={`fa fa-${icon} ${iconColor} display-4`}></i>
        <p className="mt-3">{message}</p>
      </div>,
  
      <div className="text-center mt-4">
        <button className="btn btn-danger mx-2" onClick={() => { onYes(); closeMosyCard(); }}>
          {yesLabel}
        </button>
        <button className="btn btn-secondary mx-2" onClick={() => { onNo(); closeMosyCard(); }}>
          {noLabel}
        </button>
      </div>
    );
  }


export function MosySnackWidget({
  content = 'Snacky Snack!',
  curr_position = 'bottom',       // 'top' or 'bottom'
  snack_pos = '30px',             // Distance from edge
  snackId = 'mosy_snack_1',
  color = '#fff',
  bg = '#333',
  duration = 3000,
  onClickFun = () => {},
  pushTo = null,                  // Optional: a ref or useEffect handler if needed
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);

    const timer = setTimeout(() => {
      setShow(false);
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const stylePosition = {
    position: 'fixed',
    [curr_position]: snack_pos,
    left: '50%',
    transform: 'translateX(-50%)',
    background: bg,
    color: color,
    padding: '16px',
    borderRadius: '4px',
    zIndex: 9999,
    minWidth: '250px',
    textAlign: 'center',
    visibility: show ? 'visible' : 'hidden',
    animation: show ? 'fadein 0.5s, fadeout 0.5s ease-in-out 2.5s' : '',
  };

  return (
    <>
      <div id={snackId} style={stylePosition} onClick={() => { onClickFun(); }}>
        {content}
      </div>

      <style jsx>{`
        @keyframes fadein {
          from { ${curr_position}: 0; opacity: 0; }
          to { ${curr_position}: ${snack_pos}; opacity: 1; }
        }

        @keyframes fadeout {
          from { ${curr_position}: ${snack_pos}; opacity: 1; }
          to { ${curr_position}: 0; opacity: 0; }
        }
      `}</style>
    </>
  );
}
