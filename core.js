(function (root, factory) {
    const api = factory();

    if (typeof module === "object" && module.exports) {
        module.exports = api;
    }

    if (root) {
        Object.assign(root, api);
    }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    const DEFAULT_INTERVAL_MINUTES = 5;
    const MIN_INTERVAL_MINUTES = 1;
    const MAX_INTERVAL_MINUTES = 60;

    function isValidTabId(tabId) {
        return Number.isInteger(tabId) && tabId >= 0;
    }

    function selectTargetTab(tabs) {
        if (!Array.isArray(tabs)) {
            return null;
        }

        return tabs.find((tab) => tab && isValidTabId(tab.id)) || null;
    }

    function normalizeInterval(value) {
        if (typeof value === "string" && value.trim() === "") {
            return null;
        }

        const interval = Number(value);
        if (!Number.isInteger(interval)) {
            return null;
        }

        if (interval < MIN_INTERVAL_MINUTES || interval > MAX_INTERVAL_MINUTES) {
            return null;
        }

        return interval;
    }

    function isValidInterval(value) {
        return normalizeInterval(value) !== null;
    }

    function isValidMonitoringState(state) {
        return Boolean(
            state &&
            state.isRunning &&
            isValidInterval(state.intervalMinutes) &&
            isValidTabId(state.targetTabId)
        );
    }

    function alarmMatchesInterval(alarm, interval) {
        return Boolean(
            alarm &&
            isValidInterval(interval) &&
            alarm.periodInMinutes === interval
        );
    }

    return {
        DEFAULT_INTERVAL_MINUTES,
        MIN_INTERVAL_MINUTES,
        MAX_INTERVAL_MINUTES,
        isValidTabId,
        selectTargetTab,
        normalizeInterval,
        isValidInterval,
        isValidMonitoringState,
        alarmMatchesInterval
    };
});
