import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { RealContract } from '../utils/types';

interface Props {
  contracts: RealContract[];
}

const COLORS = ['#3b82f6', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#6b7280'];

const ModalityChart: React.FC<Props> = ({ contracts }) => {
  const data = React.useMemo(() => {
    const counts: Record<string, number> = {};
    contracts.forEach((c) => {
      const mod = c.modalidad_de_contratacion || 'Otra';
      counts[mod] = (counts[mod] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name: name.substring(0, 20), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [contracts]);

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        Sin datos para graficar
      </div>
    );
  }

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Modalidades de Contratación</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
          <Tooltip formatter={(value: number) => [`${value} contratos`]} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default React.memo(ModalityChart);
