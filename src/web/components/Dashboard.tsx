import React from 'react';
import { ReportData } from '../../types';

interface MetricCardProps {
  title: string;
  value: number | string;
  color: string;
  percentage?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, color, percentage }) => (
  <div className="metric-card">
    <div className="metric-header">
      <h3>{title}</h3>
      {percentage !== undefined && (
        <span className="percentage" style={{ color }}>
          {percentage.toFixed(1)}%
        </span>
      )}
    </div>
    <div className="metric-value" style={{ color }}>
      {value}
    </div>
  </div>
);

interface DashboardProps {
  reportData: ReportData;
}

export const Dashboard: React.FC<DashboardProps> = ({ reportData }) => {
  const { metadata } = reportData;
  
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(2);
    return `${minutes}m ${seconds}s`;
  };

  const passRate = metadata.totalTests > 0 
    ? (metadata.passed / metadata.totalTests) * 100 
    : 0;

  const failRate = metadata.totalTests > 0 
    ? (metadata.failed / metadata.totalTests) * 100 
    : 0;

  const skipRate = metadata.totalTests > 0 
    ? (metadata.skipped / metadata.totalTests) * 100 
    : 0;

  const flakyRate = metadata.totalTests > 0 
    ? (metadata.flaky / metadata.totalTests) * 100 
    : 0;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Test Execution Report</h1>
        {(metadata.name || metadata.environment || metadata.version || metadata.user) && (
          <div className="project-info">
            {metadata.name && <span><span className="label">Name:</span> <span className="value">{metadata.name}</span></span>}
            {metadata.environment && <span><span className="label">Environment:</span> <span className="value">{metadata.environment}</span></span>}
            {metadata.version && <span><span className="label">Version:</span> <span className="value">{metadata.version}</span></span>}
            {metadata.user && <span><span className="label">User:</span> <span className="value">{metadata.user}</span></span>}
          </div>
        )}
        <div className="report-info">
          <span>Started: {metadata.startTime.toLocaleString()}</span>
          <span>Duration: {formatDuration(metadata.duration)}</span>
          <span>Playwright v{metadata.playwrightVersion}</span>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard
          title="Total Tests"
          value={metadata.totalTests}
          color="#2563eb"
        />
        <MetricCard
          title="Passed"
          value={metadata.passed}
          color="#059669"
          percentage={passRate}
        />
        <MetricCard
          title="Failed"
          value={metadata.failed}
          color="#dc2626"
          percentage={failRate}
        />
        <MetricCard
          title="Skipped"
          value={metadata.skipped}
          color="#d97706"
          percentage={skipRate}
        />
        <MetricCard
          title="Flaky"
          value={metadata.flaky}
          color="#f59e0b"
          percentage={flakyRate}
        />
        <MetricCard
          title="Timed Out"
          value={metadata.timedOut}
          color="#7c2d12"
        />
      </div>

      <div className="charts-section">
        <div className="chart-container">
          <h3>Test Status Distribution</h3>
          <div className="donut-chart">
            <svg viewBox="0 0 200 200" className="donut-svg">
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#059669"
                strokeWidth="20"
                strokeDasharray={`${passRate * 5.03} 503`}
                strokeDashoffset="0"
                transform="rotate(-90 100 100)"
              />
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#dc2626"
                strokeWidth="20"
                strokeDasharray={`${failRate * 5.03} 503`}
                strokeDashoffset={`-${passRate * 5.03}`}
                transform="rotate(-90 100 100)"
              />
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#d97706"
                strokeWidth="20"
                strokeDasharray={`${skipRate * 5.03} 503`}
                strokeDashoffset={`-${(passRate + failRate) * 5.03}`}
                transform="rotate(-90 100 100)"
              />
              <text x="100" y="100" textAnchor="middle" dy="0.3em" className="donut-center-text">
                {metadata.totalTests}
              </text>
              <text x="100" y="115" textAnchor="middle" dy="0.3em" className="donut-center-label">
                Tests
              </text>
            </svg>
          </div>
          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#059669' }}></span>
              <span>Passed ({metadata.passed})</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#dc2626' }}></span>
              <span>Failed ({metadata.failed})</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#d97706' }}></span>
              <span>Skipped ({metadata.skipped})</span>
            </div>
          </div>
        </div>

        <div className="stats-container">
          <h3>Execution Statistics</h3>
          <div className="stats-list">
            <div className="stat-item">
              <span className="stat-label">Projects:</span>
              <span className="stat-value">{metadata.projects.join(', ')}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Suites:</span>
              <span className="stat-value">{reportData.suites.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Average Duration:</span>
              <span className="stat-value">
                {metadata.totalTests > 0 
                  ? formatDuration(reportData.suites.reduce((sum, suite) => 
                      sum + suite.tests.reduce((testSum, test) => testSum + test.duration, 0), 0
                    ) / metadata.totalTests)
                  : '0ms'
                }
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Success Rate:</span>
              <span className="stat-value" style={{ 
                color: passRate >= 80 ? '#059669' : passRate >= 60 ? '#d97706' : '#dc2626' 
              }}>
                {passRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};