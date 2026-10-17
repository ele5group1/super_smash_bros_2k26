import React from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T | ((row: T) => string | number);
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnKey: string) => void;
  caption?: string;
  emptyText?: string;
  isLoading?: boolean;
  className?: string;
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  sortColumn,
  sortDirection,
  onSort,
  caption,
  emptyText = 'No data available',
  isLoading = false,
  className = '',
}: TableProps<T>) {
  const getRowKey = (row: T, index: number): string | number => {
    if (typeof keyField === 'function') {
      return keyField(row);
    }
    return row[keyField] ?? index;
  };

  return (
    <div className={`ui-table-container ${className}`}>
      <table className="ui-table">
        {caption && <caption className="ui-table-caption">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((col) => {
              const isSorted = sortColumn === col.key;
              const ariaSort = isSorted
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : undefined;

              return (
                <th
                  key={col.key}
                  style={{ textAlign: col.align || 'left', width: col.width }}
                  aria-sort={ariaSort}
                >
                  {col.sortable && onSort ? (
                    <button
                      type="button"
                      className="ui-table-sort-btn"
                      onClick={() => onSort(col.key)}
                    >
                      <span>{col.header}</span>
                      <span className="ui-table-sort-icon" aria-hidden="true">
                        {isSorted ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
                      </span>
                    </button>
                  ) : (
                    <span>{col.header}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="ui-table-empty">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <div className="ui-skeleton ui-skeleton-text" style={{ width: '100%', height: '24px' }} />
                  <div className="ui-skeleton ui-skeleton-text" style={{ width: '100%', height: '24px' }} />
                  <div className="ui-skeleton ui-skeleton-text" style={{ width: '100%', height: '24px' }} />
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="ui-table-empty">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr key={getRowKey(row, rowIndex)}>
                {columns.map((col) => (
                  <td key={col.key} style={{ textAlign: col.align || 'left' }}>
                    {col.render ? col.render(row, rowIndex) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
