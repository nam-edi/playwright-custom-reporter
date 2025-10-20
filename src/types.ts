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
  attachments: TestAttachment[];
  retries: number;
  workerIndex: number;
  project: string;
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

export interface TestSuiteData {
  id: string;
  title: string;
  file: string;
  tests: TestExecutionData[];
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
    playwrightVersion: string;
    projects: string[];
  };
  suites: TestSuiteData[];
  config: {
    outputDir: string;
    title?: string;
    attachmentsBaseURL?: string;
  };
}
