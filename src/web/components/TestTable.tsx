import React, { useState, useMemo, useEffect } from 'react';
import { TestExecutionData } from '../../types';
import { TestFilters } from '../App';

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

interface TestTableProps {
  tests: TestExecutionData[];
  onTestSelect: (test: TestExecutionData) => void;
  selectedTestId?: string;
  filters: Partial<TestFilters>;
  onFiltersChange: (filters: Partial<TestFilters>) => void;
}

type SortField = 'title' | 'status' | 'duration' | 'file' | 'project';
type SortDirection = 'asc' | 'desc';

export const TestTable: React.FC<TestTableProps> = ({ tests, onTestSelect, selectedTestId, filters: externalFilters, onFiltersChange }) => {
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showAllTags, setShowAllTags] = useState(false);
  // État local des filtres initialisé avec les filtres externes
  const [filters, setFilters] = useState<Partial<TestFilters>>(() => ({
    status: [],
    project: [],
    tags: [],
    minDuration: 0,
    maxDuration: Number.MAX_SAFE_INTEGER,
    search: '',
    ...externalFilters
  }));
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Synchroniser les filtres externes avec l'état local
  useEffect(() => {
    setFilters(prev => ({
      status: [],
      project: [],
      tags: [],
      minDuration: 0,
      maxDuration: Number.MAX_SAFE_INTEGER,
      search: '',
      ...prev,
      ...externalFilters
    }));
  }, [externalFilters]);

  // Extraire les valeurs uniques pour les filtres
  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(tests.map(test => test.status)));
  }, [tests]);

  const uniqueProjects = useMemo(() => {
    return Array.from(new Set(tests.map(test => test.project)));
  }, [tests]);

  const uniqueTags = useMemo(() => {
    const allTags = tests.flatMap(test => test.tags);
    const projects = new Set(tests.map(test => test.project));
    const filteredTags = allTags.filter(tag => !projects.has(tag));
    return Array.from(new Set(filteredTags)).sort();
  }, [tests]);

  const maxDuration = useMemo(() => {
    return Math.max(...tests.map(test => test.duration), 0);
  }, [tests]);

  // Plus de regroupement - logique supprimée pour simplifier

  // Filtrer et trier les tests
  const filteredAndSortedTests = useMemo(() => {
    let filtered = tests.filter(test => {
      // Filtre par statut
      if (filters.status && filters.status.length > 0 && !filters.status.includes(test.status)) {
        return false;
      }

      // Filtre par projet
      if (filters.project && filters.project.length > 0 && !filters.project.includes(test.project)) {
        return false;
      }

      // Filtre par tags
      if (filters.tags && filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some((tag: string) => test.tags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      // Filtre par durée
      const minDuration = filters.minDuration || 0;
      const maxDuration = filters.maxDuration || Number.MAX_SAFE_INTEGER;
      if (test.duration < minDuration || test.duration > maxDuration) {
        return false;
      }

      // Filtre par recherche
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesTitle = test.title.toLowerCase().includes(searchLower);
        const matchesFile = test.file.toLowerCase().includes(searchLower);
        if (!matchesTitle && !matchesFile) return false;
      }

      return true;
    });

    // Tri
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'duration') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      } else {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [tests, filters, sortField, sortDirection]);

  // Pagination simple
  const paginatedTests = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedTests.slice(startIndex, endIndex);
  }, [filteredAndSortedTests, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedTests.length / pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleFilterChange = (key: keyof TestFilters, value: any) => {
    let newFilters = {
      ...filters,
      [key]: value
    };

    // Validation pour les durées min/max
    if (key === 'minDuration') {
      const currentMax = newFilters.maxDuration === Number.MAX_SAFE_INTEGER || newFilters.maxDuration === undefined ? maxDuration : newFilters.maxDuration;
      if (currentMax !== undefined && value > currentMax) {
        newFilters.maxDuration = value;
      }
    } else if (key === 'maxDuration') {
      const currentMin = newFilters.minDuration || 0;
      if (value < currentMin) {
        newFilters.minDuration = value;
      }
    }

    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const toggleFilter = (key: 'status' | 'project' | 'tags', value: string) => {
    const currentArray = (filters[key] as string[]) || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    const newFilters = {
      ...filters,
      [key]: newArray
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const newFilters: Partial<TestFilters> = {
      status: [],
      project: [],
      tags: [],
      minDuration: 0,
      maxDuration: Number.MAX_SAFE_INTEGER,
      search: ''
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  // Fonctions de regroupement supprimées

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset à la première page
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'skipped': return '⏭️';
      case 'timedOut': return '⏰';
      case 'interrupted': return '⚠️';
      default: return '❓';
    }
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

  return (
    <div className="test-table-container">
      <div className="table-header">
        <div className="table-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search tests..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="search-input"
            />
          </div>
          <div className="results-count">
            {filteredAndSortedTests.length} of {tests.length} tests
          </div>
          <div className="pagination-info">
            Page {currentPage} of {totalPages}
          </div>
        </div>

        {/* Barre de filtres compacte toujours visible */}
        <div className="filters-bar">
          {/* Filtres Status */}
          <div className="filter-group">
            <label className="filter-label">Status:</label>
            <div className="filter-chips">
              {uniqueStatuses.map(status => (
                <button
                  key={status}
                  onClick={() => toggleFilter('status', status)}
                  className={`filter-chip status-chip ${(filters.status || []).includes(status) ? 'active' : ''}`}
                  style={{
                    backgroundColor: (filters.status || []).includes(status) 
                      ? getStatusPillColors(status).background 
                      : 'transparent',
                    color: (filters.status || []).includes(status) 
                      ? getStatusPillColors(status).color 
                      : 'var(--text-secondary)',
                    borderColor: getStatusPillColors(status).border
                  }}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Filtres Project */}
          {uniqueProjects.length > 1 && (
            <div className="filter-group">
              <label className="filter-label">Project:</label>
              <div className="filter-chips">
                {uniqueProjects.map(project => (
                  <button
                    key={project}
                    onClick={() => toggleFilter('project', project)}
                    className={`filter-chip ${(filters.project || []).includes(project) ? 'active' : ''}`}
                  >
                    {project}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filtres Tags */}
          {uniqueTags.length > 0 && (
            <div className="filter-group">
              <label className="filter-label">Tags:</label>
              <div className="filter-chips">
                {(showAllTags ? uniqueTags : uniqueTags.slice(0, 8)).map(tag => {
                  const tagColors = getTagColor(tag);
                  const isActive = (filters.tags || []).includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleFilter('tags', tag)}
                      className={`filter-chip tag-chip ${isActive ? 'active' : ''}`}
                      style={{
                        backgroundColor: isActive ? tagColors.background : 'transparent',
                        color: isActive ? tagColors.color : 'var(--text-secondary)',
                        borderColor: tagColors.border
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
                {uniqueTags.length > 8 && (
                  <button
                    onClick={() => setShowAllTags(!showAllTags)}
                    className="filter-chip more-tags-button"
                    title={showAllTags ? "Masquer les tags supplémentaires" : "Afficher tous les tags"}
                  >
                    {showAllTags ? '- Moins' : `+ ${uniqueTags.length - 8} more`}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Filtre Duration compact */}
          <div className="filter-group duration-group">
            <label className="filter-label">Duration:</label>
            <div className="duration-filter-compact">
              <div className="duration-range-slider">
                <div className="range-slider-container">
                  <input
                    type="range"
                    min="0"
                    max={maxDuration}
                    value={filters.minDuration || 0}
                    onChange={(e) => handleFilterChange('minDuration', Number(e.target.value))}
                    className="range-slider range-slider-min"
                  />
                  <input
                    type="range"
                    min="0"
                    max={maxDuration}
                    value={(filters.maxDuration === undefined || filters.maxDuration === Number.MAX_SAFE_INTEGER) ? maxDuration : filters.maxDuration}
                    onChange={(e) => handleFilterChange('maxDuration', Number(e.target.value))}
                    className="range-slider range-slider-max"
                  />
                </div>
                <div className="range-values">
                  <span className="range-value-min">
                    {formatDuration(filters.minDuration || 0)}
                  </span>
                  <span className="range-separator">-</span>
                  <span className="range-value-max">
                    {formatDuration((filters.maxDuration === undefined || filters.maxDuration === Number.MAX_SAFE_INTEGER) ? maxDuration : filters.maxDuration)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="filter-group">
            <button onClick={clearFilters} className="clear-filters-compact" title="Clear all filters">
              ✕
            </button>
          </div>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="test-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('status')} className="sortable">
                Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('title')} className="sortable">
                Test Name {sortField === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('file')} className="sortable">
                File {sortField === 'file' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('duration')} className="sortable">
                Duration {sortField === 'duration' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th>Tags</th>
              <th>Retries</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTests.map(test => (
              <tr
                key={test.id}
                onClick={() => onTestSelect(test)}
                className={`test-row ${selectedTestId === test.id ? 'selected' : ''} status-${test.status}`}
              >
                <td className="status-cell">
                  <span 
                    className="status-pill"
                    style={{
                      backgroundColor: getStatusPillColors(test.status).background,
                      color: getStatusPillColors(test.status).color,
                      borderColor: getStatusPillColors(test.status).border
                    }}
                  >
                    {test.status.toUpperCase()}
                    {test.isFlaky && <span className="flaky-badge">⚠️</span>}
                  </span>
                </td>
                <td className="test-title">
                  <div className="test-info">
                    <div className="test-name">
                      {test.describeBlocks.length > 0 && (
                        <>
                          {test.describeBlocks
                            .filter(block => !block.includes('chromium') && !block.includes('firefox') && !block.includes('webkit'))
                            .map((block, index, filteredArray) => (
                              <span key={index} className="describe-block">
                                {block}
                                {index < filteredArray.length - 1 && ' > '}
                              </span>
                            ))}
                          {test.describeBlocks.filter(block => !block.includes('chromium') && !block.includes('firefox') && !block.includes('webkit')).length > 0 && ' > '}
                        </>
                      )}
                      <span className="title-text">{test.title}</span>
                    </div>
                  </div>
                </td>
                <td className="file-cell">
                  <div className="file-info">
                    <span className="file-path" title={test.file}>
                      {test.file.split('/').pop()}
                    </span>
                    {test.line && <span className="line-number">:{test.line}</span>}
                  </div>
                </td>
                <td className="duration-cell">
                  <span className={`test-duration ${test.duration > 10000 ? 'long' : ''}`}>
                    {formatDuration(test.duration)}
                  </span>
                </td>
                <td className="tags-cell">
                  <div 
                    className="tags-container"
                    title={(() => {
                      const filteredTags = test.tags.filter(tag => !uniqueProjects.includes(tag));
                      return filteredTags.length > 2 ? filteredTags.join(', ') : '';
                    })()}
                  >
                    {(() => {
                      const filteredTags = test.tags.filter(tag => !uniqueProjects.includes(tag));
                      return (
                        <>
                          {filteredTags.slice(0, 2).map(tag => {
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
                          {filteredTags.length > 2 && (
                            <span className="tag-more">+{filteredTags.length - 2}</span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </td>
                <td className="retries-cell">
                  {test.retries > 0 && (
                    <span className="test-retries">{test.retries}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredAndSortedTests.length === 0 && (
          <div className="empty-state">
            <p>No tests match the current filters.</p>
            <button onClick={clearFilters} className="clear-filters">
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination-controls">
          <div className="pagination-info-detail">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredAndSortedTests.length)} of {filteredAndSortedTests.length} tests
          </div>
          
          <div className="pagination-size">
            <label>Tests per page:</label>
            <select 
              value={pageSize} 
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="page-size-select"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>

          <div className="pagination-buttons">
            <button 
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="pagination-button"
            >
              ⏮️ First
            </button>
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="pagination-button"
            >
              ◀️ Previous
            </button>
            
            <div className="page-numbers">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`page-number ${currentPage === pageNum ? 'active' : ''}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="pagination-button"
            >
              ▶️ Next
            </button>
            <button 
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="pagination-button"
            >
              ⏭️ Last
            </button>
          </div>
        </div>
      )}
    </div>
  );
};