export type Levels = number;
export namespace Levels {
    let TRACE: number;
    let DEBUG: number;
    let INFO: number;
    let WARNING: number;
    let ERROR: number;
    let CRITICAL: number;
    let NONE: number;
}
export class Logger {
    mask: number;
    /**
     * Add all log levels starting at level.
     * @param {number} baseLevel level to start from.
     */
    addFrom(baseLevel: number): void;
    /**
     * Adds a log level to react to.
     * @param {number} level the level to react to.
     */
    add(level: number): void;
    /**
     *  Ignores a log level.
     * @param {number} level the level to ignore.
     */
    ignore(level: number): void;
    /**
     * Attempts to log a message.
     * Only iff levelName is a valid log level
     * and the corresponding number if part of mask,
     * the message gets logged.
     * @param {Levels} levelName name of the log level.
     * @param {string} message message to log.
     */
    _log(levelName: Levels, message: string): void;
}
