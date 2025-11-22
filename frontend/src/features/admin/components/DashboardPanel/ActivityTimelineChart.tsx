import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';
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
  // Transform data for Recharts
  const chartData = data.map((day) => ({
    date: new Date(day.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
    Escaneos: day.scans,
    Enriquecimientos: day.enrichments,
    Errores: day.errors,
  }));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Activity size={20} />
        <div>
          <h3 className={styles.title}>Actividad (últimos 7 días)</h3>
          <p className={styles.subtitle}>Escaneos, enriquecimientos y errores por día</p>
        </div>
      </div>

      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis
              dataKey="date"
              stroke="rgba(255, 255, 255, 0.5)"
              tick={{ fill: '#b8bcc8', fontSize: 12 }}
            />
            <YAxis
              stroke="rgba(255, 255, 255, 0.5)"
              tick={{ fill: '#b8bcc8', fontSize: 12 }}
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
            <Legend
              wrapperStyle={{ color: '#b8bcc8', fontSize: 13 }}
              iconType="circle"
            />
            <Bar dataKey="Escaneos" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Enriquecimientos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Errores" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
