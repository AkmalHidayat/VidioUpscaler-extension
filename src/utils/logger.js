/**
 * @fileoverview Debug Logger utility for NextClarity
 * Provides color-coded, categorized console logging for easier debugging.
 * @version 2.8.7
 */

'use strict';

/**
 * Logger configuration
 * @const {Object}
 */
const LOGGER_CONFIG = Object.freeze({
    PREFIX: 'NextClarity',
    ENABLED: true,
    SHOW_TIMESTAMP: true,
    CATEGORIES: {
        CORE: { color: '#4ade80', icon: '⚡' },      // Green - main operations
        WEBGL: { color: '#60a5fa', icon: '🎮' },    // Blue - WebGL operations
        SHADER: { color: '#c084fc', icon: '✨' },   // Purple - shader operations
        CONFIG: { color: '#fbbf24', icon: '⚙️' },   // Yellow - config operations
        VIDEO: { color: '#f472b6', icon: '🎬' },    // Pink - video processing
        STORAGE: { color: '#2dd4bf', icon: '💾' },  // Teal - storage operations
        UI: { color: '#fb923c', icon: '🎨' },       // Orange - UI operations
        WORKER: { color: '#a78bfa', icon: '👷' },   // Violet - worker operations
        PERF: { color: '#f87171', icon: '📊' }      // Red - performance warnings
    }
});

/**
 * Debug Logger class
 * @class
 */
const Logger = {
    /**
     * Whether logging is enabled
     * @type {boolean}
     */
    enabled: LOGGER_CONFIG.ENABLED,

    /**
     * Formats a timestamp for log output
     * @returns {string} Formatted timestamp
     * @private
     */
    _getTimestamp() {
        if (!LOGGER_CONFIG.SHOW_TIMESTAMP) return '';
        const now = new Date();
        return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    },

    /**
     * Creates styled console arguments
     * @param {string} category - Log category
     * @param {string} message - Log message
     * @returns {Array} Console arguments with styles
     * @private
     */
    _formatLog(category, message) {
        const cat = LOGGER_CONFIG.CATEGORIES[category] || LOGGER_CONFIG.CATEGORIES.CORE;
        const timestamp = this._getTimestamp();
        const timeStr = timestamp ? `[${timestamp}]` : '';

        return [
            `%c${cat.icon} ${LOGGER_CONFIG.PREFIX}%c ${timeStr} %c[${category}]%c ${message}`,
            `color: ${cat.color}; font-weight: bold`,
            'color: #888',
            `color: ${cat.color}; font-weight: 600`,
            'color: inherit'
        ];
    },

    /**
     * Logs a message with category
     * @param {string} category - Log category (CORE, WEBGL, SHADER, CONFIG, VIDEO, STORAGE, UI, WORKER, PERF)
     * @param {string} message - Log message
     * @param {...any} args - Additional arguments to log
     */
    log(category, message, ...args) {
        if (!this.enabled) return;
        const formatted = this._formatLog(category, message);
        if (args.length > 0) {
            console.log(...formatted, ...args);
        } else {
            console.log(...formatted);
        }
    },

    /**
     * Logs a warning with category
     * @param {string} category - Log category
     * @param {string} message - Warning message
     * @param {...any} args - Additional arguments
     */
    warn(category, message, ...args) {
        if (!this.enabled) return;
        const formatted = this._formatLog(category, message);
        console.warn(...formatted, ...args);
    },

    /**
     * Logs an error with category
     * @param {string} category - Log category
     * @param {string} message - Error message
     * @param {...any} args - Additional arguments
     */
    error(category, message, ...args) {
        // Always show errors
        const formatted = this._formatLog(category, message);
        console.error(...formatted, ...args);
    },

    /**
     * Logs a success message
     * @param {string} category - Log category
     * @param {string} message - Success message
     */
    success(category, message) {
        if (!this.enabled) return;
        const cat = LOGGER_CONFIG.CATEGORIES[category] || LOGGER_CONFIG.CATEGORIES.CORE;
        const timestamp = this._getTimestamp();
        const timeStr = timestamp ? `[${timestamp}]` : '';

        console.log(
            `%c✓ ${LOGGER_CONFIG.PREFIX}%c ${timeStr} %c[${category}]%c ${message}`,
            `color: #22c55e; font-weight: bold`,
            'color: #888',
            `color: ${cat.color}; font-weight: 600`,
            'color: #22c55e'
        );
    },

    /**
     * Logs a grouped set of information
     * @param {string} category - Log category
     * @param {string} title - Group title
     * @param {Object} data - Data to display in group
     */
    group(category, title, data) {
        if (!this.enabled) return;
        const cat = LOGGER_CONFIG.CATEGORIES[category] || LOGGER_CONFIG.CATEGORIES.CORE;

        console.groupCollapsed(
            `%c${cat.icon} ${LOGGER_CONFIG.PREFIX}%c [${category}] ${title}`,
            `color: ${cat.color}; font-weight: bold`,
            `color: ${cat.color}`
        );

        if (typeof data === 'object') {
            Object.entries(data).forEach(([key, value]) => {
                console.log(`%c${key}:%c`, 'color: #888; font-weight: 600', 'color: inherit', value);
            });
        } else {
            console.log(data);
        }

        console.groupEnd();
    },

    /**
     * Logs a table of data
     * @param {string} category - Log category
     * @param {string} title - Table title
     * @param {Array|Object} data - Data to display as table
     */
    table(category, title, data) {
        if (!this.enabled) return;
        const formatted = this._formatLog(category, title);
        console.log(...formatted);
        console.table(data);
    },

    /**
     * Starts a performance timer
     * @param {string} label - Timer label
     */
    time(label) {
        if (!this.enabled) return;
        console.time(`⏱️ ${LOGGER_CONFIG.PREFIX} | ${label}`);
    },

    /**
     * Ends a performance timer
     * @param {string} label - Timer label
     */
    timeEnd(label) {
        if (!this.enabled) return;
        console.timeEnd(`⏱️ ${LOGGER_CONFIG.PREFIX} | ${label}`);
    },

    /**
     * Logs startup banner
     * @param {string} version - Extension version
     */
    banner(version) {
        console.log(
            `%c
╔═══════════════════════════════════════╗
║      ⚡ NextClarity v${version.padEnd(8)}      ║
║   Real-time Video Upscaling Engine    ║
╚═══════════════════════════════════════╝`,
            'color: #4ade80; font-weight: bold; font-family: monospace'
        );
    },

    /**
     * Logs system info
     * @param {Object} info - System info object
     */
    systemInfo(info) {
        console.log(
            '%c📋 System Info',
            'color: #4ade80; font-weight: bold; font-size: 12px'
        );
        console.table(info);
    }
};

// Make available on window for content scripts
if (typeof window !== 'undefined') {
    window.NCLogger = Logger;
}

// For worker context
if (typeof self !== 'undefined' && typeof window === 'undefined') {
    self.NCLogger = Logger;
}
