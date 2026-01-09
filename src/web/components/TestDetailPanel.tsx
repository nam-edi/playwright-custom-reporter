import React, { useState, useEffect } from 'react';
import { TestExecutionData, TestAttachment, TestAnnotation, TestStep, TestRetryInfo, formatErrorMessage, formatStackTrace } from '../../types';

// Fonction pour générer une couleur unique basée sur le nom du tag
const getTagColor = (tag: string): { background: string; color: string; border: string } => {
  // Palette de base - 20 couleurs claires avec contours foncés
  const baseColors = [
    { bg: '#EBF4FF', text: '#1E40AF', border: '#3B82F6' }, // Blue light
    { bg: '#ECFDF5', text: '#065F46', border: '#10B981' }, // Emerald light
    { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' }, // Amber light
    { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' }, // Red light
    { bg: '#F3E8FF', text: '#581C87', border: '#8B5CF6' }, // Violet light
    { bg: '#CFFAFE', text: '#155E75', border: '#06B6D4' }, // Cyan light
    { bg: '#F7FEE7', text: '#365314', border: '#84CC16' }, // Lime light
    { bg: '#FED7AA', text: '#9A3412', border: '#F97316' }, // Orange light
    { bg: '#FCE7F3', text: '#9D174D', border: '#EC4899' }, // Pink light
    { bg: '#E0E7FF', text: '#3730A3', border: '#6366F1' }, // Indigo light
    { bg: '#F0FDFA', text: '#134E4A', border: '#14B8A6' }, // Teal light
    { bg: '#FEFCE8', text: '#713F12', border: '#EAB308' }, // Yellow light
    { bg: '#FECACA', text: '#7F1D1D', border: '#DC2626' }, // Red-600 light
    { bg: '#DDD6FE', text: '#5B21B6', border: '#7C3AED' }, // Violet-600 light
    { bg: '#D1FAE5', text: '#047857', border: '#059669' }, // Emerald-600 light
    { bg: '#CFFAFE', text: '#0E7490', border: '#0891B2' }, // Cyan-600 light
    { bg: '#ECFCCB', text: '#3F6212', border: '#65A30D' }, // Lime-600 light
    { bg: '#FED7AA', text: '#C2410C', border: '#EA580C' }, // Orange-600 light
    { bg: '#FECDD3', text: '#9F1239', border: '#BE185D' }, // Pink-700 light
    { bg: '#C7D2FE', text: '#312E81', border: '#4338CA' }, // Indigo-700 light
  ];

  // Fonction pour générer une couleur HSL
  const generateHSLColor = (hue: number, saturation: number = 85, lightness: number = 92): { background: string; color: string; border: string } => {
    const bgColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    const textColor = `hsl(${hue}, ${saturation + 15}%, ${lightness - 75}%)`;
    const borderColor = `hsl(${hue}, ${saturation + 10}%, ${lightness - 35}%)`;
    
    return {
      background: bgColor,
      color: textColor,
      border: borderColor
    };
  };

  // Créer un hash simple du nom du tag
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    const char = tag.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir en 32bit integer
  }
  
  const absHash = Math.abs(hash);
  
  // Si on a moins de 20 tags, utiliser les couleurs de base
  if (absHash < baseColors.length * 1000) {
    const colorIndex = absHash % baseColors.length;
    const selectedColor = baseColors[colorIndex];
    
    return {
      background: selectedColor.bg,
      color: selectedColor.text,
      border: selectedColor.border
    };
  }
  
  // Pour plus de 20 tags, générer des couleurs HSL avec une distribution uniforme
  const hueStep = 360 / 25; // Diviser le cercle de couleur en 25 sections
  const hueOffset = (absHash % 25) * hueStep;
  const saturationVariation = 70 + (absHash % 30); // 70-100% saturation
  const lightnessVariation = 88 + (absHash % 8); // 88-96% lightness
  
  return generateHSLColor(hueOffset, saturationVariation, lightnessVariation);
};

interface TestDetailPanelProps {
  test: TestExecutionData | null;
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'overview' | 'steps' | 'attachments' | 'errors' | 'timeline' | 'retries';

// Utilitaires pour gérer les query parameters
const getQueryParam = (param: string): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
};

const setQueryParam = (param: string, value: string | null) => {
  const urlParams = new URLSearchParams(window.location.search);
  if (value) {
    urlParams.set(param, value);
  } else {
    urlParams.delete(param);
  }
  
  const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
  window.history.replaceState({}, '', newUrl);
};

export const TestDetailPanel: React.FC<TestDetailPanelProps> = ({ test, isOpen, onClose }) => {
  // Initialiser l'onglet actif depuis l'URL ou par défaut 'overview'
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tabFromUrl = getQueryParam('detailTab');
    const validTabs: TabType[] = ['overview', 'steps', 'attachments', 'errors', 'timeline', 'retries'];
    return validTabs.includes(tabFromUrl as TabType) ? (tabFromUrl as TabType) : 'overview';
  });
  const [selectedAttachment, setSelectedAttachment] = useState<TestAttachment | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  // Synchroniser l'onglet avec l'URL quand le panneau s'ouvre/ferme
  useEffect(() => {
    if (isOpen && test) {
      // Garder l'onglet actuel dans l'URL
      setQueryParam('detailTab', activeTab);
    } else {
      // Supprimer l'onglet de détail de l'URL quand le panneau se ferme
      setQueryParam('detailTab', null);
    }
  }, [isOpen, test, activeTab]);

  // Réinitialiser la sélection d'attachments quand on change de test
  useEffect(() => {
    setSelectedAttachment(null);
    setExpandedSteps(new Set());
  }, [test?.id]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (isOpen && test) {
      setQueryParam('detailTab', tab);
    }
  };

  // Composant pour afficher le contexte de code
  const CodeSnippet: React.FC<{ step: TestStep }> = ({ step }) => {
    // Utiliser directement les données codeContext incluses dans l'étape
    if (!step.codeContext) return null;

    return (
      <div className="code-snippet">
        <div className="code-header">
          <span className="code-file">{step.codeContext.file.split('/').pop()}</span>
          <span className="code-line-number">Line {step.codeContext.targetLine}</span>
        </div>
        <div className="code-content">
          {step.codeContext.lines.map((line: any, index: number) => (
            <div 
              key={index} 
              className={`code-line ${line.isCurrent ? 'target-line' : ''}`}
            >
              <span className="line-number">{line.number}</span>
              <span className="line-content">{line.content || ' '}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const renderStep = (step: TestStep, index: number, level: number = 0): React.ReactNode => {
    const isExpanded = expandedSteps.has(step.id);
    const hasChildren = step.steps && step.steps.length > 0;
    const isClickable = hasChildren;

    // Déterminer l'icône en fonction de la catégorie et du statut
    const getStepIcon = () => {
      if (step.error) return '✗';
      if (step.category === 'expect') return '✓';
      if (step.category === 'test.step') {
        // Si l'étape a des enfants, on ne met pas de flèche car il y en a déjà une pour l'expansion
        return hasChildren ? '📋' : '▶';
      }
      if (step.category === 'hook') return '⚙';
      if (step.category === 'fixture') return '🔧';
      if (step.category === 'pw:api') return '🎭';
      return '•';
    };

    const getStepColor = () => {
      if (step.error) return '#dc2626';
      if (step.category === 'expect') return '#059669';
      return '#6b7280';
    };

    return (
      <div key={step.id} className={`step-row level-${level} ${isExpanded ? 'expanded' : 'collapsed'} ${isClickable ? 'expandable' : 'leaf'} ${step.error ? 'has-error' : ''}`}>
        <div 
          className={`step-main ${isClickable ? 'clickable' : ''}`}
          onClick={isClickable ? () => toggleStep(step.id) : undefined}
        >
          <div className="step-expand-area">
            {isClickable && (
              <span className={`expand-arrow ${isExpanded ? 'expanded' : ''}`}>
                ▶
              </span>
            )}
          </div>
          <div className="step-icon" style={{ color: getStepColor() }}>
            {getStepIcon()}
          </div>
          <div className="step-content-area">
            <div className="step-title-line">
              <span className="step-title">{step.title}</span>
              <span className="step-duration">{formatDuration(step.duration)}</span>
            </div>
            {(step.error?.location || step.category === 'test.step') && (
              <div className="step-location">
                {step.error?.location ? (
                  <>
                    <span className="location-file">{step.error.location.file}</span>
                    <span className="location-separator">:</span>
                    <span className="location-line">{step.error.location.line}</span>
                  </>
                ) : test?.file ? (
                  <>
                    <span className="location-file">{test.file}</span>
                    <span className="location-separator">:</span>
                    <span className="location-line">{test.line || '?'}</span>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>
        
        {isExpanded && hasChildren && (
          <div className="step-children">
            {step.steps!.map((subStep, subIndex) => 
              renderStep(subStep, subIndex, level + 1)
            )}
          </div>
        )}

        {isExpanded && (step.location?.file && step.location?.line) && (
          <div className="step-code-section">
            <CodeSnippet step={step} />
          </div>
        )}
        
        {step.error && (
          <div className="step-error-details">
            <div 
              className="error-message" 
              dangerouslySetInnerHTML={{ __html: formatErrorMessage(step.error.message) }}
            />
            {step.error.stack && (
              <details className="error-stack">
                <summary>Stack Trace</summary>
                <pre dangerouslySetInnerHTML={{ __html: formatStackTrace(step.error.stack) }} />
              </details>
            )}
          </div>
        )}
      </div>
    );
  };

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

  // Fonction pour générer les couleurs de gélule de statut
  const getStatusPillColors = (status: string): { background: string; color: string; border: string } => {
    switch (status) {
      case 'passed': 
        return {
          background: '#DCFCE7', // Vert très clair
          color: '#15803D',       // Vert foncé pour le texte
          border: '#16A34A'       // Vert moyen pour la bordure
        };
      case 'failed': 
        return {
          background: '#FEE2E2', // Rouge très clair
          color: '#991B1B',       // Rouge foncé pour le texte
          border: '#DC2626'       // Rouge moyen pour la bordure
        };
      case 'skipped': 
        return {
          background: '#FEF3C7', // Orange très clair
          color: '#92400E',       // Orange foncé pour le texte
          border: '#D97706'       // Orange moyen pour la bordure
        };
      case 'timedOut': 
        return {
          background: '#FEF3C7', // Orange très clair
          color: '#7C2D12',       // Orange très foncé pour le texte
          border: '#DC2626'       // Rouge pour la bordure
        };
      case 'interrupted': 
        return {
          background: '#FED7AA', // Orange clair
          color: '#9A3412',       // Orange foncé pour le texte
          border: '#EA580C'       // Orange vif pour la bordure
        };
      default: 
        return {
          background: '#F1F5F9', // Gris très clair
          color: '#475569',       // Gris foncé pour le texte
          border: '#6B7280'       // Gris moyen pour la bordure
        };
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
            className="status-pill" 
            style={{
              backgroundColor: getStatusPillColors(test.status).background,
              color: getStatusPillColors(test.status).color,
              borderColor: getStatusPillColors(test.status).border
            }}
          >
            {test.status.toUpperCase()}
          </span>
        </div>
        <button onClick={onClose} className="close-button">
          ✕
        </button>
      </div>

      <div className="panel-tabs">
        <button
          onClick={() => handleTabChange('overview')}
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
        >
          Overview
        </button>
        <button
          onClick={() => handleTabChange('steps')}
          className={`tab ${activeTab === 'steps' ? 'active' : ''}`}
        >
          Test Steps {test.steps && test.steps.length > 0 && `(${test.steps.length})`}
        </button>
        <button
          onClick={() => handleTabChange('attachments')}
          className={`tab ${activeTab === 'attachments' ? 'active' : ''}`}
        >
          Attachments ({test.attachments.length})
        </button>
        {test.errors && test.errors.length > 0 && (
          <button
            onClick={() => handleTabChange('errors')}
            className={`tab ${activeTab === 'errors' ? 'active' : ''}`}
          >
            Errors ({test.errors.length})
          </button>
        )}
        <button
          onClick={() => handleTabChange('timeline')}
          className={`tab ${activeTab === 'timeline' ? 'active' : ''}`}
        >
          Timeline
        </button>
        {test.retryHistory && test.retryHistory.length > 0 && (
          <button
            onClick={() => handleTabChange('retries')}
            className={`tab ${activeTab === 'retries' ? 'active' : ''}`}
          >
            Retries ({test.retryHistory.length})
          </button>
        )}
      </div>

      <div className="panel-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="info-grid">
              <div className="info-item">
                <label>File:</label>
                <span className="file-path">{test.file}{test.line ? `:${test.line}` : ''}</span>
              </div>
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

            <div className="timing-section">
              <h3>Timing Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Started:</label>
                  <span>{formatDateTime(test.startTime)}</span>
                </div>
                <div className="info-item">
                  <label>Finished:</label>
                  <span>{formatDateTime(test.endTime)}</span>
                </div>
              </div>
            </div>

            {test.tags && test.tags.length > 0 && (
              <div className="tags-section">
                <h3>Tags</h3>
                <div className="tags-list">
                  {test.tags.map(tag => {
                    const tagColors = getTagColor(tag);
                    return (
                      <span 
                        key={tag} 
                        className="tag"
                        style={{
                          backgroundColor: tagColors.background,
                          color: tagColors.color,
                          borderColor: tagColors.border
                        }}
                      >
                        {tag}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {test.annotations && test.annotations.length > 0 && (
              <div className="annotations-section">
                <h3>Annotations</h3>
                <div className="annotations-list">
                  {test.annotations.map((annotation, index) => (
                    <div key={index} className="annotation-item">
                      <span className="annotation-type">{annotation.type}</span>
                      <span className="annotation-description">{annotation.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'steps' && (
          <div className="steps-tab">
            {!test.steps || test.steps.length === 0 ? (
              <div className="empty-state">
                <p>No test steps available.</p>
              </div>
            ) : (
              <div className="steps-content">
                <div className="steps-list">
                  {test.steps.map((step, index) => renderStep(step, index))}
                </div>
              </div>
            )}
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
              <>
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
                      <div 
                        className="error-message" 
                        dangerouslySetInnerHTML={{ __html: formatErrorMessage(error.message) }}
                      />
                      {error.stack && (
                        <details className="error-stack">
                          <summary>Stack Trace</summary>
                          <pre dangerouslySetInnerHTML={{ __html: formatStackTrace(error.stack) }} />
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </>
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
                  <p>Status: <span 
                    className="status-pill inline-status" 
                    style={{
                      backgroundColor: getStatusPillColors(test.status).background,
                      color: getStatusPillColors(test.status).color,
                      borderColor: getStatusPillColors(test.status).border
                    }}
                  >
                    {test.status.toUpperCase()}
                  </span></p>
                  <p>Duration: {formatDuration(test.duration)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'retries' && (
          <div className="retries-tab">
            <div className="retries-list">
              {test.retryHistory?.map((retry, index) => (
                <div key={index} className="retry-item">
                  <div className="retry-header">
                    <div className="retry-info">
                      <h4>
                        {index === 0 ? 'Initial Execution' : `Retry ${index}`}
                      </h4>
                      <span 
                        className="status-pill" 
                        style={{
                          backgroundColor: getStatusPillColors(retry.status).background,
                          color: getStatusPillColors(retry.status).color,
                          borderColor: getStatusPillColors(retry.status).border
                        }}
                      >
                        {retry.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="retry-duration">
                      {formatDuration(retry.duration)}
                    </div>
                  </div>
                  <div className="retry-details">
                    <div className="retry-meta">
                      <span><strong>Started:</strong> {formatDateTime(retry.startTime)}</span>
                      <span><strong>Ended:</strong> {formatDateTime(retry.endTime)}</span>
                    </div>
                    {retry.errors && retry.errors.length > 0 && (
                      <div className="retry-errors">
                        <h5>Errors:</h5>
                        {retry.errors.map((error, errorIndex) => (
                          <div key={errorIndex} className="error-message">
                            <div 
                              className="error-text" 
                              dangerouslySetInnerHTML={{ __html: formatErrorMessage(error.message) }}
                            />
                            {error.location && (
                              <div className="error-location">
                                {error.location.file}:{error.location.line}
                                {error.location.column && `:${error.location.column}`}
                              </div>
                            )}
                            {error.stack && (
                              <details className="error-stack">
                                <summary>Stack Trace</summary>
                                <pre dangerouslySetInnerHTML={{ __html: formatStackTrace(error.stack) }} />
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )) || (
                <div className="no-retries">
                  <p>This test was not retried.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};