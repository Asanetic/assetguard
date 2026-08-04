'use client';

import { useEffect, useState } from 'react';

export default function InvoicePrintPage() {
  const [invoiceId, setInvoiceId] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get("q");
    if (q) setInvoiceId(q);
  }, []);

  useEffect(() => {
    if (!invoiceId) return;

    const fetchAndDownload = async () => {
      try {
        const url = `/api/nextinvoice/docs/generateinvoice?invoice=${invoiceId}`;
        const response = await fetch(url);

        if (!response.ok) throw new Error('Failed to generate');

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        window.location.href = objectUrl;

        setTimeout(() => {
          URL.revokeObjectURL(objectUrl);
          if (window.opener) window.close();
        }, 3000);

      } catch (err) {
        alert("Something went wrong generating the invoice.");
        console.error(err);
      }
    };

    fetchAndDownload();
  }, [invoiceId]);

  return (
    <div style={{ padding: "30px" }}>
      <h1>Generating your invoice</h1>
      <p>Please wait while we prepare your copy. This window will close automatically.</p>
    </div>
  );
}
