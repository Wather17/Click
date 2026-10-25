const test = require("node:test");
const assert = require("node:assert/strict");

const {
    isValidTabId,
    selectTargetTab,
    normalizeInterval,
    isValidInterval,
    isValidMonitoringState,
    alarmMatchesInterval
} = require("../core.js");

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

test("normalizeInterval accepts only integer minutes from 1 through 60", () => {
    assert.equal(normalizeInterval("1"), 1);
    assert.equal(normalizeInterval(60), 60);
    assert.equal(normalizeInterval(""), null);
    assert.equal(normalizeInterval("1.5"), null);
    assert.equal(normalizeInterval(0), null);
    assert.equal(normalizeInterval(61), null);
    assert.equal(normalizeInterval("five"), null);
});

test("isValidInterval mirrors the supported interval range", () => {
    assert.equal(isValidInterval(1), true);
    assert.equal(isValidInterval(60), true);
    assert.equal(isValidInterval(0), false);
    assert.equal(isValidInterval(61), false);
});

test("isValidMonitoringState requires a running state, interval and target tab", () => {
    assert.equal(isValidMonitoringState({
        isRunning: true,
        intervalMinutes: 5,
        targetTabId: 12
    }), true);
    assert.equal(isValidMonitoringState({
        isRunning: false,
        intervalMinutes: 5,
        targetTabId: 12
    }), false);
    assert.equal(isValidMonitoringState({
        isRunning: true,
        intervalMinutes: 0,
        targetTabId: 12
    }), false);
    assert.equal(isValidMonitoringState({
        isRunning: true,
        intervalMinutes: 5,
        targetTabId: null
    }), false);
});

test("alarmMatchesInterval detects missing and mismatched alarms", () => {
    assert.equal(alarmMatchesInterval({ periodInMinutes: 5 }, 5), true);
    assert.equal(alarmMatchesInterval({ periodInMinutes: 10 }, 5), false);
    assert.equal(alarmMatchesInterval(null, 5), false);
});
