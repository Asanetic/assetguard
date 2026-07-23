import fs from 'fs';
import path from 'path';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const encodedMedia = searchParams.get('media');

  if (!encodedMedia) {
    return new Response('Missing media parameter', { status: 400 });
  }

  let decodedPath;

  try {
    decodedPath = Buffer.from(encodedMedia, 'base64').toString('utf-8');
  } catch (err) {
    console.error('[Base64 Decode Error]', err);
    return new Response('Invalid base64 media path', { status: 400 });
  }

  // Prevent directory traversal
  if (decodedPath.includes('..')) {
    return new Response('Invalid file path', { status: 403 });
  }

  const filePath = path.join(process.cwd(), 'storage', decodedPath);

  if (!fs.existsSync(filePath)) {
    return new Response('File not found', { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(decodedPath).toLowerCase();

  const contentType = {
    // Images
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.gif': 'image/gif',
    '.jfif': 'image/jfif',
  
    // Documents
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.csv': 'text/csv',
    '.txt': 'text/plain',
  
    // Archives
    '.zip': 'application/zip',
    '.rar': 'application/vnd.rar',
  
  } [ext] || 'application/octet-stream';


  return new Response(fileBuffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${path.basename(decodedPath)}"`,
  
      'X-File-Name': encodeURIComponent(path.basename(decodedPath)),
      'X-File-Ext': ext,
      'X-File-Type': contentType,
  
      'Access-Control-Expose-Headers': 'X-File-Name, X-File-Ext, X-File-Type',
    },
  });


}
