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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { system, process: proc } = metrics;
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{t('admin.server.systemTitle')}</h3>
      <div className={styles.systemInfoCard}>
        <div className={styles.systemInfoGrid}>
          <div className={styles.systemInfoItem}>
            <span className={styles.systemInfoItemLabel}>{t('admin.server.hostname')}</span>
            <span className={styles.systemInfoItemValue}>{system.hostname}</span>
          </div>
          <div className={styles.systemInfoItem}>
            <span className={styles.systemInfoItemLabel}>{t('admin.server.platform')}</span>
            <span className={styles.systemInfoItemValue}>
              {system.platform} / {system.arch}
            </span>
          </div>
          <div className={styles.systemInfoItem}>
            <span className={styles.systemInfoItemLabel}>{t('admin.server.cpu')}</span>
            <span className={styles.systemInfoItemValue}>
              {t('admin.server.cpuCores', { count: system.cpuCores })}
            </span>
          </div>
          <div className={styles.systemInfoItem}>
            <span className={styles.systemInfoItemLabel}>{t('admin.server.node')}</span>
            <span className={styles.systemInfoItemValue}>{proc.nodeVersion}</span>
          </div>
          <div className={styles.systemInfoItem}>
            <span className={styles.systemInfoItemLabel}>{t('admin.server.pid')}</span>
            <span className={styles.systemInfoItemValue}>{proc.pid}</span>
          </div>
          <div className={styles.systemInfoItem}>
            <span className={styles.systemInfoItemLabel}>{t('admin.server.uptime')}</span>
            <span className={styles.systemInfoItemValue}>{formatUptime(proc.uptimeSeconds)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MemorySection({ metrics }: { metrics: ServerMetrics }) {
  const { t } = useTranslation();
  const { system, process: proc } = metrics;
  const appTotalMB = proc.memoryUsage.rssMB;
  const appPercent =
    system.totalMemoryMB > 0 ? Math.round((appTotalMB / system.totalMemoryMB) * 100) : 0;

  // Heap is managed by V8 GC — never show critical (red), it self-regulates
  const heapStatus: 'ok' | 'warning' = proc.memoryUsage.heapUsagePercent >= 85 ? 'warning' : 'ok';

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{t('admin.server.memoryTitle')}</h3>
      <div className={styles.gridThree}>
        <MetricCard
          label={t('admin.server.rssUsage')}
          value={appTotalMB}
          unit={t('admin.server.mb')}
          icon={<MemoryStick size={14} />}
          subtext={t('admin.server.rssSubtext', {
            percent: appPercent,
            total: system.totalMemoryMB,
          })}
        >
          <ProgressBar percent={appPercent} />
        </MetricCard>

        <MetricCard
          label={t('admin.server.heap')}
          value={proc.memoryUsage.heapUsedMB}
          unit={t('admin.server.mb')}
          icon={<Cpu size={14} />}
          subtext={t('admin.server.heapSubtext', {
            percent: proc.memoryUsage.heapUsagePercent,
            total: proc.memoryUsage.heapTotalMB,
          })}
        >
          <ProgressBar percent={proc.memoryUsage.heapUsagePercent} status={heapStatus} />
        </MetricCard>

        <MetricCard
          label={t('admin.server.externalMemory')}
          value={proc.memoryUsage.externalMB}
          unit={t('admin.server.mb')}
          icon={<Layers size={14} />}
          subtext={t('admin.server.externalSubtext')}
        />
      </div>
    </div>
  );
}

function CpuLoadSection({ metrics }: { metrics: ServerMetrics }) {
  const { t } = useTranslation();
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
      <h3 className={styles.sectionTitle}>{t('admin.server.cpuTitle')}</h3>
      <div className={styles.gridThree}>
        <MetricCard
          label={t('admin.server.load1m')}
          value={load1m.toFixed(2)}
          icon={<Activity size={14} />}
          subtext={t('admin.server.loadSubtext', { percent: loadPercent, count: system.cpuCores })}
        >
          <ProgressBar percent={loadPercent} />
        </MetricCard>

        <MetricCard
          label={t('admin.server.load5m')}
          value={load5m.toFixed(2)}
          icon={<Activity size={14} />}
        />

        <MetricCard
          label={t('admin.server.load15m')}
          value={load15m.toFixed(2)}
          icon={<Activity size={14} />}
        />
      </div>
    </div>
  );
}

function StorageSection({ metrics }: { metrics: ServerMetrics }) {
  const { t } = useTranslation();
  const { system } = metrics;
  if (!system.storage) return null;

  const { storage } = system;

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{t('admin.server.storageTitle')}</h3>
      <MetricCard
        label={t('admin.server.libraryDisk')}
        value={storage.usagePercent}
        unit="%"
        icon={<HardDrive size={14} />}
        subtext={storage.libraryPath}
      >
        <ProgressBar
          percent={storage.usagePercent}
          status={storage.status}
          leftLabel={t('admin.server.freeSpace', { value: storage.freeGB })}
          rightLabel={t('admin.server.totalSpace', { value: storage.totalGB })}
        />
      </MetricCard>
    </div>
  );
}

function StreamingSection({ metrics }: { metrics: ServerMetrics }) {
  const { t } = useTranslation();
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
      <h3 className={styles.sectionTitle}>{t('admin.server.streamingTitle')}</h3>
      <div className={styles.gridFour}>
        <MetricCard
          label={t('admin.server.activeStreams')}
          value={metrics.streaming.activeStreams}
          icon={<Radio size={14} />}
          className={styles.cardStreaming}
        />

        <MetricCard
          label={t('admin.server.totalServed')}
          value={metrics.streaming.totalStreamsServed.toLocaleString()}
          icon={<Activity size={14} />}
          subtext={t('admin.server.sinceProcessStart')}
        />

        <MetricCard
          label={t('admin.server.streamTokens')}
          value={metrics.streaming.activeStreamTokens}
          icon={<Layers size={14} />}
        />

        <MetricCard
          label={t('admin.server.dbPool')}
          value={`${activeConnections} / ${pool.maxConnections}`}
          icon={<Database size={14} />}
          subtext={t('admin.server.poolSubtext', {
            idle: pool.idleConnections,
            waiting: pool.waitingRequests,
          })}
        >
          <ProgressBar percent={poolPercent} status={poolStatus} />
        </MetricCard>
      </div>
    </div>
  );
}

function QueuesSection({ metrics }: { metrics: ServerMetrics }) {
  const { t } = useTranslation();
  if (metrics.queues.length === 0) return null;

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{t('admin.server.queuesTitle')}</h3>
      <div className={styles.queueCard}>
        <table className={styles.queueTable}>
          <thead>
            <tr>
              <th>{t('admin.server.queue')}</th>
              <th>{t('admin.server.waiting')}</th>
              <th>{t('admin.server.active')}</th>
              <th>{t('admin.server.completed')}</th>
              <th>{t('admin.server.failed')}</th>
              <th>{t('admin.server.delayed')}</th>
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
  const { t } = useTranslation();
  const { metrics, isConnected } = useServerMetrics();

  if (!metrics) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Monitor size={24} />
            <div>
              <h2 className={styles.title}>{t('admin.server.title')}</h2>
              <p className={styles.subtitle}>{t('admin.server.subtitle')}</p>
            </div>
          </div>
        </div>
        <div className={styles.waiting}>
          <Server size={40} className={styles.waitingIcon} />
          <p>{t('admin.server.connecting')}</p>
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
            <h2 className={styles.title}>{t('admin.server.title')}</h2>
            <p className={styles.subtitle}>{t('admin.server.subtitle')}</p>
          </div>
        </div>
        <div
          className={`${styles.connectionBadge} ${
            isConnected ? styles.connected : styles.disconnected
          }`}
        >
          <span className={styles.dot} />
          {isConnected ? t('admin.server.live') : t('admin.server.disconnected')}
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
