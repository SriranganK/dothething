import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { ScratchBlockProperties } from '@/types/scratch';

interface TableBlockProps {
  content: string;
  properties?: ScratchBlockProperties;
  onChangeProperties: (props: ScratchBlockProperties) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  autoFocus?: boolean;
}

export interface TableData {
  headers: string[];
  rows: string[][];
}

const DEFAULT_TABLE_DATA: TableData = {
  headers: ['Header 1', 'Header 2', 'Header 3'],
  rows: [
    ['Cell 1', 'Cell 2', 'Cell 3'],
    ['Cell 4', 'Cell 5', 'Cell 6'],
  ],
};

export const TableBlock: React.FC<TableBlockProps> = ({
  content,
  properties = {},
  onChangeProperties,
  onKeyDown,
}) => {
  const [data, setData] = useState<TableData>(() => {
    if (properties?.tableData) {
      return properties.tableData;
    }
    try {
      if (content && content.startsWith('{')) {
        return JSON.parse(content);
      }
    } catch (e) {
      // ignore JSON parse error
    }
    return DEFAULT_TABLE_DATA;
  });

  const updateTableData = (newData: TableData) => {
    setData(newData);
    onChangeProperties({
      ...properties,
      tableData: newData,
    });
  };

  const handleHeaderChange = (index: number, val: string) => {
    const newHeaders = [...data.headers];
    newHeaders[index] = val;
    updateTableData({ ...data, headers: newHeaders });
  };

  const handleCellChange = (rowIndex: number, colIndex: number, val: string) => {
    const newRows = data.rows.map((row, rIdx) => {
      if (rIdx === rowIndex) {
        const newRow = [...row];
        newRow[colIndex] = val;
        return newRow;
      }
      return row;
    });
    updateTableData({ ...data, rows: newRows });
  };

  const handleAddRow = () => {
    const newRow = new Array(data.headers.length).fill('');
    updateTableData({
      ...data,
      rows: [...data.rows, newRow],
    });
  };

  const handleAddColumn = () => {
    const colNum = data.headers.length + 1;
    const newHeaders = [...data.headers, `Header ${colNum}`];
    const newRows = data.rows.map((row) => [...row, '']);
    updateTableData({
      headers: newHeaders,
      rows: newRows,
    });
  };

  const handleDeleteRow = (rowIndex: number) => {
    if (data.rows.length <= 1) return;
    const newRows = data.rows.filter((_, rIdx) => rIdx !== rowIndex);
    updateTableData({ ...data, rows: newRows });
  };

  const handleDeleteColumn = (colIndex: number) => {
    if (data.headers.length <= 1) return;
    const newHeaders = data.headers.filter((_, cIdx) => cIdx !== colIndex);
    const newRows = data.rows.map((row) => row.filter((_, cIdx) => cIdx !== colIndex));
    updateTableData({ headers: newHeaders, rows: newRows });
  };

  return (
    <div className="w-full my-2 overflow-x-auto select-text group/table">
      <div className="inline-block min-w-full border border-border rounded-xl shadow-sm bg-card overflow-hidden">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              {data.headers.map((header, colIdx) => (
                <th key={colIdx} className="p-2 border-r border-border/60 relative group/col min-w-[120px]">
                  <div className="flex items-center justify-between gap-1">
                    <input
                      type="text"
                      value={header}
                      onChange={(e) => handleHeaderChange(colIdx, e.target.value)}
                      onKeyDown={onKeyDown}
                      className="w-full bg-transparent font-semibold text-foreground outline-none border-none p-1 rounded focus:bg-background/80"
                    />
                    {data.headers.length > 1 && (
                      <button
                        onClick={() => handleDeleteColumn(colIdx)}
                        className="opacity-0 group-hover/col:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-opacity cursor-pointer"
                        title="Delete Column"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="p-1 w-8 bg-muted/40 text-center select-none">
                <button
                  onClick={handleAddColumn}
                  className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors cursor-pointer"
                  title="Add Column"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b border-border/40 hover:bg-muted/20 transition-colors group/row">
                {row.map((cell, colIdx) => (
                  <td key={colIdx} className="p-2 border-r border-border/40 min-w-[120px]">
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                      onKeyDown={onKeyDown}
                      placeholder="..."
                      className="w-full bg-transparent text-foreground outline-none border-none p-1 rounded focus:bg-background/80"
                    />
                  </td>
                ))}
                <td className="p-1 w-8 text-center select-none">
                  {data.rows.length > 1 && (
                    <button
                      onClick={() => handleDeleteRow(rowIdx)}
                      className="opacity-0 group-hover/row:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity cursor-pointer"
                      title="Delete Row"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-2 bg-muted/30 border-t border-border text-xs">
          <button
            onClick={handleAddRow}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground font-medium px-2 py-1 hover:bg-muted rounded-md transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Add Row
          </button>
        </div>
      </div>
    </div>
  );
};
