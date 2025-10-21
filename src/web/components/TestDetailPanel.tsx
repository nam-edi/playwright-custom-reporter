import React, { useState } from 'react';
import { TestExecutionData, TestAttachment } from '../../types';

interface TestDetailPanelProps {
  test: TestExecutionData | null;
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'overview' | 'attachments' | 'errors' | 'timeline';

export const TestDetailPanel: React.FC<TestDetailPanelProps> = ({ test, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedAttachment, setSelectedAttachment] = useState<TestAttachment | null>(null);

  if (!test) return null;

    const openTraceViewer = (attachment: TestAttachment) => {
    const currentUrl = window.location;
    const isHttpProtocol = currentUrl.protocol === 'http:' || currentUrl.protocol === 'https:';
    
    if (!isHttpProtocol) {
      // File protocol - show error like native Playwright reporter
      alert('Le visualiseur de trace Playwright doit être chargé via les protocoles http:// ou https://.\n\nVeuillez utiliser : npx playwright show-report');
      return;
    }
    
    // HTTP/HTTPS protocol - construct trace URL like native reporter
    let traceUrl = attachment.path || '';
    if (!traceUrl.startsWith('http')) {
      const baseUrl = `${currentUrl.protocol}//${currentUrl.host}`;
      if (currentUrl.pathname.includes('/')) {
        const pathParts = currentUrl.pathname.split('/').slice(0, -1);
        traceUrl = `${baseUrl}${pathParts.join('/')}/${attachment.path}`;
      } else {
        traceUrl = `${baseUrl}/${attachment.path}`;
      }
    }
    
    // Always use local trace viewer (like native reporter)
    const localTraceViewer = `trace/index.html?trace=${encodeURIComponent(traceUrl)}`;
    window.open(localTraceViewer, '_blank');
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatDateTime = (date: Date): string => {
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(date));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return '#059669';
      case 'failed': return '#dc2626';
      case 'skipped': return '#d97706';
      case 'timedOut': return '#7c2d12';
      case 'interrupted': return '#ea580c';
      default: return '#6b7280';
    }
  };

  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case 'video': return '🎥';
      case 'screenshot': return '📸';
      case 'trace': return '🔍';
      default: return '📎';
    }
  };

  const renderAttachmentPreview = (attachment: TestAttachment) => {
    switch (attachment.type) {
      case 'video':
        return attachment.path ? (
          <video 
            controls 
            className="attachment-preview video-preview"
            src={attachment.path}
          >
            Your browser does not support the video tag.
          </video>
        ) : null;

      case 'screenshot':
        return attachment.path ? (
          <img 
            src={attachment.path} 
            alt={attachment.name}
            className="attachment-preview image-preview"
          />
        ) : null;

      case 'trace':
        return attachment.path ? (
          <div className="trace-preview">
            <div className="trace-header">
              <h4>🔍 Playwright Trace</h4>
              <span className="trace-name">{attachment.name}</span>
            </div>
            <div className="trace-content">
              <p className="trace-description">
                Les traces Playwright contiennent des informations détaillées sur l'exécution du test, 
                incluant les actions, les captures d'écran automatiques, les logs réseau, et plus encore.
              </p>
              <div className="trace-actions">
                <div className="trace-buttons">
                  <button 
                    onClick={() => openTraceViewer(attachment)}
                    className="trace-viewer-button"
                  >
                    🔍 View Trace
                  </button>
                  <a 
                    href={attachment.path} 
                    download={attachment.name}
                    className="download-link secondary"
                  >
                    📥 Télécharger
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : null;

      default:
        return (
          <div className="default-attachment">
            <p>Attachment: {attachment.name}</p>
            <p>Type: {attachment.contentType}</p>
            {attachment.path && (
              <a 
                href={attachment.path} 
                download={attachment.name}
                className="download-link"
              >
                📥 Download
              </a>
            )}
          </div>
        );
    }
  };

  const groupedAttachments = test.attachments.reduce((groups, attachment) => {
    const type = attachment.type;
    if (!groups[type]) groups[type] = [];
    groups[type].push(attachment);
    return groups;
  }, {} as Record<string, TestAttachment[]>);

  return (
    <div className={`test-detail-panel ${isOpen ? 'open' : ''}`}>
      <div className="panel-header">
        <div className="panel-title">
          <h2>{test.title}</h2>
          <span 
            className="status-badge" 
            style={{ color: getStatusColor(test.status) }}
          >
            {test.status}
          </span>
        </div>
        <button onClick={onClose} className="close-button">
          ✕
        </button>
      </div>

      <div className="panel-tabs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('attachments')}
          className={`tab ${activeTab === 'attachments' ? 'active' : ''}`}
        >
          Attachments ({test.attachments.length})
        </button>
        {test.errors && test.errors.length > 0 && (
          <button
            onClick={() => setActiveTab('errors')}
            className={`tab ${activeTab === 'errors' ? 'active' : ''}`}
          >
            Errors ({test.errors.length})
          </button>
        )}
        <button
          onClick={() => setActiveTab('timeline')}
          className={`tab ${activeTab === 'timeline' ? 'active' : ''}`}
        >
          Timeline
        </button>
      </div>

      <div className="panel-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="info-grid">
              <div className="info-item">
                <label>File:</label>
                <span className="file-path">{test.file}</span>
              </div>
              {test.line && (
                <div className="info-item">
                  <label>Line:</label>
                  <span>{test.line}</span>
                </div>
              )}
              <div className="info-item">
                <label>Duration:</label>
                <span className={`duration ${test.duration > 10000 ? 'slow' : test.duration > 5000 ? 'medium' : 'fast'}`}>
                  {formatDuration(test.duration)}
                </span>
              </div>
              <div className="info-item">
                <label>Project:</label>
                <span className="project-badge">{test.project}</span>
              </div>
              <div className="info-item">
                <label>Worker:</label>
                <span>{test.workerIndex}</span>
              </div>
              {test.retries > 0 && (
                <div className="info-item">
                  <label>Retries:</label>
                  <span className="retry-badge">{test.retries}</span>
                </div>
              )}
            </div>

            {test.tags.length > 0 && (
              <div className="tags-section">
                <label>Tags:</label>
                <div className="tags-list">
                  {test.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="timing-section">
              <h3>Timing Information</h3>
              <div className="timing-info">
                <div className="timing-item">
                  <label>Started:</label>
                  <span>{formatDateTime(test.startTime)}</span>
                </div>
                <div className="timing-item">
                  <label>Finished:</label>
                  <span>{formatDateTime(test.endTime)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attachments' && (
          <div className="attachments-tab">
            {test.attachments.length === 0 ? (
              <div className="empty-state">
                <p>No attachments for this test.</p>
              </div>
            ) : (
              <div className="attachments-content">
                <div className="attachments-sidebar">
                  {Object.entries(groupedAttachments).map(([type, attachments]) => (
                    <div key={type} className="attachment-group">
                      <h4 className="attachment-group-title">
                        {getAttachmentIcon(type)} {type} ({attachments.length})
                      </h4>
                      <div className="attachment-list">
                        {attachments.map((attachment, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedAttachment(attachment)}
                            className={`attachment-item ${selectedAttachment === attachment ? 'active' : ''}`}
                          >
                            <span className="attachment-name">{attachment.name}</span>
                            <span className="attachment-type">{attachment.contentType}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="attachment-viewer">
                  {selectedAttachment ? (
                    <div className="attachment-content">
                      <h3>{selectedAttachment.name}</h3>
                      {renderAttachmentPreview(selectedAttachment)}
                    </div>
                  ) : (
                    <div className="attachment-placeholder">
                      <p>Select an attachment to view</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'errors' && test.errors && (
          <div className="errors-tab">
            {test.errors.length === 0 ? (
              <div className="empty-state">
                <p>No errors for this test.</p>
              </div>
            ) : (
              <div className="errors-list">
                {test.errors.map((error, index) => (
                  <div key={index} className="error-item">
                    <div className="error-header">
                      <h4>Error {index + 1}</h4>
                      {error.location && (
                        <span className="error-location">
                          {error.location.file}:{error.location.line}:{error.location.column}
                        </span>
                      )}
                    </div>
                    <div className="error-message">
                      {error.message}
                    </div>
                    {error.stack && (
                      <details className="error-stack">
                        <summary>Stack Trace</summary>
                        <pre>{error.stack}</pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="timeline-tab">
            <div className="timeline">
              <div className="timeline-item">
                <div className="timeline-marker start"></div>
                <div className="timeline-content">
                  <h4>Test Started</h4>
                  <p>{formatDateTime(test.startTime)}</p>
                </div>
              </div>
              
              {test.retries > 0 && (
                <div className="timeline-item">
                  <div className="timeline-marker retry"></div>
                  <div className="timeline-content">
                    <h4>Retries</h4>
                    <p>{test.retries} retry attempt(s)</p>
                  </div>
                </div>
              )}

              {test.attachments.length > 0 && (
                <div className="timeline-item">
                  <div className="timeline-marker attachment"></div>
                  <div className="timeline-content">
                    <h4>Attachments Collected</h4>
                    <p>{test.attachments.length} file(s)</p>
                  </div>
                </div>
              )}

              <div className="timeline-item">
                <div className={`timeline-marker end ${test.status}`}></div>
                <div className="timeline-content">
                  <h4>Test Completed</h4>
                  <p>{formatDateTime(test.endTime)}</p>
                  <p>Status: <strong style={{ color: getStatusColor(test.status) }}>{test.status}</strong></p>
                  <p>Duration: {formatDuration(test.duration)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};