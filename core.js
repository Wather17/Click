(function (root, factory) {
    const api = factory();

    if (typeof module === "object" && module.exports) {
        module.exports = api;
    }

    if (root) {
        Object.assign(root, api);
    }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    function isValidTabId(tabId) {
        return Number.isInteger(tabId) && tabId >= 0;
    }

    function selectTargetTab(tabs) {
        if (!Array.isArray(tabs)) {
            return null;
        }

        return tabs.find((tab) => tab && isValidTabId(tab.id)) || null;
    }

    return {
        isValidTabId,
        selectTargetTab
    };
});
