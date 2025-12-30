import chalk from "chalk";

export type LogLevel = "debug" | "info" | "warn" | "error";

export class Logger {
    private static levelPriority: Record<LogLevel, number> = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3
    };

    constructor(private minLevel: LogLevel = "info") {}

    private format(level: LogLevel, msg: string) {
        const timestamp = new Date().toISOString();
        let label = `[${level.toUpperCase()}]`;

        switch (level) {
            case "debug":
                label = chalk.gray(label);
                break;
            case "info":
                label = chalk.blue(label);
                break;
            case "warn":
                label = chalk.yellow(label);
                break;
            case "error":
                label = chalk.red(label);
                break;
        }

        return `${chalk.dim(timestamp)} ${label} ${msg}`;
    }

    private shouldLog(level: LogLevel) {
        return Logger.levelPriority[level] >= Logger.levelPriority[this.minLevel];
    }

    debug(msg: string) {
        if (this.shouldLog("debug")) console.debug(this.format("debug", msg));
    }

    info(msg: string) {
        if (this.shouldLog("info")) console.log(this.format("info", msg));
    }

    warn(msg: string) {
        if (this.shouldLog("warn")) console.warn(this.format("warn", msg));
    }

    error(msg: string) {
        if (this.shouldLog("error")) console.error(this.format("error", msg));
    }
}

// domyślny singleton
export const log = new Logger();
