
export function processImport(csvData, colsArray) {
    if (!Array.isArray(csvData) || csvData.length === 0) return [];
    if (!Array.isArray(colsArray) || colsArray.length === 0) return [];
  
    return csvData.map((row) => {
      const record = {};
      colsArray.forEach((col) => {
        record[col] = row[col] ?? "";
      });
  
      return record;
  
    });
  }
  