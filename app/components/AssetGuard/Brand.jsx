export const NAVY = "#14315D";
export const BLUE = "#2E6CF5";

/**
 * Shared AssetGuard brand mark. Single source of truth so the nav rail,
 * the drawer header, the mobile top bar, and every auth screen render
 * the exact same logo.
 *
 * `variant="rail"`    — compact, icon-only, sized for the persistent 80px nav rail.
 * `variant="drawer"`  — icon + wordmark, sized for header bars (drawer, auth cards).
 * `variant="compact"` — icon + wordmark, shrunk to fit a mobile top bar (~40px tall).
 */
export function Brand({ variant = "drawer" }) {
  const isRail = variant === "rail";
  const isCompact = variant === "compact";

  const boxSize = isCompact ? 34 : 50;
  const iconSize = isCompact ? 22 : 50;
  const textSize = isCompact ? 18 : 27;
  const boxPad = isCompact ? 6 : 8;
  const boxRadius = isCompact ? 8 : 10;

  return (
    <div className={`d-flex align-items-center ${isRail ? "flex-column" : "gap-2"}`}>
      <span
        className="d-flex flex-shrink-0 align-items-center justify-content-center"
        style={{
          borderRadius: boxRadius,
          width: boxSize,
          height: boxSize,
          padding: boxPad,
          backgroundColor: BLUE,
        }}
      >
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" aria-hidden="true">
          <g transform="translate(-2.21,-1.39) scale(1.174)">
            <path
              d="M11.9 2 C11.9 2 9.1 5.9 3.3 6.2 L3.3 12.8 C3.3 16.2 6.2 19 10.4 20.8 M11.9 2 C11.9 2 14.9 5.9 20.9 6.2 L20.9 12.8"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.45"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path
              d="M14.4 18 L16.8 20.6 L20.8 15.8"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.45"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path
              d="M12.4 7.2 C10.42 7.2 8.8 8.82 8.8 10.8 C8.8 13.4 11.6 16.5 12.03 16.99 C12.21 17.18 12.59 17.18 12.77 16.99 C13.2 16.5 16 13.4 16 10.8 C16 8.82 14.38 7.2 12.4 7.2 Z M11 10.8 A1.4 1.4 0 1 0 13.8 10.8 A1.4 1.4 0 1 0 11 10.8 Z"
              fill="#FFFFFF"
              fillRule="evenodd"
            />
          </g>
        </svg>
      </span>
      {!isRail && (
        <span
          className={isCompact ? "mx-1" : "mx-3"}
          style={{ fontWeight: "bold", fontSize: textSize, letterSpacing: "-0.3px" }}
        >
          <span className="text-white mx-2">Asset</span>
          <span style={{ color: "#7EB2FF" }}>Guard</span>
        </span>
      )}
    </div>
  );
}