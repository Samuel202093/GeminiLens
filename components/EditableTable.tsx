"use client";
import React from "react";

type EditableTableProps = {
  headers: string[];
  rows: Array<Record<string, string>>;
  onChange: (next: Array<Record<string, string>>) => void;
};

export default function EditableTable({ headers, rows, onChange }: EditableTableProps) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              {headers.map((h) => (
                <td key={h}>
                  <input
                    type="text"
                    value={row[h] ?? ""}
                    onChange={(e) => {
                      const next = rows.map((r, rIdx) =>
                        rIdx === idx ? { ...r, [h]: e.target.value } : r
                      );
                      onChange(next);
                    }}
                    style={{ width: "100%" }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}