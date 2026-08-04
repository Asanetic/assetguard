// File: BootstrapTableSkeleton.js
'use client';

import React from 'react';

export default function BootstrapTableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="table-responsive skeleton-loader">
      <table className="table table-bordered">
        <thead>
          <tr>
            {[...Array(cols)].map((_, i) => (
              <th key={i}>
                <div className="skeleton-box" style={{ height: '20px', width: '80%' }}></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(rows)].map((_, i) => (
            <tr key={i}>
              {[...Array(cols)].map((_, j) => (
                <td key={j}>
                  <div className="skeleton-box" style={{ height: '14px', width: '100%' }}></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
