export * from "./utils/ansi-to-html";

export interface TestAnnotation {
  type: string;
  description: string;
}

export interface TestStep {
  id: string;
  title: string;
  category: string;
  startTime: Date;
  duration: number;
  error?: TestError;
  location?: {
    file: string;
    line: number;
    column?: number;
  };
  codeContext?: {
    file: string;
    targetLine: number;
    lines: Array<{
      number: number;
      content: string;
      isCurrent: boolean;
    }>;
  };
  steps?: TestStep[]; // Pour les étapes imbriquées
}

export interface TestRetryInfo {
  attempt: number;
  status: "passed" | "failed" | "skipped" | "timedOut" | "interrupted";
  duration: number;
  startTime: Date;
  endTime: Date;
  errors?: TestError[];
}

export interface TestExecutionData {
  id: string;
  title: string;
  file: string;
  line?: number;
  status: "passed" | "failed" | "skipped" | "timedOut" | "interrupted";
  duration: number;
  startTime: Date;
  endTime: Date;
  errors?: TestError[];
  tags: string[];
  annotations: TestAnnotation[];
  steps?: TestStep[];
  attachments: TestAttachment[];
  retries: number;
  workerIndex: number;
  project: string;
  isFlaky: boolean; // Test qui a échoué puis réussi lors des retries
  describeBlocks: string[]; // Hiérarchie des describe blocks
  retryHistory?: TestRetryInfo[]; // Historique de tous les essais
}

export interface TestError {
  message: string;
  stack?: string;
  location?: {
    file: string;
    line: number;
    column: number;
  };
}

export interface TestAttachment {
  name: string;
  contentType: string;
  path?: string;
  body?: Buffer;
  type: "video" | "screenshot" | "trace" | "other";
}

export interface DescribeBlock {
  id: string;
  title: string;
  file: string;
  line?: number;
  tests: TestExecutionData[];
  subDescribes: DescribeBlock[];
  duration: number;
  status: "passed" | "failed" | "skipped";
  isExpanded?: boolean; // Pour l'UI - par défaut plié sauf si contient des tests échoués
}

export interface TestSuiteData {
  id: string;
  title: string;
  file: string;
  tests: TestExecutionData[];
  describes: DescribeBlock[];
  duration: number;
  status: "passed" | "failed" | "skipped";
}

export interface ReportData {
  metadata: {
    startTime: Date;
    endTime: Date;
    duration: number;
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    timedOut: number;
    flaky: number; // Nombre de tests flaky
    playwrightVersion: string;
    projects: string[];
    // Informations optionnelles du projet
    name?: string;
    environment?: string;
    version?: string;
    user?: string;
  };
  suites: TestSuiteData[];
  config: {
    outputDir: string;
    title?: string;
    attachmentsBaseURL?: string;
  };
}
