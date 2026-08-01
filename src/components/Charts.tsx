import { useState, type ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';
import { Button, DataTable } from './Ui';

export function ChartWrapper({
  title,
  summary,
  tableHeaders,
  tableRows,
  children,
}: {
  title: string;
  summary: string;
  tableHeaders: string[];
  tableRows: ReactNode[][];
  children: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <div className="chart-wrap" aria-label={title}>
      <p className="sr-only">{summary}</p>
      <div className="chart-wrap__toggle">
        <Button
          variant="tertiary"
          onClick={() => setShowTable((value) => !value)}
          aria-expanded={showTable}
        >
          {showTable ? 'Show chart' : 'View data table'}
        </Button>
      </div>
      {showTable ? (
        <DataTable caption={`${title} data`} headers={tableHeaders} rows={tableRows} />
      ) : (
        <div className="chart-canvas">
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function Ring({
  value,
  label,
  tone = 'primary',
}: {
  value: number;
  label: string;
  tone?: 'primary' | 'warning' | 'success';
}) {
  return (
    <div
      className={`ring ring--${tone}`}
      style={{ '--ring-value': `${value * 3.6}deg` } as React.CSSProperties}
      role="img"
      aria-label={`${label}: ${value}%`}
    >
      <div>
        <strong>{value}%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
