let modals = {}; // Hold all modal registrations by ID

export function closeMosyCard(id = "smartmodaldefaultId") {
  const modal = modals[id];
  if (modal && modal.close) {
    modal.close();
  }
}

export function registerModal(showFn, closeFn, id = "smartmodaldefaultId") {
  modals[id] = {
    show: showFn,
    close: closeFn,
  };
  //console.log(`✅ Modal [${id}] registered`);
}

export function MosyCard(title, body, dismissOnOutsideClick = true, id = "smartmodaldefaultId", modalClass = "") {
  const modal = modals[id];
  if (modal && modal.show) {
    //console.log(`🔔 Opening modal [${id}]`);
    modal.show({ title, body, dismissOnOutsideClick, modalClass });
  } else {
    console.warn(`⚠️ Modal [${id}] not registered yet`);
  }
}

