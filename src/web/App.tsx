import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { TestTable } from './components/TestTable';
import { TestDetailPanel } from './components/TestDetailPanel';
import { ThemeProvider, ThemeToggle } from './components/ThemeProvider';
import { ReportData, TestExecutionData } from '../types';
import './styles.css';

// Interface pour les filtres
export interface TestFilters {
  status: string[];
  project: string[];
  tags: string[];
  minDuration: number;
  maxDuration: number;
  search: string;
}

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

// Utilitaires pour gérer les filtres dans l'URL
const getFiltersFromUrl = (): Partial<TestFilters> => {
  const filters: Partial<TestFilters> = {};
  
  const status = getQueryParam('status');
  if (status) filters.status = status.split(',');
  
  const project = getQueryParam('project');
  if (project) filters.project = project.split(',');
  
  const tags = getQueryParam('tags');
  if (tags) filters.tags = tags.split(',');
  
  const search = getQueryParam('search');
  if (search) filters.search = search;
  
  const minDuration = getQueryParam('minDuration');
  if (minDuration) filters.minDuration = parseInt(minDuration, 10);
  
  const maxDuration = getQueryParam('maxDuration');
  if (maxDuration) filters.maxDuration = parseInt(maxDuration, 10);
  
  return filters;
};

const setFiltersInUrl = (filters: Partial<TestFilters>) => {
  if (filters.status?.length) {
    setQueryParam('status', filters.status.join(','));
  } else {
    setQueryParam('status', null);
  }
  
  if (filters.project?.length) {
    setQueryParam('project', filters.project.join(','));
  } else {
    setQueryParam('project', null);
  }
  
  if (filters.tags?.length) {
    setQueryParam('tags', filters.tags.join(','));
  } else {
    setQueryParam('tags', null);
  }
  
  if (filters.search) {
    setQueryParam('search', filters.search);
  } else {
    setQueryParam('search', null);
  }
  
  if (filters.minDuration !== undefined && filters.minDuration > 0) {
    setQueryParam('minDuration', filters.minDuration.toString());
  } else {
    setQueryParam('minDuration', null);
  }
  
  if (filters.maxDuration !== undefined && filters.maxDuration < Number.MAX_SAFE_INTEGER) {
    setQueryParam('maxDuration', filters.maxDuration.toString());
  } else {
    setQueryParam('maxDuration', null);
  }
};

const App: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [selectedTest, setSelectedTest] = useState<TestExecutionData | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Initialiser l'onglet actif depuis l'URL ou par défaut 'dashboard'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tests'>(() => {
    const tabFromUrl = getQueryParam('tab');
    return (tabFromUrl === 'tests' || tabFromUrl === 'dashboard') ? tabFromUrl : 'dashboard';
  });
  // État des filtres pour le tableau des tests
  const [filters, setFilters] = useState<Partial<TestFilters>>({});

  useEffect(() => {
    loadReportData();
  }, []);

  // Charger l'état depuis l'URL une fois les données chargées
  useEffect(() => {
    if (reportData) {
      loadStateFromUrl();
    }
  }, [reportData]);

  const loadStateFromUrl = () => {
    const testId = getQueryParam('testId');
    
    // Charger les filtres depuis l'URL
    const urlFilters = getFiltersFromUrl();
    setFilters(urlFilters);
    
    if (testId) {
      // Trouver le test par ID
      const allTests = reportData!.suites.flatMap(suite => suite.tests);
      const test = allTests.find(t => t.id === testId);
      if (test) {
        setSelectedTest(test);
        setIsPanelOpen(true);
        // S'assurer qu'on est sur l'onglet tests si un test est sélectionné
        if (activeTab !== 'tests') {
          setActiveTab('tests');
          setQueryParam('tab', 'tests');
        }
      }
    }
  };

  const updateUrlState = (tab: 'dashboard' | 'tests', testId?: string | null) => {
    setQueryParam('tab', tab);
    setQueryParam('testId', testId || null);
  };

  // Nouvelle fonction pour naviguer vers les tests avec des filtres
  const navigateToTestsWithFilter = (filterType: keyof TestFilters, filterValue: string | string[]) => {
    const newFilters: Partial<TestFilters> = {};
    
    if (filterType === 'status' || filterType === 'project' || filterType === 'tags') {
      if (Array.isArray(filterValue)) {
        newFilters[filterType] = filterValue;
      } else {
        newFilters[filterType] = [filterValue];
      }
    } else if (filterType === 'search') {
      newFilters[filterType] = Array.isArray(filterValue) ? filterValue[0] : filterValue;
    } else if (filterType === 'minDuration' || filterType === 'maxDuration') {
      const numValue = Array.isArray(filterValue) ? parseInt(filterValue[0], 10) : parseInt(filterValue, 10);
      if (!isNaN(numValue)) {
        newFilters[filterType] = numValue;
      }
    }
    
    // Appliquer les filtres dans l'URL
    setFiltersInUrl(newFilters);
    setFilters(newFilters);
    
    // Naviguer vers l'onglet tests
    setActiveTab('tests');
    setQueryParam('tab', 'tests');
    
    // Fermer le panel si ouvert
    if (isPanelOpen) {
      setSelectedTest(null);
      setIsPanelOpen(false);
      setQueryParam('testId', null);
    }
  };

  // Fonction pour mettre à jour les filtres depuis le TestTable
  const handleFiltersChange = (newFilters: Partial<TestFilters>) => {
    setFilters(newFilters);
    setFiltersInUrl(newFilters);
  };

  const loadReportData = async () => {
    try {
      setIsLoading(true);
      // Les données sont injectées dans le HTML par le générateur de rapport
      const dataElement = document.getElementById('report-data');
      if (dataElement && dataElement.textContent) {
        const data = JSON.parse(dataElement.textContent) as ReportData;
        // Convertir les dates string en objets Date
        data.metadata.startTime = new Date(data.metadata.startTime);
        data.metadata.endTime = new Date(data.metadata.endTime);
        data.suites.forEach(suite => {
          suite.tests.forEach(test => {
            test.startTime = new Date(test.startTime);
            test.endTime = new Date(test.endTime);
          });
        });
        setReportData(data);
      } else {
        throw new Error('No report data found');
      }
    } catch (err) {
      setError(`Failed to load report data: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestSelect = (test: TestExecutionData) => {
    setSelectedTest(test);
    setIsPanelOpen(true);
    updateUrlState('tests', test.id);
  };

  const handlePanelClose = () => {
    setIsPanelOpen(false);
    setSelectedTest(null);
    updateUrlState(activeTab, null);
  };

  const handleTabChange = (tab: 'dashboard' | 'tests') => {
    setActiveTab(tab);
    // Si on change d'onglet et qu'un test est sélectionné, on garde le test seulement sur l'onglet tests
    if (tab === 'dashboard' && selectedTest) {
      setSelectedTest(null);
      setIsPanelOpen(false);
      updateUrlState(tab, null);
    } else {
      updateUrlState(tab, selectedTest?.id);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading test report...</p>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="error-screen">
        <div className="error-icon">❌</div>
        <h2>Failed to Load Report</h2>
        <p>{error || 'No report data available'}</p>
        <button onClick={loadReportData} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  const allTests = reportData.suites.flatMap(suite => suite.tests);

  return (
    <div className={`app ${isPanelOpen ? 'panel-open' : ''}`}>
      <header className="app-header">
        <div className="header-content">
          <h1>{reportData.config.title || 'Playwright Test Report'}</h1>
          <div className="header-actions">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="main-content">
          <div className="main-tabs">
            <button
              onClick={() => handleTabChange('dashboard')}
              className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => handleTabChange('tests')}
              className={`tab-button ${activeTab === 'tests' ? 'active' : ''}`}
            >
              🧪 Tests ({allTests.length})
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'dashboard' && (
              <section className="dashboard-section">
                <Dashboard 
                  reportData={reportData} 
                  onNavigateToTests={navigateToTestsWithFilter}
                />
              </section>
            )}

            {activeTab === 'tests' && (
              <section className="table-section">
                <TestTable
                  tests={allTests}
                  onTestSelect={handleTestSelect}
                  selectedTestId={selectedTest?.id}
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                />
              </section>
            )}
          </div>
        </div>

        <TestDetailPanel
          test={selectedTest}
          isOpen={isPanelOpen}
          onClose={handlePanelClose}
        />
      </main>
    </div>
  );
};

const AppWithTheme: React.FC = () => (
  <ThemeProvider>
    <App />
  </ThemeProvider>
);

export default AppWithTheme;