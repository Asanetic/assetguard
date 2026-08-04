import { base64Encode, mosyUploadFile } from "../../apiUtils/dataControl/dataUtils";
import { hiveRoutes } from "../../../appConfigs/hiveRoutes";

export async function POST(req) {
  try {
    const formData = await req.formData();

    const fileFields = Array.from(formData.entries()).filter(
      ([key, value]) =>
        key.startsWith('file') &&
        typeof value === 'object' &&
        typeof value.arrayBuffer === 'function' // 💡 Safer file check for Node.js
    );

    if (fileFields.length === 0) {
      return Response.json({
        result: [],
        errorMessage: 'No file received',
        resultCode: 'error',
      }, { status: 400 });
    }

    const [_, fileInput] = fileFields[0];

    const storedPath = await mosyUploadFile(fileInput, 'uploads/suneditor');

    const baseUrl = req.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const fileUrl = `${baseUrl}${hiveRoutes.hiveBaseRoute}/api/mediaroom?media=${base64Encode(storedPath)}`;

    const MAX_HEIGHT = 500;
    const defaultHeight = 400;

    const suggestedHeight = fileInput.size > 500 * 1024 ? `${defaultHeight}` : undefined;

    return Response.json({
      result: [
        {
          url: fileUrl,
          name: fileInput.name,
          size: fileInput.size,
          width: "auto",
          ...(suggestedHeight && { height: suggestedHeight })
        }
      ],
      errorMessage: null,
      resultCode: 'success'
    });

  } catch (err) {
    console.error('[Upload Error]', err);
    return Response.json({
      result: [],
      errorMessage: err.message || 'Upload failed',
      resultCode: 'error'
    }, { status: 500 });
  }
}
