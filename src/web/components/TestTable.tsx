import React, { useState, useMemo } from 'react';
import { TestExecutionData } from '../../types';

interface TestTableProps {
  tests: TestExecutionData[];
  onTestSelect: (test: TestExecutionData) => void;
  selectedTestId?: string;
}

type SortField = 'title' | 'status' | 'duration' | 'file' | 'project';
type SortDirection = 'asc' | 'desc';

interface FilterState {
  status: string[];
  project: string[];
  tags: string[];
  minDuration: number;
  maxDuration: number;
  search: string;
}

export const TestTable: React.FC<TestTableProps> = ({ tests, onTestSelect, selectedTestId }) => {
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filters, setFilters] = useState<FilterState>({
    status: [],
    project: [],
    tags: [],
    minDuration: 0,
    maxDuration: Number.MAX_SAFE_INTEGER,
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

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
      if (filters.status.length > 0 && !filters.status.includes(test.status)) {
        return false;
      }

      // Filtre par projet
      if (filters.project.length > 0 && !filters.project.includes(test.project)) {
        return false;
      }

      // Filtre par tags
      if (filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(tag => test.tags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      // Filtre par durée
      if (test.duration < filters.minDuration || test.duration > filters.maxDuration) {
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

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const toggleFilter = (key: 'status' | 'project' | 'tags', value: string) => {
    setFilters(prev => {
      const currentArray = prev[key] as string[];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      
      return {
        ...prev,
        [key]: newArray
      };
    });
  };

  const clearFilters = () => {
    setFilters({
      status: [],
      project: [],
      tags: [],
      minDuration: 0,
      maxDuration: Number.MAX_SAFE_INTEGER,
      search: ''
    });
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

  return (
    <div className="test-table-container">
      <div className="table-header">
        <div className="table-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search tests..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="search-input"
            />
          </div>
          {/* Contrôles de vue supprimés pour simplifier */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`filter-toggle ${showFilters ? 'active' : ''}`}
          >
            🔍 Filters ({Object.values(filters).flat().filter(v => v && v !== 0 && v !== Number.MAX_SAFE_INTEGER).length})
          </button>
          <div className="results-count">
            {filteredAndSortedTests.length} of {tests.length} tests
          </div>
          <div className="pagination-info">
            Page {currentPage} of {totalPages}
          </div>
        </div>

        {showFilters && (
          <div className="filters-panel">
            <div className="filter-section">
              <h4>Status</h4>
              <div className="filter-options">
                {uniqueStatuses.map(status => (
                  <label key={status} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={filters.status.includes(status)}
                      onChange={() => toggleFilter('status', status)}
                    />
                    <span style={{ color: getStatusColor(status) }}>
                      {getStatusIcon(status)} {status}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-section">
              <h4>Project</h4>
              <div className="filter-options">
                {uniqueProjects.map(project => (
                  <label key={project} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={filters.project.includes(project)}
                      onChange={() => toggleFilter('project', project)}
                    />
                    <span>{project}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-section">
              <h4>Tags</h4>
              <div className="filter-options tags-filter">
                {uniqueTags.map(tag => (
                  <label key={tag} className="filter-checkbox tag-item">
                    <input
                      type="checkbox"
                      checked={filters.tags.includes(tag)}
                      onChange={() => toggleFilter('tags', tag)}
                    />
                    <span className="tag">{tag}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-section">
              <h4>Duration</h4>
              <div className="duration-filter">
                <input
                  type="range"
                  min="0"
                  max={maxDuration}
                  value={filters.maxDuration === Number.MAX_SAFE_INTEGER ? maxDuration : filters.maxDuration}
                  onChange={(e) => handleFilterChange('maxDuration', Number(e.target.value))}
                  className="duration-slider"
                />
                <div className="duration-labels">
                  <span>0ms</span>
                  <span>Max: {formatDuration(filters.maxDuration === Number.MAX_SAFE_INTEGER ? maxDuration : filters.maxDuration)}</span>
                </div>
              </div>
            </div>

            <div className="filter-actions">
              <button onClick={clearFilters} className="clear-filters">
                Clear All Filters
              </button>
            </div>
          </div>
        )}
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
              <th onClick={() => handleSort('project')} className="sortable">
                Project {sortField === 'project' && (sortDirection === 'asc' ? '↑' : '↓')}
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
                  <span className="status-badge" style={{ color: getStatusColor(test.status) }}>
                    {getStatusIcon(test.status)} {test.status}
                    {test.isFlaky && <span className="flaky-badge">⚠️</span>}
                  </span>
                </td>
                <td className="test-title">
                  <div className="title-content">
                    <span className="full-title">
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
                    </span>
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
                  <span className={`duration ${test.duration > 10000 ? 'slow' : test.duration > 5000 ? 'medium' : 'fast'}`}>
                    {formatDuration(test.duration)}
                  </span>
                </td>
                <td className="project-cell">
                  <span className="project-badge">{test.project}</span>
                </td>
                <td className="tags-cell">
                  <div className="tags-container">
                    {(() => {
                      const filteredTags = test.tags.filter(tag => !uniqueProjects.includes(tag));
                      return (
                        <>
                          {filteredTags.slice(0, 3).map(tag => (
                            <span key={tag} className="tag">{tag}</span>
                          ))}
                          {filteredTags.length > 3 && (
                            <span className="tag-more">+{filteredTags.length - 3}</span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </td>
                <td className="retries-cell">
                  {test.retries > 0 && (
                    <span className="retry-badge">{test.retries}</span>
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