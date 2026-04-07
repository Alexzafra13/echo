import {
  Activity,
  Cpu,
  Database,
  HardDrive,
  MemoryStick,
  Monitor,
  Radio,
  Server,
  Layers,
} from 'lucide-react';
import { useServerMetrics, type ServerMetrics } from '../../hooks/useServerMetrics';
import styles from './ServerMetricsPanel.module.css';

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getProgressStatus(percent: number): 'ok' | 'warning' | 'critical' {
  if (percent >= 90) return 'critical';
  if (percent >= 75) return 'warning';
  return 'ok';
}

function ProgressBar({
  percent,
  status,
  leftLabel,
  rightLabel,
}: {
  percent: number;
  status?: 'ok' | 'warning' | 'critical';
  leftLabel?: string;
  rightLabel?: string;
}) {
  const s = status ?? getProgressStatus(percent);
  return (
    <div className={styles.progressContainer}>
      <div className={styles.progressTrack}>
        <div
          className={`${styles.progressFill} ${styles[s]}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      {(leftLabel || rightLabel) && (
        <div className={styles.progressLabel}>
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
  icon,
  subtext,
  children,
  className,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  subtext?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`${styles.metricCard} ${className ?? ''}`}>
      <p className={styles.metricLabel}>
        {icon}
        {label}
      </p>
      <p className={styles.metricValue}>
        {value}
        {unit && <span className={styles.metricUnit}>{unit}</span>}
      </p>
      {subtext && <p className={styles.metricSubtext}>{subtext}</p>}
      {children}
    </div>
  );
}

function SystemInfoSection({ metrics }: { metrics: ServerMetrics }) {
  const { system, process: proc } = metrics;
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Echo Server</h3>
      <div className={styles.systemInfoCard}>
        <div className={styles.systemInfoGrid}>
          <div className={styles.systemInfoItem}>
            <span className={styles.systemInfoItemLabel}>Hostname</span>
            <span className={styles.systemInfoItemValue}>{system.hostname}</span>
          </div>
          <div className={styles.systemInfoItem}>
            <span className={styles.systemInfoItemLabel}>Plataforma</span>
            <span className={styles.systemInfoItemValue}>
              {system.platform} / {system.arch}
            </span>
          </div>
          <div className={styles.systemInfoItem}>
            <span className={styles.systemInfoItemLabel}>CPU</span>
            <span className={styles.systemInfoItemValue}>{system.cpuCores} cores</span>
          </div>
          <div className={styles.systemInfoItem}>
            <span className={styles.systemInfoItemLabel}>Node.js</span>
            <span className={styles.systemInfoItemValue}>{proc.nodeVersion}</span>
          </div>
          <div className={styles.systemInfoItem}>
            <span className={styles.systemInfoItemLabel}>PID</span>
            <span className={styles.systemInfoItemValue}>{proc.pid}</span>
          </div>
          <div className={styles.systemInfoItem}>
            <span className={styles.systemInfoItemLabel}>Uptime Echo</span>
            <span className={styles.systemInfoItemValue}>{formatUptime(proc.uptimeSeconds)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MemorySection({ metrics }: { metrics: ServerMetrics }) {
  const { system, process: proc } = metrics;
  const appTotalMB = proc.memoryUsage.rssMB;
  const appPercent =
    system.totalMemoryMB > 0 ? Math.round((appTotalMB / system.totalMemoryMB) * 100) : 0;

  // Heap is managed by V8 GC — never show critical (red), it self-regulates
  const heapStatus: 'ok' | 'warning' = proc.memoryUsage.heapUsagePercent >= 85 ? 'warning' : 'ok';

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Memoria de Echo</h3>
      <div className={styles.gridThree}>
        <MetricCard
          label="Uso Total (RSS)"
          value={appTotalMB}
          unit="MB"
          icon={<MemoryStick size={14} />}
          subtext={`${appPercent}% de ${system.totalMemoryMB} MB del servidor`}
        >
          <ProgressBar percent={appPercent} />
        </MetricCard>

        <MetricCard
          label="Heap V8"
          value={proc.memoryUsage.heapUsedMB}
          unit="MB"
          icon={<Cpu size={14} />}
          subtext={`${proc.memoryUsage.heapUsagePercent}% del heap (${proc.memoryUsage.heapTotalMB} MB)`}
        >
          <ProgressBar percent={proc.memoryUsage.heapUsagePercent} status={heapStatus} />
        </MetricCard>

        <MetricCard
          label="Memoria Externa"
          value={proc.memoryUsage.externalMB}
          unit="MB"
          icon={<Layers size={14} />}
          subtext="Buffers C++ (ffmpeg, crypto)"
        />
      </div>
    </div>
  );
}

function CpuLoadSection({ metrics }: { metrics: ServerMetrics }) {
  const { system } = metrics;
  const load1m = system.loadAverage[0] ?? 0;
  const load5m = system.loadAverage[1] ?? 0;
  const load15m = system.loadAverage[2] ?? 0;

  // On Windows, os.loadavg() always returns [0, 0, 0] — hide section
  const isWindows = system.platform === 'win32';
  const allZero = load1m === 0 && load5m === 0 && load15m === 0;
  if (isWindows && allZero) return null;

  const loadPercent = Math.min(Math.round((load1m / system.cpuCores) * 100), 100);

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>CPU</h3>
      <div className={styles.gridThree}>
        <MetricCard
          label="Load 1 min"
          value={load1m.toFixed(2)}
          icon={<Activity size={14} />}
          subtext={`${loadPercent}% de ${system.cpuCores} cores`}
        >
          <ProgressBar percent={loadPercent} />
        </MetricCard>

        <MetricCard label="Load 5 min" value={load5m.toFixed(2)} icon={<Activity size={14} />} />

        <MetricCard label="Load 15 min" value={load15m.toFixed(2)} icon={<Activity size={14} />} />
      </div>
    </div>
  );
}

function StorageSection({ metrics }: { metrics: ServerMetrics }) {
  const { system } = metrics;
  if (!system.storage) return null;

  const { storage } = system;

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Almacenamiento</h3>
      <MetricCard
        label="Disco de la Biblioteca"
        value={storage.usagePercent}
        unit="%"
        icon={<HardDrive size={14} />}
        subtext={storage.libraryPath}
      >
        <ProgressBar
          percent={storage.usagePercent}
          status={storage.status}
          leftLabel={`${storage.freeGB} GB libre`}
          rightLabel={`${storage.totalGB} GB total`}
        />
      </MetricCard>
    </div>
  );
}

function StreamingSection({ metrics }: { metrics: ServerMetrics }) {
  const { pool } = metrics.database;
  const activeConnections = pool.totalConnections - pool.idleConnections;

  // Pool health based on what matters: active usage ratio and waiting requests
  // Green: connections available. Yellow: heavily used. Red: requests waiting (saturated).
  let poolStatus: 'ok' | 'warning' | 'critical' = 'ok';
  if (pool.waitingRequests > 0) poolStatus = 'critical';
  else if (activeConnections > pool.maxConnections * 0.8) poolStatus = 'warning';

  const poolPercent =
    pool.maxConnections > 0 ? Math.round((activeConnections / pool.maxConnections) * 100) : 0;

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Streaming & Conexiones</h3>
      <div className={styles.gridFour}>
        <MetricCard
          label="Streams Activos"
          value={metrics.streaming.activeStreams}
          icon={<Radio size={14} />}
          className={styles.cardStreaming}
        />

        <MetricCard
          label="Total Servidos"
          value={metrics.streaming.totalStreamsServed.toLocaleString()}
          icon={<Activity size={14} />}
          subtext="Desde inicio del proceso"
        />

        <MetricCard
          label="Tokens de Stream"
          value={metrics.streaming.activeStreamTokens}
          icon={<Layers size={14} />}
        />

        <MetricCard
          label="Pool de DB"
          value={`${activeConnections} / ${pool.maxConnections}`}
          icon={<Database size={14} />}
          subtext={`${pool.idleConnections} idle, ${pool.waitingRequests} en espera`}
        >
          <ProgressBar percent={poolPercent} status={poolStatus} />
        </MetricCard>
      </div>
    </div>
  );
}

function QueuesSection({ metrics }: { metrics: ServerMetrics }) {
  if (metrics.queues.length === 0) return null;

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Colas de trabajo</h3>
      <div className={styles.queueCard}>
        <table className={styles.queueTable}>
          <thead>
            <tr>
              <th>Cola</th>
              <th>En espera</th>
              <th>Activos</th>
              <th>Completados</th>
              <th>Fallidos</th>
              <th>Retrasados</th>
            </tr>
          </thead>
          <tbody>
            {metrics.queues.map((q) => (
              <tr key={q.name}>
                <td className={styles.queueName}>{q.name}</td>
                <td>
                  <span className={`${styles.queueBadge} ${q.waiting > 0 ? styles.waiting : ''}`}>
                    {q.waiting}
                  </span>
                </td>
                <td>
                  <span className={`${styles.queueBadge} ${q.active > 0 ? styles.active : ''}`}>
                    {q.active}
                  </span>
                </td>
                <td>
                  <span className={`${styles.queueBadge} ${styles.completed}`}>
                    {q.completed.toLocaleString()}
                  </span>
                </td>
                <td>
                  <span className={`${styles.queueBadge} ${q.failed > 0 ? styles.failed : ''}`}>
                    {q.failed}
                  </span>
                </td>
                <td>
                  <span className={`${styles.queueBadge} ${q.delayed > 0 ? styles.delayed : ''}`}>
                    {q.delayed}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ServerMetricsPanel() {
  const { metrics, isConnected } = useServerMetrics();

  if (!metrics) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Monitor size={24} />
            <div>
              <h2 className={styles.title}>Server Metrics</h2>
              <p className={styles.subtitle}>Monitoreo en tiempo real del servidor</p>
            </div>
          </div>
        </div>
        <div className={styles.waiting}>
          <Server size={40} className={styles.waitingIcon} />
          <p>Conectando con el servidor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Monitor size={24} />
          <div>
            <h2 className={styles.title}>Server Metrics</h2>
            <p className={styles.subtitle}>Monitoreo en tiempo real del servidor</p>
          </div>
        </div>
        <div
          className={`${styles.connectionBadge} ${
            isConnected ? styles.connected : styles.disconnected
          }`}
        >
          <span className={styles.dot} />
          {isConnected ? 'En vivo' : 'Desconectado'}
        </div>
      </div>

      <SystemInfoSection metrics={metrics} />
      <MemorySection metrics={metrics} />
      <CpuLoadSection metrics={metrics} />
      <StorageSection metrics={metrics} />
      <StreamingSection metrics={metrics} />
      <QueuesSection metrics={metrics} />
    </div>
  );
}
