import { consola } from "consola";

export const rootLogger = consola.withTag("DSTR");

type Logger = typeof rootLogger;

const loggers = new Set<Logger>([rootLogger]);

export function createLogger(tag: string): Logger {
  const logger = rootLogger.withTag(tag);
  loggers.add(logger);
  return logger;
}

export function setConsolaLevel(level: number): void {
  for (const logger of loggers) {
    logger.level = level;
  }
}
