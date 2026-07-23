import * as XLSX from "xlsx";

export function exportTableToExcel(tableId, filename = "export.xlsx") {
  const table = document.getElementById(tableId);
  if (!table) {
    console.error("Table not found");
    return;
  }

  // Clone table to avoid touching the DOM
  const tableClone = table.cloneNode(true);

  // Remove first column (th and td)
  Array.from(tableClone.rows).forEach(row => {
    if (row.cells.length > 0) {
      row.deleteCell(0);
    }
  });

  // Remove .no-export elements
  const noExportElements = tableClone.querySelectorAll('.no-export');
  noExportElements.forEach(el => el.remove());

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.table_to_sheet(tableClone);

  // Apply bold style to the first row (headers)
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cell_address = XLSX.utils.encode_cell({ r: 0, c: C });
    const cell = worksheet[cell_address];
    if (cell && cell.s === undefined) {
      cell.s = {};
    }
    if (cell) {
      cell.s = {
        font: { bold: true }
      };
    }
  }

  // Set custom column widths (adjust as needed)
  worksheet['!cols'] = Array.from({ length: range.e.c + 1 }).map(() => ({
    wch: 20 // 20 characters width per column
  }));

  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet 1");
  XLSX.writeFile(workbook, filename);
}
