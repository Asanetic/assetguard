// utils/htmlToPdf.js
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Renders lightweight HTML structure into jsPDF
 */

export function addHtmlBlock(doc, x, y, html, options = {}) {
  const defaultFontSize = options.fontSize || 10;
  const lineSpacing = options.lineSpacing || 3;
  const maxWidth = options.maxWidth || doc.internal.pageSize.getWidth() - x - 12;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  const rightX = pageWidth - margin;

  const tokens = html
    .replace(/\r\n|\r|\n/g, '\n\n')
    .replace(/<hr[^>]*>/gi, '\n---HR---\n')
    .replace(/<br\s*\/?><br\s*\/?>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(h\d|p|div|li)>/gi, '\n\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/?ul>/gi, '')
    .split('\n');

  let offsetY = y;

  for (let rawLine of tokens) {
    const line = rawLine.trim();

    if (!line) {
      offsetY += lineSpacing;
      continue;
    }

    // --- Horizontal Rule ---
    if (line === '---HR---') {
      if (offsetY + lineSpacing > pageHeight - margin) {
        doc.addPage();
        offsetY = margin;
      }
      doc.setDrawColor(180);
      doc.setLineWidth(0.3);
      doc.line(margin, offsetY, rightX, offsetY);
      continue;
    }

    // --- Text Style Detection ---
    let font = 'normal';
    let size = defaultFontSize;

    if (line.match(/^<h1>/i)) {
      font = 'bold'; size = 16;
    } else if (line.match(/^<h2>/i)) {
      font = 'bold'; size = 14;
    } else if (line.match(/^<h3>/i)) {
      font = 'bold'; size = 12;
    } else if (line.match(/<strong>|<b>/i)) {
      font = 'bold';
    }

    const cleanText = line
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&');

    doc.setFont('helvetica', font);
    doc.setFontSize(size);

    const wrapped = doc.splitTextToSize(cleanText, maxWidth);
    const blockHeight = wrapped.length * lineSpacing;

    // 🔁 Auto page break
    if (offsetY + blockHeight > pageHeight - margin) {
      doc.addPage();
      offsetY = margin;
    }

    doc.text(wrapped, x, offsetY);
    offsetY += blockHeight;
  }

  return offsetY;
}

export async function addImageBlock(
    doc,
    { url, x = 14, y = 20, maxWidth = 30, opacity = 1, type = 'PNG' }
  ) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
  
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
  
      let finalBase64 = base64;
  
      if (opacity < 1) {
        const img = await new Promise((resolve) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.src = base64;
        });
  
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
  
        const ctx = canvas.getContext('2d');
        ctx.globalAlpha = opacity;
        ctx.drawImage(img, 0, 0);
  
        finalBase64 = canvas.toDataURL('image/png'); // retain transparency
      }
  
      const tempImg = new Image();
      tempImg.src = finalBase64;
      await new Promise((resolve) => (tempImg.onload = resolve));
  
      const aspectRatio = tempImg.width / tempImg.height;
      const height = maxWidth / aspectRatio;
  
      doc.addImage(finalBase64, type, x, y, maxWidth, height);
  
      return y + height + 2; // return next Y position for chaining
    } catch (err) {
      console.warn('⚠️ Failed to load image:', url, err);
      return y + 5; // move down a little anyway to prevent overlap
    }
  }
  


  export function addTableBlock(doc, tableOptions) {
    const {
      head = [],
      body = [],
      foot = [],
      styles = {}
    } = tableOptions;
  
    autoTable(doc, {
      head,
      body,
      foot,
      theme: 'grid',
      startY: styles.startY || doc.lastAutoTable?.finalY + 10 || 40,
      styles: {
        fontSize: 10,
        cellPadding: 2,
        ...styles.styles
      },
      headStyles: {
        fillColor: [35, 103, 182],
        textColor: 255,
        halign: 'center',
        ...styles.headStyles
      },
      bodyStyles: {
        valign: 'top',
        ...styles.bodyStyles
      },
      footStyles: {
        fillColor: [35, 103, 182],
        fontStyle: 'bold',
        halign: 'right',
        ...styles.footStyles
      }
    });
  }
  


/**
 * Simple PDF generator from HTML string
 */

export async function mosyCreatePdf({
  htmlContent,
  fileName = 'document.pdf',
  defaultX = 14,
  defaultY = 40,
  preview = false 
}) {
  const doc = new jsPDF();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  let currentY = defaultY;
  const blocks = Array.isArray(htmlContent) ? htmlContent : [htmlContent];

  for (const block of blocks) {
    if (block.pageBreakBefore) {
        doc.addPage();
        currentY = 20;
      }

    if (typeof block === 'string' || block.html) {
      const html = typeof block === 'string' ? block : block.html;
      const x = block.x ?? defaultX;
      const y = block.y ?? currentY;
      const newY = await addHtmlBlock(doc, x, y, html);
      currentY = Math.max(currentY, newY + 10);
    } else if (block.image) {
      await addImageBlock(doc, {
        url: block.image,
        x: block.x ?? defaultX,
        y: block.y ?? currentY,
        maxWidth: block.maxWidth || 40,
        opacity: block.opacity || 1,
        type: block.type || 'PNG',
      });
      currentY += 30;
    } else if (block.table) {
      const tableY = block.table.styles?.startY || currentY;
      block.table.styles = block.table.styles || {};
      block.table.styles.startY = tableY;

      addTableBlock(doc, block.table);
      currentY = doc.lastAutoTable.finalY + 5;
    }
  }

  // 🎯 Show preview or download
  if (preview) {
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank'); // or open in <iframe> if you prefer
  } else {
    doc.save(fileName);
  }

}
  
  
