// Point d'entrée principal de la librairie
export { PlaywrightCustomReporter } from "./reporter/html-generator";
export { DataCollector } from "./collector/data-collector";
export type { ReporterOptions } from "./collector/data-collector";
export * from "./types";

// Export par défaut pour faciliter l'utilisation
export { PlaywrightCustomReporter as default } from "./reporter/html-generator";
