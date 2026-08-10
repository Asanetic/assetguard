// app/layout.jsx
// Root layout — REQUIRED. Must render <html> and <body>.
// Tabler icon webfont is bundled locally (see package.json) so glyphs work
// offline and don't depend on a CDN.

import "@tabler/icons-webfont/dist/tabler-icons.min.css";

export const metadata = {
  title: "AssetGuard",
  description: "AssetGuard admin",
  // Show the AssetGuard logo as the browser-tab (site) icon across browsers.
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
