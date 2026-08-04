'use client';
import { useEffect, useState } from 'react';
import mosyThemeConfigs from '../appConfigs/mosyTheme';
import { createRoot } from "react-dom/client";

export default function MosySnackWidget({
  content = "This is a snack!",
  duration = 10000,
  type = "info",
  onDone = () => {},
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDone();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDone]);

  if (!visible) return null;

  const handleClick = () => {
    setVisible(false);
    onDone();
  };

  const getBgColor = () => {
    switch (type) {
      case "success": return "#198754";
      case "error": return "#dc3545";
      case "warning": return "#ffc107";
      case "info":
      default: return mosyThemeConfigs.btnBg;
    }
  };

  return (
    <div
      onClick={handleClick}
      className="mosy-snack-slide p-3"
      style={{
        position: "fixed",
        top: "0%",
        left: "50%",
        transform: "translateX(-50%)",
        background: getBgColor(),
        color: "#fff",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
        zIndex: 9999,
        cursor: "pointer",
        animation: "slideSnackInOut 1s ease-in-out, stayPut linear forwards",
        animationDelay: "0s, 1s", // first animation runs, then pause/stay
        animationDuration: `1s, ${duration / 1000 - 2}s, 1s`, // entrance, stay, exit
      }}
    >
      {content}

      <style jsx>{`
        @keyframes slideSnackInOut {
          0% {
            opacity: 0;
            transform: translate(-50%, -100%);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, 40vh);
          }
        }

        @keyframes stayPut {
          0% {
            transform: translate(-50%, 40vh);
            opacity: 1;
          }
          95% {
            transform: translate(-50%, 40vh);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -100%);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}


export function mosySnackWidgetManager({
  content = "This is a snack!",
  duration = 3000,
  type = "info",
}) {
  // Create container div
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);

  const handleDone = () => {
    root.unmount();
    container.remove();
  };

  root.render(
    <MosySnackWidget
      content={content}
      duration={duration}
      type={type}
      onDone={handleDone}
    />
  );
}

let activeSnackRoot = null;
let activeSnackContainer = null;

/* =======================
   Close any open snack
======================= */
export function closeMosySnack() {
  if (activeSnackRoot && activeSnackContainer) {
    activeSnackRoot.unmount();
    activeSnackContainer.remove();
    activeSnackRoot = null;
    activeSnackContainer = null;
  }
}

/* =======================
   Open snack (singleton)
======================= */
export function mosySnack({
  content = "This is a snack!",
  duration = 3000,
  type = "info",
  autoClose = true
}) {
  // 🔥 close any running snack first
  closeMosySnack();

  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);

  activeSnackRoot = root;
  activeSnackContainer = container;

  const handleDone = () => {
    closeMosySnack();
  };

  root.render(
    <MosySnackWidget
      content={content}
      duration={duration}
      type={type}
      autoClose={autoClose}
      onDone={handleDone}
    />
  );
}
