"use client";
import { usePathname } from "next/navigation";
import React, { useState, useRef, useEffect } from "react";
import routeBank from "./builderDnaRoutes.json"

export function BuilderButton() {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalKey, setModalKey] = useState(Date.now()); // reload iframe each time
  const [isDev, setIsDev] = useState(true);

  function handleClick() {
    setModalKey(Date.now());
    setModalVisible(true);
  }

 /// const pathname = usePathname(); // e.g., "/blueribbon/clienttransactions/list"
  
  // Extract key like "clienttransactions/list"
  //const routeKey = pathname.replace("/octanev4/", "");
  const pathname = usePathname();

  const routeKey = pathname
    .split("/")
    .slice(2)
    .join("/");
  // Get URL from JSON bank
  const iframeURL = routeBank[routeKey];
  
  useEffect(() => {
    //setModalVisible(false);
    
  const isDev =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
   window.location.hostname === "127.0.0.1");

  setIsDev(isDev)

  }, [pathname]);

  if (!isDev) return null;

  return (
    <>
      <div        
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          padding: "0px 0px",
          border: "0px solid #ccc",
          borderRadius: "20px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
          background: "transparent",
          zIndex: 9999,
        }}
      >
        <div onClick={handleClick} className="btn cpointer btn-primary ml-3" style={{ border: "1px solid #ccc", fontSize: "12px", borderRadius: "20px", }}>Mutate module</div>
        
      </div>

      {modalVisible && (
        <SmartUserModal
          title="Edit module"
          initialWidth={800}
          initialHeight={500}
          onClose={() => setModalVisible(false)}
          key={modalKey}
        >
          <iframe
            src={iframeURL}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              borderRadius: "12px",
            }}
          ></iframe>
        </SmartUserModal>
      )}
    </>
  );
}


export function SmartUserModal({
  children,
  title = "Modal",
  initialWidth = 900,
  initialHeight = 600,
  onClose,
}) {
  const [maximized, setMaximized] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState({ x: null, y: null });
  const [dragging, setDragging] = useState(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const modalRef = useRef();

  const toggleMaximize = () => {
    setMaximized((prev) => !prev);
    setMinimized(false);
  };

  const toggleMinimize = () => {
    setMinimized((prev) => !prev);
    setMaximized(false);
  };

  const handleMouseDown = (e) => {
    if (maximized || minimized) return;

    const rect = modalRef.current.getBoundingClientRect();
    offsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    setDragging(true);
  };

  useEffect(() => {
    function handleMouseMove(e) {
      if (!dragging) return;

      setPosition({
        x: e.clientX - offsetRef.current.x,
        y: e.clientY - offsetRef.current.y,
      });
    }

    function handleMouseUp() {
      setDragging(false);
    }

    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging]);

  const isCentered = position.x === null && position.y === null;

  return (
    <>
      <div
        ref={modalRef}
        style={{
          position: "fixed",
          top: maximized
            ? 0
            : isCentered
            ? "50%"
            : position.y,
          left: maximized
            ? 0
            : isCentered
            ? "50%"
            : position.x,
          transform:
            maximized
              ? "none"
              : isCentered
              ? "translate(-50%, -50%)"
              : "none",
          width: maximized ? "100%" : initialWidth,
          height: maximized ? "100%" : initialHeight,
          background: "#fff",
          borderRadius: maximized ? 0 : "12px",
          boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
          zIndex: minimized ? -1 : 9999,
          display: minimized ? "none" : "flex",
          flexDirection: "column",
          overflow: "hidden",
          cursor: dragging ? "grabbing" : "default",
          transition: dragging ? "none" : "all 0.2s ease",
        }}
      >
        {/* Header */}
        <div
          onMouseDown={handleMouseDown}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 12px",
            background: "#0d6efd",
            color: "#fff",
            cursor: maximized ? "default" : "grab",
            userSelect: "none",
          }}
        >
          <span>{title}</span>

          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={toggleMinimize} style={iconBtnStyle}>🗕</button>
            <button onClick={toggleMaximize} style={iconBtnStyle}>
              {maximized ? "🗗" : "🗖"}
            </button>
            <button onClick={onClose} style={iconBtnStyle}>✕</button>
          </div>
        </div>

        <div style={{ flex: 1, padding: "12px", overflow: "auto" }}>
          {children}
        </div>
      </div>

      {minimized && (
        <div
          onClick={toggleMinimize}
          style={{
            position: "fixed",
            bottom: "90px",
            right: "40px",
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "#0d6efd",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 6px 18px rgba(0,0,0,0.3)",
            cursor: "pointer",
            zIndex: 9999,
            fontSize: "20px",
            userSelect: "none",
          }}
        >
          🗔
        </div>
      )}
    </>
  );
}


const iconBtnStyle = {
  border: "none",
  background: "transparent",
  color: "#fff",
  fontSize: "18px",
  cursor: "pointer",
};


