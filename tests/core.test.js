const test = require("node:test");
const assert = require("node:assert/strict");

const { isValidTabId, selectTargetTab } = require("../core.js");

test("selectTargetTab returns the first tab with a valid id", () => {
    const tab = selectTargetTab([
        { id: null, url: "https://colab.research.google.com/" },
        { id: 42, url: "https://colab.research.google.com/" },
        { id: 99, url: "https://colab.research.google.com/" }
    ]);

    assert.equal(tab.id, 42);
});

test("selectTargetTab returns null when no tab is available", () => {
    assert.equal(selectTargetTab([]), null);
    assert.equal(selectTargetTab(undefined), null);
    assert.equal(selectTargetTab([{ id: -1 }]), null);
});

test("isValidTabId rejects invalid browser tab ids", () => {
    assert.equal(isValidTabId(0), true);
    assert.equal(isValidTabId(12), true);
    assert.equal(isValidTabId(-1), false);
    assert.equal(isValidTabId("12"), false);
    assert.equal(isValidTabId(null), false);
});
