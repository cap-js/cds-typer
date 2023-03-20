const Levels = {
    TRACE: 1,
    DEBUG: 2,
    INFO: 3,
    WARNING: 4,
    ERROR: 8,
    CRITICAL: 16,
    NONE: 32,
}

class Logger {
    constructor() {
        this.mask = 0
        const lvls = Object.keys(Levels)
        for (let i = 0; i < lvls.length - 1; i++) {
            // -1 to ignore NONE
            const level = lvls[i]
            this[level.toLowerCase()] = function (message) {
                this._log(level, message)
            }.bind(this)
        }
    }

    addFrom(baseLevel) {
        const vals = Object.values(Levels)
        const highest = vals[vals.length - 1]
        for (let l = Math.log2(baseLevel); Math.pow(2, l) <= highest; l++) {
            this.add(Math.pow(2, l))
        }
    }

    add(level) {
        this.mask = this.mask | level
    }

    ignore(level) {
        this.mask = this.mask ^ level
    }

    _log(levelName, message) {
        const level = Levels[levelName]
        if (level && (this.mask & level) === level) {
            // eslint-disable-next-line no-console
            console.log(`[${levelName}]`, message)
        }
    }
}

module.exports = {
    Levels,
    Logger,
}
