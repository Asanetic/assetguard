"use client";
import React, { useState } from "react";
import { MosySpace, MosyTitleTag } from "../UiControl/componentControl";

import {generateCsvTemplate, mosyCsvFileImport} from './uploadUtils'

import { getApiRoutes } from "../AppRoutes/apiRoutesHandler"; 
import { hiveRoutes } from "../../appConfigs/hiveRoutes";

const apiRoutes = getApiRoutes()

export default function ImportCSVComponent({title ="Import CSV data", endpoint, templateName="octane_sales_template.csv" , colsArray}) {
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  console.log(`ImportCSVComponent ${endpoint}`)

  // store file before importing
  function handleFileChange(e) {
    const selectedFile = e.target.files[0];
   // if (!selectedFile) return;
    setFile(selectedFile);
    setFileName(selectedFile.name);
  }

  async function handleImport() {
    if (!file) return;

    const text = await file.text();
    const rows = text.trim().split(/\r?\n/);

    const headerRow = rows[0]
      .split(",")
      .map((h) => h.trim().replace(/^"|"$/g, ""));
    setCsvHeaders(headerRow);

    const data = rows.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      let obj = {};
      headerRow.forEach((key, i) => (obj[key] = values[i] || ""));
      return obj;
    });

    setCsvData(data);
    setIsConfirmed(false);
    setCurrentPage(1);
  }

  function handleClear() {
    setCsvData([]);
    //setFileName("");
    //setFile(null);
    setIsConfirmed(false);
    setCurrentPage(1);
  }

  const displayHeaders = csvHeaders.length > 0 ? csvHeaders : ["No data headers available "];
  const totalPages = Math.ceil(csvData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentRows = csvData.slice(startIndex, startIndex + rowsPerPage);

  function getPaginationButtons() {
    const pages = [];
    const delta = 2;
    let left = Math.max(2, currentPage - delta);
    let right = Math.min(totalPages - 1, currentPage + delta);

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (left > 2) pages.push("...");
      for (let i = left; i <= right; i++) pages.push(i);
      if (right < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }

  async function uploadFile()
  {
    await mosyCsvFileImport({endpoint : endpoint, csvData : csvData, colsArray : colsArray})
    setIsConfirmed(false);
  }

  function handleDownloadTemplate() {
    generateCsvTemplate(colsArray, templateName);
  }

  return (
    <div className="col-md-12 m-0 p-0">
      <div className="mb-3 row col-md-12 justif-content-center m-0 p-0 ">
        <MosyTitleTag title={title}/>
        <div className="col-md-3 ">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="form-control m-2"
        />
        </div>
        <div className="col-md-9">
        <button className="btn border border-info m-2 " onClick={handleImport}>
          <i className="fa fa-download"></i> Load file
        </button>
            <button
              onClick={() => {setIsConfirmed(true);uploadFile()}}
              className="btn btn-primary m-2"
              disabled={isConfirmed}
            >
              <i className="fa fa-upload mr-2"></i>
              {isConfirmed ? "Uploaded" : "Confirm & Upload"}
            </button>
            <button onClick={handleClear} className="btn border border-danger m-2">
            <i className="fa fa-trash text-danger "></i> Clear All
            </button>
            <a  onClick={handleDownloadTemplate} className="cpointer  text-info ml-2 ">Download template</a>
        </div>
      </div>

      {fileName && (
        <div className="alert alert-info py-2">
          <strong> File: </strong> {fileName}
        </div>
      )}

      {csvData.length > 0 && (
        <>
          <div className="mb-2 d-flex justify-content-between align-items-center">
            <div>
              <label className="mr-2"> Rows per page: </label>
              <select
                className="form-select form-select-sm d-inline-block w-auto"
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                {[2, 5, 10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <small className="text-muted">
              Page {currentPage} of {totalPages} — Showing {currentRows.length} of{" "}
              {csvData.length} rows
            </small>
          </div>

          <div className="table-responsive">
            <table className="table table-hover text-left">
              <thead className="text-uppercase">
                <tr>
                  <th>#</th>
                  {displayHeaders.map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentRows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <td>{startIndex + rowIndex + 1}</td>
                    {displayHeaders.map((h, i) => (
                      <td key={i}>{row[h] || ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <MosySpace spaceClass="p-2" />
          <ul className="pagination pagination-sm justify-content-center">
            <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
              <button
                className="page-link"
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                &laquo; Prev
              </button>
            </li>

            {getPaginationButtons().map((p, i) => (
              <li
                key={i}
                className={`page-item ${
                  p === currentPage ? "active" : p === "..." ? "disabled" : ""
                }`}
              >
                {p === "..." ? (
                  <span className="page-link">...</span>
                ) : (
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                )}
              </li>
            ))}

            <li
              className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}
            >
              <button
                className="page-link"
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next &raquo;
              </button>
            </li>
          </ul>
        </>
      )}
    </div>
  );
}
