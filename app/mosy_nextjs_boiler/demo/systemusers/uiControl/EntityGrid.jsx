'use client';

// Same "filters + actions + table" logic as before — now styled with your
// real production classes (hive_list_*, custom-search-*, tbl_print_*, table
// table-hover) instead of inline styles. Drop it on a page, in a modal,
// anywhere — it manages its own data via useEntityController.

import { useState } from 'react';
import { useEntityController } from '../dataControl/useEntityController';
import { exportTableToExcel } from '../../../MosyUtils/exportToExcel';
import { mosyPrintToPdf } from "../../../MosyUtils/hiveUtils"//'../../MosyUtils/hiveUtils';
import {MosyPaginationUi} from '../../UiControl/componentControl'
export default function EntityGrid({ schema, fixedQuery = {}, title }) {
  const c = useEntityController(schema, { fixedQuery });
  const [searchInput, setSearchInput] = useState('');

  const printCardId = `${schema.entity}_print_card`;
  const tableId = `${schema.entity}_data_table`;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    c.setSearch(searchInput);
  };

  const handleRefresh = () => {
    setSearchInput('');
    c.setSearch('');
    c.load();
  };

  return (
    <div className="col-md-12 p-0 m-0 main_list_container" style={{ marginTop: 0, paddingBottom: 0 }}>
      <form onSubmit={handleSearchSubmit}>
        <div className="row justify-content-end col-md-12 text-right pt-3 pb-3 data_list_section ml-0 mr-0 mb-3 border-bottom pr-0 pl-0">
          <div className="col-md-6 p-0 text-left pt-3 hive_list_title">
            <h6 className="text-muted"><b>{title || schema.label || schema.entity}</b></h6>
          </div>

          <div className="col-md-6 p-0 text-right hive_list_search_tray">
            <input
              type="text"
              id={`txt_${schema.entity}`}
              className="custom-search-input form-control"
              placeholder={`Search in ${title || schema.label || schema.entity}`}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button className="custom-search-botton" type="submit">
              <i className="fa fa-search mr-1"></i> Go
            </button>
          </div>

          <div className="col-md-12 pt-5 p-0 hive_list_search_divider"></div>

          <div className="row justify-content-end m-0 p-0 col-md-12 hive_list_action_btn_tray">
            <div className="col-md-12 p-0 hive_list_nav_right_ribbon">

              {/* FILTER BUTTONS — loop schema.filters */}
              {schema.filters?.map((f) => (
                <div
                  key={f.key}
                  className={`cpointer medium_btn border border_set ml-3 ${
                    c.activeFilter === f.key ? 'btn-primary text-white' : 'btn-white'
                  }`}
                  onClick={() => c.applyFilter(f.key)}
                >
                  {f.label}
                </div>
              ))}

              {/* ACTION BUTTONS — loop schema.actions */}
              {schema.actions?.map((a) => (
                <div
                  key={a.key}
                  className="cpointer medium_btn border border_set btn-white ml-3"
                  onClick={() => c.runAction(a.key)}
                >
                  {a.label}
                </div>
              ))}

              <div
                className="cpointer medium_btn border border_set btn-white hive_list_nav_refresh ml-3"
                onClick={handleRefresh}
              >
                <i className="fa fa-refresh mr-1"></i> Refresh
              </div>
            </div>
          </div>
        </div>

        <div className="table-responsive data-tables bottom_tbl_handler">

          <div className="text-left m-0 p-0 col-md-12">
            <div
              className="ml-2 cpointer badge btn_neo p-2 rounded badge-primary mb-3 tbl_print_btn"
              onClick={() => mosyPrintToPdf({ elemId: printCardId, defaultTitle: title || schema.entity })}
            >
              <i className="fa fa-print"></i> Print List
            </div>
            <div
              className="cpointer p-2 ml-2 badge rounded border border_set badge-whte mb-3 tbl_print_to_excel_btn"
              onClick={() => exportTableToExcel(tableId, `${schema.entity}.xlsx`)}
            >
              <i className="fa fa-arrow-right"></i> Export to excel
            </div>
          </div>

          <div className="col-md-12 m-0 p-0" id={printCardId}>
            <table className="table table-hover text-left printTarget" id={tableId}>
              <thead className="text-uppercase">
                <tr>
                  {schema.fields.filter((f) => f.showInList !== false).map((f) => (
                    <th scope="col" key={f.key}><b>{f.label}</b></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {c.loading ? (
                  <tr>
                    <td colSpan={schema.fields.length} className="text-muted">
                      <h5 className="col-md-12 text-center p-3 mb-5 text-muted">
                        <i className="fa fa-spinner fa-spin"></i> Loading {title || schema.entity} ...
                      </h5>
                    </td>
                  </tr>
                ) : c.error ? (
                  <tr>
                    <td colSpan={schema.fields.length} className="text-danger text-center p-3">
                      {c.error}
                    </td>
                  </tr>
                ) : c.rows.length === 0 ? (
                  <tr>
                    <td colSpan={schema.fields.length} className="text-muted">
                      <div className="col-md-12 text-center mt-4">
                        <h6 className="col-md-12 text-center p-3 mb-5 text-muted">
                          <i className="fa fa-search"></i> Sorry, no {title || schema.entity} records found
                        </h6>
                      </div>
                    </td>
                  </tr>
                ) : (
                  c.rows.map((row) => (
                    <tr key={row.id}>
                      {schema.fields.filter((f) => f.showInList !== false).map((f) => (
                        <td scope="col" key={f.key}>
                          <span title={String(row[f.key] ?? '')}>{String(row[f.key] ?? '')}</span>
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination — simple Prev/Next, styled to match; swap for MosyPaginationUi if you prefer that exact widget */}
          <div className="d-flex justify-content-end align-items-center p-3">
            <MosyPaginationUi 
            totalPages={c.pageCount} 
            onPageSwitch={(page) => c.setPage(page)}
            />
            <div
              className="cpointer medium_btn border border_set btn-white mr-2"
              onClick={() => c.page > 1 && c.setPage(c.page - 1)}
            >
              <i className="fa fa-chevron-left"></i>
            </div>
            <span className="text-muted mx-2">Page {c.page} of {c.pageCount}</span>
            <div
              className="cpointer medium_btn border border_set btn-white ml-2"
              onClick={() => c.page < c.pageCount && c.setPage(c.page + 1)}
            >
              <i className="fa fa-chevron-right"></i>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}