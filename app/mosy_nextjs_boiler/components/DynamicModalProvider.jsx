"use client";
import React from "react";
import DynamicModal from "./DynamicModal";

const modalConfigList = [
  { id: "modal4", zIndex: 1030 },
  { id: "modal3", zIndex: 1040 },
  { id: "modal2", zIndex: 1045 },
  { id: "modal1", zIndex: 1050 },
  { id: "smartmodaldefaultId", zIndex: 1060 }, // top-most always
  { id: "topmost", zIndex: 1070 }, // top-most always
];

export default function DynamicModalProvider() {
  return (
    <>
      {modalConfigList.map(({ id, zIndex }) => (
        <DynamicModal key={id} id={id} zIndex={zIndex} />
      ))}
    </>
  );
}
