export enum Levels {
    TRACE = 1,
    DEBUG = 2,
    INFO = 3,
    WARNING = 4,
    ERROR = 8,
    CRITICAL = 16,
    NONE = 32
}

export class Logger {
    private mask: number;

    public constructor();

    /**
     * Add all log levels starting at level.
     * @param level level to start from.
     */
    public addFrom(level: number): void;

    /**
     * Adds a log level to react to.
     * @param level the level to react to. 
     */
    public add(level: number): void;

    /**
     *  Ignores a log level.
     * @param level the level to ignore.
     */
    public ignore(level: number): void;

    /**
     * Attempts to log a message.
     * Only iff levelName is a valid log level
     * and the corresponding number if part of mask,
     * the message gets logged.
     * @param levelName name of the log level.
     * @param message message to log.
     */
    private _log(levelName: Levels, message: string);

    public trace(message: string);
    public debug(message: string);
    public info(message: string);
    public warning(message: string);
    public error(message: string);
    public critical(message: string);
}