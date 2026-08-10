// app/layout.jsx
// Root layout — REQUIRED. Must render <html> and <body>.
// Tabler icon webfont is bundled locally (see package.json) so glyphs work
// offline and don't depend on a CDN.

import "@tabler/icons-webfont/dist/tabler-icons.min.css";

export const metadata = {
  title: "AssetGuard",
  description: "AssetGuard admin",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
