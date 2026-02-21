import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { HardDrive } from 'lucide-react';
import { formatBytes } from '@shared/utils/format';
import styles from './StorageBreakdownChart.module.css';

interface StorageBreakdown {
  music: number;
  metadata: number;
  avatars: number;
  total: number;
}

interface StorageBreakdownChartProps {
  data: StorageBreakdown;
}

const COLORS = {
  music: '#3b82f6',
  metadata: '#10b981',
  avatars: '#f59e0b',
};

/**
 * StorageBreakdownChart Component
 * Muestra un gráfico de torta con el desglose de almacenamiento
 */
export function StorageBreakdownChart({ data }: StorageBreakdownChartProps) {
  // Transform data for Recharts
  // Note: "metadata" = artist/album images from external providers
  // Note: "avatars" = user profile pictures (not artist images)
  const chartData = [
    { name: 'Música', value: data.music, percentage: ((data.music / data.total) * 100).toFixed(1) },
    {
      name: 'Imágenes (Artistas/Álbumes)',
      value: data.metadata,
      percentage: ((data.metadata / data.total) * 100).toFixed(1),
    },
    {
      name: 'Avatares de Usuario',
      value: data.avatars,
      percentage: ((data.avatars / data.total) * 100).toFixed(1),
    },
  ];

  const renderCustomLabel = (props: PieLabelRenderProps & { percentage?: string }) => {
    return `${props.percentage}%`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <HardDrive size={20} />
        <div>
          <h3 className={styles.title}>Desglose de Almacenamiento</h3>
          <p className={styles.subtitle}>Total: {formatBytes(data.total)}</p>
        </div>
      </div>

      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={90}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatBytes(value)}
              contentStyle={{
                backgroundColor: 'rgba(20, 20, 20, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: '#ffffff',
              }}
            />
            <Legend
              wrapperStyle={{ color: '#b8bcc8', fontSize: 13 }}
              iconType="circle"
              formatter={(value, entry: { payload?: { value?: number } }) =>
                `${value}: ${formatBytes(entry.payload?.value ?? 0)}`
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
