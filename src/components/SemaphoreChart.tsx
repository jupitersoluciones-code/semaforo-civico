import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface Props {
  green: number;
  yellow: number;
  red: number;
  total: number;
}

const COLORS = ['#22c55e', '#eab308', '#ef4444'];

const SemaphoreChart: React.FC<Props> = ({ green, yellow, red, total }) => {
  if (total === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        Sin datos para graficar
      </div>
    );
  }

  const data = [
    { name: 'Verde', value: green, label: `${green} (${((green / total) * 100).toFixed(0)}%)` },
    { name: 'Amarillo', value: yellow, label: `${yellow} (${((yellow / total) * 100).toFixed(0)}%)` },
    { name: 'Rojo', value: red, label: `${red} (${((red / total) * 100).toFixed(0)}%)` },
  ].filter((d) => d.value > 0);

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Distribución del Semáforo</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [`${value} contratos`, name]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default React.memo(SemaphoreChart);
