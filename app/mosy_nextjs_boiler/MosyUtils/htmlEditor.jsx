'use client';

import { useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'suneditor/dist/css/suneditor.min.css';
import { hiveRoutes } from '../appConfigs/hiveRoutes';

const SunEditor = dynamic(() => import('suneditor-react'), {
  ssr: false,
});

export default function MosyHtmlEditor({ value = '', field = "defname", onChange: handleChange }) {
  const editorRef = useRef(null);
  const previousContentRef = useRef(value); // 🧠 Real-time, always-fresh snapshot

  // Sync editor and previous content on initial load or prop change
  useEffect(() => {
    if (editorRef.current && value) {
      //editorRef.current.setContents(value);
      editorRef.current.setContents(stripEditorPageWrapper(value));
      previousContentRef.current = value;
    }
  }, [value]);

  const handleEditorChange = async (newContent) => {

    const cleanContent = stripEditorPageWrapper(newContent);
    const wrappedContent = `<div class="smart_editor_editor_page">${cleanContent}</div>`;
    handleChange(wrappedContent);    

    const removedImages = getRemovedImageSources(previousContentRef.current, newContent);
    if (removedImages.length > 0) {
      console.log("🧼 Deleting removed images:", removedImages);
      await deleteImages(removedImages);
    }

    previousContentRef.current = newContent; // 🔁 Update content snapshot
  };

  return (
    <SunEditor
      ref={editorRef}
      height="400px"
      name={field}
      id={field}
      defaultValue={stripEditorPageWrapper(value)}
      onChange={handleEditorChange}
      setOptions={{
        buttonList: [
          ['undo', 'redo'],
          ['formatBlock'],
          ['bold', 'underline', 'italic', 'strike'],
          ['font', 'fontSize'],
          ['fontColor', 'hiliteColor'],
          ['align', 'horizontalRule', 'list'],
          ['table'],
          ['link', 'image', 'video'],
          ['fullScreen', 'showBlocks', 'codeView'],
        ],
        font: ['Arial', 'Tahoma', 'Comic Sans MS', 'Courier New', 'Georgia'],
        defaultStyle: 'font-family: Arial; font-size: 16px;',
        imageUploadUrl: `${hiveRoutes.hiveBaseRoute}/api/editor/uploadmedia`,
      }}
    />
  );
}

/* ------------------------------------------
   🧼 Local Helpers - tightly scoped to this file
--------------------------------------------- */

// Extracts all <img src="..."> from HTML string
function extractImageSources(html = '') {
  const container = document.createElement('div');
  container.innerHTML = html;

  const images = container.querySelectorAll('img');
  return Array.from(images)
    .map(img => img.getAttribute('src'))
    .filter(Boolean);
}

// Compares before vs after to find removed images
function getRemovedImageSources(oldHtml, newHtml) {
  const oldImgs = extractImageSources(oldHtml);
  const newImgs = extractImageSources(newHtml);

  const removedImages = oldImgs.filter(src => !newImgs.includes(src));

  console.log('📤 getRemovedImageSources', { removedImages, oldImgs, newImgs });

  return removedImages;
}

// Sends POST requests to delete images
async function deleteImages(imageUrls = []) {
  for (const src of imageUrls) {
    try {
      await fetch('/api/editor/deletemedia', {
        method: 'POST',
        body: JSON.stringify({ src }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      console.error('[❌ Image Deletion Failed]', err);
    }
  }
}


function stripEditorPageWrapper(content = '') {
  return content.replace(/<div class="smart_editor_editor_page">([\s\S]*?)<\/div>/gi, '$1');
}


