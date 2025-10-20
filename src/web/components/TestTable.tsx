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

  // Extraire les valeurs uniques pour les filtres
  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(tests.map(test => test.status)));
  }, [tests]);

  const uniqueProjects = useMemo(() => {
    return Array.from(new Set(tests.map(test => test.project)));
  }, [tests]);

  const uniqueTags = useMemo(() => {
    const allTags = tests.flatMap(test => test.tags);
    return Array.from(new Set(allTags)).sort();
  }, [tests]);

  const maxDuration = useMemo(() => {
    return Math.max(...tests.map(test => test.duration), 0);
  }, [tests]);

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
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`filter-toggle ${showFilters ? 'active' : ''}`}
          >
            🔍 Filters ({Object.values(filters).flat().filter(v => v && v !== 0 && v !== Number.MAX_SAFE_INTEGER).length})
          </button>
          <div className="results-count">
            {filteredAndSortedTests.length} of {tests.length} tests
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
            {filteredAndSortedTests.map(test => (
              <tr
                key={test.id}
                onClick={() => onTestSelect(test)}
                className={`test-row ${selectedTestId === test.id ? 'selected' : ''} status-${test.status}`}
              >
                <td className="status-cell">
                  <span className="status-badge" style={{ color: getStatusColor(test.status) }}>
                    {getStatusIcon(test.status)} {test.status}
                  </span>
                </td>
                <td className="test-title">
                  <div className="title-content">
                    <span className="title-text">{test.title}</span>
                    {test.line && <span className="line-number">:{test.line}</span>}
                  </div>
                </td>
                <td className="file-cell">
                  <span className="file-path" title={test.file}>
                    {test.file.split('/').pop()}
                  </span>
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
                    {test.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                    {test.tags.length > 3 && (
                      <span className="tag-more">+{test.tags.length - 3}</span>
                    )}
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
    </div>
  );
};