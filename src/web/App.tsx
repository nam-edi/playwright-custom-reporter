import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { TestTable } from './components/TestTable';
import { TestDetailPanel } from './components/TestDetailPanel';
import { ThemeProvider, ThemeToggle } from './components/ThemeProvider';
import { ReportData, TestExecutionData } from '../types';
import './styles.css';

const App: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [selectedTest, setSelectedTest] = useState<TestExecutionData | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReportData();
  }, []);

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
  };

  const handlePanelClose = () => {
    setIsPanelOpen(false);
    setSelectedTest(null);
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
          <section className="dashboard-section">
            <Dashboard reportData={reportData} />
          </section>

          <section className="table-section">
            <h2>Test Results</h2>
            <TestTable
              tests={allTests}
              onTestSelect={handleTestSelect}
              selectedTestId={selectedTest?.id}
            />
          </section>
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