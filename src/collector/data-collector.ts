import {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import {
  ReportData,
  TestExecutionData,
  TestSuiteData,
  TestAttachment,
  TestAnnotation,
  TestStep,
  DescribeBlock,
} from "../types";
import * as fs from "fs";
import * as path from "path";

export interface ReporterOptions {
  outputDir?: string;
  title?: string;
  open?: "always" | "never" | "on-failure";
  attachmentsBaseURL?: string;
  name?: string;
  environment?: string;
  version?: string;
  user?: string;
}

export class DataCollector implements Reporter {
  private config: FullConfig = {} as FullConfig;
  private reportData: ReportData;
  protected options: ReporterOptions;
  private startTime: Date = new Date();
  private stepIdCounter: number = 0;

  constructor(options: ReporterOptions = {}) {
    this.options = {
      outputDir: "./custom-report",
      title: "Playwright Test Report",
      open: "never",
      ...options,
    };

    this.reportData = {
      metadata: {
        startTime: this.startTime,
        endTime: new Date(),
        duration: 0,
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        timedOut: 0,
        flaky: 0,
        playwrightVersion: "",
        projects: [],
        name: this.options.name,
        environment: this.options.environment,
        version: this.options.version,
        user: this.options.user,
      },
      suites: [],
      config: {
        outputDir: this.options.outputDir!,
        title: this.options.title,
        attachmentsBaseURL: this.options.attachmentsBaseURL,
      },
    };
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.config = config;
    this.startTime = new Date();
    this.reportData.metadata.startTime = this.startTime;
    this.reportData.metadata.playwrightVersion = config.version || "";
    this.reportData.metadata.projects = config.projects.map((p) => p.name);

    // Créer le répertoire de sortie s'il n'existe pas
    if (!fs.existsSync(this.options.outputDir!)) {
      fs.mkdirSync(this.options.outputDir!, { recursive: true });
    }

    this.collectSuiteData(suite);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const testData = this.createTestExecutionData(test, result);

    // Trouver la suite correspondante et ajouter le test
    const suiteData = this.findOrCreateSuite(test.parent);
    suiteData.tests.push(testData);

    // Mettre à jour les statistiques
    this.updateMetrics(result.status, testData.isFlaky);
  }

  onEnd(result: FullResult): void {
    this.reportData.metadata.endTime = new Date();
    this.reportData.metadata.duration =
      this.reportData.metadata.endTime.getTime() -
      this.reportData.metadata.startTime.getTime();

    // Calculer les durées des suites
    this.reportData.suites.forEach((suite) => {
      suite.duration = suite.tests.reduce(
        (sum, test) => sum + test.duration,
        0
      );
      suite.status = this.calculateSuiteStatus(suite.tests);
    });

    // Sauvegarder les données collectées
    this.saveReportData();
  }

  private collectSuiteData(suite: Suite): void {
    if (suite.allTests().length > 0) {
      const suiteData: TestSuiteData = {
        id: this.generateId(),
        title: suite.title || "Root Suite",
        file: suite.location?.file || "",
        tests: [],
        describes: [],
        duration: 0,
        status: "passed",
      };

      this.reportData.suites.push(suiteData);
    }

    // Traiter les sous-suites récursivement
    suite.suites.forEach((subSuite) => this.collectSuiteData(subSuite));
  }

  private createTestExecutionData(
    test: TestCase,
    result: TestResult
  ): TestExecutionData {
    const attachments = this.processAttachments(result.attachments);

    // Détecter si le test est flaky (a échoué puis réussi dans les retries)
    const isFlaky = result.retry > 0 && result.status === "passed";

    // Extraire la hiérarchie des describe blocks
    const describeBlocks = this.extractDescribeHierarchy(test);

    return {
      id: this.generateId(),
      title: test.title,
      file: test.location.file,
      line: test.location.line,
      status: result.status,
      duration: result.duration,
      startTime: new Date(result.startTime),
      endTime: new Date(result.startTime.getTime() + result.duration),
      errors: result.errors?.map((error) => ({
        message: error.message || "",
        stack: error.stack,
        location: error.location
          ? {
              file: error.location.file,
              line: error.location.line,
              column: error.location.column,
            }
          : undefined,
      })),
      tags: this.extractTags(test),
      annotations: this.extractAnnotations(test),
      steps: this.extractSteps(result),
      attachments,
      retries: result.retry,
      workerIndex: result.workerIndex,
      project: test.parent.project()?.name || "default",
      isFlaky,
      describeBlocks,
    };
  }

  private processAttachments(attachments: any[]): TestAttachment[] {
    return attachments.map((attachment) => {
      const attachmentData: TestAttachment = {
        name: attachment.name,
        contentType: attachment.contentType,
        type: this.determineAttachmentType(
          attachment.name,
          attachment.contentType
        ),
      };

      if (attachment.path) {
        // Copier le fichier vers le répertoire de rapport avec un nom unique
        const originalFileName = path.basename(attachment.path);
        const fileExtension = path.extname(originalFileName);
        const baseName = path.basename(originalFileName, fileExtension);
        const uniqueId = `${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        const fileName = `${baseName}_${uniqueId}${fileExtension}`;
        const destPath = path.join(
          this.options.outputDir!,
          "attachments",
          fileName
        );

        // Créer le répertoire s'il n'existe pas
        const attachmentsDir = path.dirname(destPath);
        if (!fs.existsSync(attachmentsDir)) {
          fs.mkdirSync(attachmentsDir, { recursive: true });
        }

        try {
          fs.copyFileSync(attachment.path, destPath);
          attachmentData.path = path.relative(
            this.options.outputDir!,
            destPath
          );
        } catch (error) {
          console.warn(`Failed to copy attachment: ${attachment.path}`, error);
        }
      } else if (attachment.body) {
        // Pour les traces avec body (données embarquées), les sauvegarder comme fichiers
        if (attachmentData.type === "trace") {
          const uniqueId = `${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;
          const fileName = `${attachment.name.replace(
            /\.[^/.]+$/,
            ""
          )}_${uniqueId}.zip`;
          const destPath = path.join(
            this.options.outputDir!,
            "attachments",
            fileName
          );

          // Créer le répertoire s'il n'existe pas
          const attachmentsDir = path.dirname(destPath);
          if (!fs.existsSync(attachmentsDir)) {
            fs.mkdirSync(attachmentsDir, { recursive: true });
          }

          try {
            // Convertir le Buffer en fichier
            let buffer: Buffer;
            if (
              attachment.body &&
              typeof attachment.body === "object" &&
              attachment.body.type === "Buffer"
            ) {
              buffer = Buffer.from(attachment.body.data);
            } else {
              buffer = Buffer.from(attachment.body);
            }

            fs.writeFileSync(destPath, buffer);
            attachmentData.path = path.relative(
              this.options.outputDir!,
              destPath
            );
            // Ne pas inclure le body pour les traces sauvegardées
            delete attachmentData.body;
          } catch (error) {
            console.warn(
              `Failed to save trace attachment: ${attachment.name}`,
              error
            );
            // Fallback: garder le body si la sauvegarde échoue
            attachmentData.body = attachment.body;
          }
        } else {
          // Pour les autres types d'attachments, garder le body
          attachmentData.body = attachment.body;
        }
      }

      return attachmentData;
    });
  }

  private determineAttachmentType(
    name: string,
    contentType: string
  ): "video" | "screenshot" | "trace" | "other" {
    if (name.includes("video") || contentType.startsWith("video/")) {
      return "video";
    }
    if (name.includes("screenshot") || contentType.startsWith("image/")) {
      return "screenshot";
    }
    if (
      name.includes("trace") ||
      name.endsWith(".zip") ||
      name.includes("trace.zip") ||
      contentType.includes("application/zip") ||
      contentType.includes("trace")
    ) {
      return "trace";
    }
    return "other";
  }

  private extractTags(test: TestCase): string[] {
    const tags: string[] = [];
    const tagRegex = /@(\w+)/g;

    // Extraire les tags du titre du test
    let match;
    while ((match = tagRegex.exec(test.title)) !== null) {
      tags.push(match[1]);
    }

    // Parcourir la hiérarchie des suites parentes pour hériter des tags
    let current: Suite | undefined = test.parent;
    while (current && current.title) {
      // Réinitialiser la regex pour cette suite
      tagRegex.lastIndex = 0;
      while ((match = tagRegex.exec(current.title)) !== null) {
        // Ajouter seulement si le tag n'est pas déjà présent
        if (!tags.includes(match[1])) {
          tags.push(match[1]);
        }
      }
      current = current.parent;
    }

    return tags;
  }

  private extractAnnotations(test: TestCase): TestAnnotation[] {
    const annotations: TestAnnotation[] = [];

    // Les annotations Playwright sont stockées dans test.annotations
    if (test.annotations) {
      test.annotations.forEach((annotation) => {
        annotations.push({
          type: annotation.type || "info",
          description: annotation.description || "",
        });
      });
    }

    return annotations;
  }

  private extractSteps(result: TestResult): TestStep[] {
    const steps: TestStep[] = [];

    if (result.steps) {
      // Réinitialiser le compteur pour chaque test
      this.stepIdCounter = 0;
      result.steps.forEach((step, index) => {
        steps.push(this.convertStep(step, index, `test_${Date.now()}`));
      });
    }

    return steps;
  }

  private convertStep(
    step: any,
    index: number,
    testPrefix: string = ""
  ): TestStep {
    const uniqueId = `${testPrefix}_step_${++this.stepIdCounter}`;
    const result: TestStep = {
      id: uniqueId,
      title: step.title || step.titlePath?.join(" › ") || `Step ${index + 1}`,
      category: step.category || "action",
      startTime: step.startTime ? new Date(step.startTime) : new Date(),
      duration: step.duration || 0,
      location: step.location
        ? {
            file: step.location.file,
            line: step.location.line,
            column: step.location.column,
          }
        : undefined,
      error: step.error
        ? {
            message: step.error.message || "",
            stack: step.error.stack,
            location: step.error.location
              ? {
                  file: step.error.location.file,
                  line: step.error.location.line,
                  column: step.error.location.column,
                }
              : undefined,
          }
        : undefined,
      steps: step.steps
        ? step.steps.map((subStep: any, subIndex: number) =>
            this.convertStep(subStep, subIndex, testPrefix)
          )
        : undefined,
    };

    // Ajouter le contexte de code directement dans les données
    if (result.location?.file && result.location?.line) {
      const codeContext = this.extractCodeContext(
        result.location.file,
        result.location.line
      );
      if (codeContext) {
        result.codeContext = codeContext;
      }
    }

    return result;
  }

  private extractCodeContext(filePath: string, lineNumber: number) {
    try {
      // Vérifier que le fichier existe et est accessible
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      // Obtenir les 3 lignes (précédente, actuelle, suivante)
      const startLine = Math.max(0, lineNumber - 2); // -1 pour l'index, -1 pour ligne précédente
      const endLine = Math.min(lines.length, lineNumber + 1);

      const contextLines = [];
      for (let i = startLine; i < endLine; i++) {
        contextLines.push({
          number: i + 1,
          content: lines[i] || "",
          isCurrent: i + 1 === lineNumber,
        });
      }

      return {
        file: filePath,
        targetLine: lineNumber,
        lines: contextLines,
      };
    } catch (error) {
      console.warn(
        `Failed to extract code context for ${filePath}:${lineNumber}`,
        error
      );
      return null;
    }
  }

  private extractDescribeHierarchy(test: TestCase): string[] {
    const hierarchy: string[] = [];
    let current: Suite | undefined = test.parent;

    while (current && current.title) {
      hierarchy.unshift(current.title);
      current = current.parent;
    }

    // Filtrer les titres vides ou qui correspondent au nom du fichier
    return hierarchy.filter(
      (title) =>
        title &&
        title.trim() !== "" &&
        !title.endsWith(".spec.ts") &&
        !title.endsWith(".test.ts")
    );
  }

  private findOrCreateSuite(suite: Suite): TestSuiteData {
    let suiteData = this.reportData.suites.find(
      (s) => s.file === suite.location?.file
    );

    if (!suiteData) {
      suiteData = {
        id: this.generateId(),
        title: suite.title || "Unknown Suite",
        file: suite.location?.file || "",
        tests: [],
        describes: [],
        duration: 0,
        status: "passed",
      };
      this.reportData.suites.push(suiteData);
    }

    return suiteData;
  }

  private updateMetrics(status: string, isFlaky: boolean = false): void {
    this.reportData.metadata.totalTests++;

    if (isFlaky) {
      this.reportData.metadata.flaky++;
    }

    switch (status) {
      case "passed":
        this.reportData.metadata.passed++;
        break;
      case "failed":
        this.reportData.metadata.failed++;
        break;
      case "skipped":
        this.reportData.metadata.skipped++;
        break;
      case "timedOut":
        this.reportData.metadata.timedOut++;
        break;
    }
  }

  private calculateSuiteStatus(
    tests: TestExecutionData[]
  ): "passed" | "failed" | "skipped" {
    if (
      tests.some(
        (test) => test.status === "failed" || test.status === "timedOut"
      )
    ) {
      return "failed";
    }
    if (tests.every((test) => test.status === "skipped")) {
      return "skipped";
    }
    return "passed";
  }

  private saveReportData(): void {
    const dataPath = path.join(this.options.outputDir!, "report-data.json");
    try {
      fs.writeFileSync(dataPath, JSON.stringify(this.reportData, null, 2));
      console.log(`Report data saved to: ${dataPath}`);
    } catch (error) {
      console.error("Failed to save report data:", error);
    }
  }

  private generateId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getReportData(): ReportData {
    return this.reportData;
  }
}
