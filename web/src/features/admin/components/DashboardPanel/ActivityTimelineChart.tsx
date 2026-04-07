import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './ActivityTimelineChart.module.css';

interface ActivityTimelineDay {
  date: string;
  scans: number;
  enrichments: number;
  errors: number;
}

interface ActivityTimelineChartProps {
  data: ActivityTimelineDay[];
}

/**
 * ActivityTimelineChart Component
 * Muestra un gráfico de barras con la actividad de los últimos 7 días
 */
export function ActivityTimelineChart({ data }: ActivityTimelineChartProps) {
  const { t, i18n } = useTranslation();

  const scansKey = t('admin.dashboard.chartScans');
  const enrichmentsKey = t('admin.dashboard.chartEnrichments');
  const errorsKey = t('admin.dashboard.chartErrors');

  // Transform data for Recharts
  const chartData = data.map((day) => ({
    date: new Date(day.date).toLocaleDateString(i18n.language, {
      weekday: 'short',
      day: 'numeric',
    }),
    [scansKey]: day.scans,
    [enrichmentsKey]: day.enrichments,
    [errorsKey]: day.errors,
  }));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Activity size={20} />
        <div>
          <h3 className={styles.title}>{t('admin.dashboard.activityLast7Days')}</h3>
          <p className={styles.subtitle}>{t('admin.dashboard.activitySubtitle')}</p>
        </div>
      </div>

      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis
              dataKey="date"
              stroke="rgba(255, 255, 255, 0.5)"
              tick={{ fill: '#b8bcc8', fontSize: 11 }}
              tickLine={false}
            />
            <YAxis
              stroke="rgba(255, 255, 255, 0.5)"
              tick={{ fill: '#b8bcc8', fontSize: 11 }}
              tickLine={false}
              width={40}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(20, 20, 20, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: '#ffffff',
              }}
              cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
            />
            <Legend wrapperStyle={{ color: '#b8bcc8', fontSize: 13 }} iconType="circle" />
            <Bar dataKey={scansKey} fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey={enrichmentsKey} fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey={errorsKey} fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
