import fs from 'fs/promises';
import path from 'path';

export async function POST(req) {
  try {
    const { src } = await req.json();

    // 👀 Normalize to array
    const srcArray = Array.isArray(src) ? src : [src];

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const results = [];

    for (const s of srcArray) {
      if (!s || typeof s !== 'string') {
        results.push({ src: s, status: 'skipped', reason: 'Invalid source type' });
        continue;
      }

      try {
        const url = new URL(s, appUrl);

        if (!url.pathname.startsWith('/api/mediaroom')) {
          results.push({ src: s, status: 'skipped', reason: 'Invalid path' });
          continue;
        }

        const base64Path = url.searchParams.get('media');

        if (!base64Path) {
          results.push({ src: s, status: 'skipped', reason: 'Missing media param' });
          continue;
        }

        const decodedPath = Buffer.from(base64Path, 'base64').toString('utf-8');

        if (!decodedPath.startsWith('uploads/suneditor')) {
          results.push({ src: s, status: 'skipped', reason: 'Invalid media location' });
          continue;
        }

        const fullPath = path.join(process.cwd(), 'storage', decodedPath);

        // 👻 Try to unlink — catch unlink-specific error
        await fs.unlink(fullPath);
        results.push({ src: s, status: 'deleted' });

      } catch (unlinkErr) {
        console.warn(`[Image Delete Failed for ${s}]`, unlinkErr.message);

        // Treat unlink issues as soft success
        results.push({ src: s, status: 'deleted', note: 'Unlink failed' });
      }
    }

    return Response.json({
      status: 'success',
      message: 'Delete request processed',
      results
    });

  } catch (err) {
    console.error('[Delete Image Fatal Error]', err);
    return Response.json({
      status: 'fail',
      message: 'System-level error during deletion',
      error: err.message
    }, { status: 500 });
  }
}
