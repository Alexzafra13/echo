import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { HardDrive } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatBytes } from '@shared/utils/format';
import styles from './StorageBreakdownChart.module.css';

interface StorageBreakdown {
  music: number;
  videos?: number;
  metadata: number;
  avatars: number;
  radioFavicons: number;
  total: number;
}

interface StorageBreakdownChartProps {
  data: StorageBreakdown;
}

const COLORS: Record<string, string> = {
  music: '#6366f1',
  videos: '#8b5cf6',
  metadata: '#10b981',
  avatars: '#f59e0b',
  radioFavicons: '#ec4899',
};

/**
 * StorageBreakdownChart Component
 * Muestra un gráfico de torta con el desglose de almacenamiento
 */
export function StorageBreakdownChart({ data }: StorageBreakdownChartProps) {
  const { t } = useTranslation();

  // Transform data for Recharts
  // Note: "metadata" = artist/album images from external providers
  // Note: "avatars" = user profile pictures (not artist images)
  const allData = [
    {
      name: t('admin.dashboard.storageMusic'),
      key: 'music',
      value: data.music,
      percentage: ((data.music / data.total) * 100).toFixed(1),
    },
    ...((data.videos ?? 0) > 0
      ? [
          {
            name: t('admin.dashboard.storageVideoclips'),
            key: 'videos',
            value: data.videos!,
            percentage: ((data.videos! / data.total) * 100).toFixed(1),
          },
        ]
      : []),
    {
      name: t('admin.dashboard.storageImages'),
      key: 'metadata',
      value: data.metadata,
      percentage: ((data.metadata / data.total) * 100).toFixed(1),
    },
    {
      name: t('admin.dashboard.storageAvatars'),
      key: 'avatars',
      value: data.avatars,
      percentage: ((data.avatars / data.total) * 100).toFixed(1),
    },
    {
      name: t('admin.dashboard.storageRadioFavicons'),
      key: 'radioFavicons',
      value: data.radioFavicons,
      percentage: ((data.radioFavicons / data.total) * 100).toFixed(1),
    },
  ];
  const chartData = allData.filter((d) => d.value > 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <HardDrive size={20} />
        <div>
          <h3 className={styles.title}>{t('admin.dashboard.storageBreakdown')}</h3>
          <p className={styles.subtitle}>
            {t('admin.dashboard.storageTotal', { size: formatBytes(data.total) })}
          </p>
        </div>
      </div>

      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              innerRadius={45}
              fill="#8884d8"
              dataKey="value"
              strokeWidth={2}
              stroke="rgba(0,0,0,0.3)"
              minAngle={3}
            >
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={COLORS[entry.key]} />
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
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.legend}>
        {allData.map((entry) => (
          <div key={entry.key} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: COLORS[entry.key] }} />
            <span className={styles.legendLabel}>{entry.name}</span>
            <span className={styles.legendValue}>{formatBytes(entry.value)}</span>
            <span className={styles.legendPercent}>{entry.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
