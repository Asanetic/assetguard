"use client";

import { useState, useEffect, useRef , useCallback} from "react";

export default function MosySmartGrid({ data = [[]] }) {
  const [gridData, setGridData] = useState(data);
  const [selected, setSelected] = useState({ row: 0, col: 0 });
  const inputRef = useRef();

  useEffect(() => {
    setGridData(data);
  }, [data]);

  useEffect(() => {
    // focus input whenever selection changes, skip header row
    if (selected.row !== 0 && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [selected]);

  const handleKeyDown = (e) => {
    const { row, col } = selected;
    if (e.key === "ArrowDown") setSelected({ row: Math.min(row + 1, gridData.length - 1), col });
    if (e.key === "ArrowUp") setSelected({ row: Math.max(row - 1, 1), col }); // skip header row
    if (e.key === "ArrowRight") setSelected({ row, col: Math.min(col + 1, gridData[0].length - 1) });
    if (e.key === "ArrowLeft") setSelected({ row, col: Math.max(col - 1, 0) });
  };

  const handleChange = (rowIndex, colIndex, value) => {
    const updated = [...gridData];
    updated[rowIndex][colIndex] = value;
    setGridData(updated);
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ overflow: "auto", outline: "none", maxWidth: "100%" }}
    >
      <table className="table table-sm table-bordered">
        <tbody>
          {gridData.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, colIndex) => {
                const isSelected = selected.row === rowIndex && selected.col === colIndex;
                return (
                  <td
                    key={colIndex}
                    className={isSelected ? "table-primary" : ""}
                    onClick={() => setSelected({ row: rowIndex, col: colIndex })}
                    style={{ padding: "4px" }}
                  >
                    {rowIndex === 0 ? (
                      cell
                    ) : (
                      <input
                        ref={isSelected ? inputRef : null}
                        value={cell}
                        onChange={(e) => handleChange(rowIndex, colIndex, e.target.value)}
                        style={{
                          width: "100%",
                          border: "none",
                          outline: "none",
                          backgroundColor: "transparent",
                          padding: "2px",
                        }}
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


export function useDropdownNavigation(items = [], onSelect) {
  const [activeIndex, setActiveIndex] = useState(-1);

  const handleKeyDown = useCallback(
    (e) => {
      if (!items || items.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < items.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : items.length - 1
        );
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        if (onSelect) onSelect(items[activeIndex], activeIndex);
      } else if (e.key === "Escape") {
        setActiveIndex(-1);
      }
    },
    [items, activeIndex, onSelect]
  );

  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown,
  };
}

