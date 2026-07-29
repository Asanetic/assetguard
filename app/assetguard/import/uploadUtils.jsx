import { MosyNotify } from "../../MosyUtils/ActionModals";
import { mosyPostData } from "../../MosyUtils/hiveUtils";

export async function mosyCsvFileImport({endpoint, csvData,colsArray}) {
    if (!csvData.length) return;
  
    //console.log(`mosyCsvFileImport ${endpoint}`)

    MosyNotify({message : "Uploading...", icon : "upload", addTimer : false})

    const result = await mosyPostData({url:endpoint, data: {csvData : csvData, colsArray : colsArray}})
  
    if (result.status=="success") {

        MosyNotify({message :"Data imported successfully", icon : "check-circle", addTimer : false})

    } else {

        MosyNotify({message : "Upload failed: " + result.message , icon : "times-circle"})

    }
  }


  /**
 * Generate a downloadable CSV template from a column array
 * @param {Array<string>} colsArray - List of column names
 * @param {string} fileName - Name for the downloaded file
 */
export function generateCsvTemplate(colsArray = [], fileName = "template.csv") {
    if (!Array.isArray(colsArray) || colsArray.length === 0) {
      console.error("No columns provided for CSV template");
      return;
    }
  
    // Step 1: Create CSV header row
    const csvHeader = colsArray.join(",") + "\n";
  
    // Step 2: Create a Blob
    const blob = new Blob([csvHeader], { type: "text/csv;charset=utf-8;" });
  
    // Step 3: Create a download link
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = fileName;
  
    // Step 4: Trigger download
    document.body.appendChild(link);
    link.click();
  
    // Step 5: Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  
  