const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const contentScript = fs.readFileSync(
    path.join(__dirname, "..", "content.js"),
    "utf8"
);

async function runContentScript({ activityTarget = null, connectTarget = null, reconnectEnabled = false } = {}) {
    const dispatchedEvents = [];
    const context = {
        document: {
            querySelector(selector) {
                return selector === "colab-connect-button" ? connectTarget : activityTarget;
            }
        },
        window: {},
        chrome: {
            storage: {
                local: {
                    get: async () => ({ reconnectEnabled })
                }
            }
        },
        MouseEvent: class MouseEvent {
            constructor(type, options) {
                this.type = type;
                this.options = options;
            }
        },
        console: {
            log() {},
            warn() {},
            error() {}
        }
    };

    if (activityTarget) {
        activityTarget.dispatchEvent = (event) => {
            dispatchedEvents.push(event);
        };
    }

    const result = await vm.runInNewContext(contentScript, context);
    return { result, dispatchedEvents };
}

test("content script reports target-not-found without a fallback click", async () => {
    const { result, dispatchedEvents } = await runContentScript();

    assert.deepEqual(JSON.parse(JSON.stringify(result)), {
        action: "periodic-click",
        outcome: "target-not-found",
        reason: "colab-tab-layout-container-not-found"
    });
    assert.equal(dispatchedEvents.length, 0);
});

test("content script dispatches one periodic attempt when reconnect is disabled", async () => {
    const target = {};
    const { result, dispatchedEvents } = await runContentScript({ activityTarget: target });

    assert.deepEqual(JSON.parse(JSON.stringify(result)), {
        action: "periodic-click",
        outcome: "attempted",
        reason: "activity-target-dispatched"
    });
    assert.equal(dispatchedEvents.length, 1);
    assert.equal(dispatchedEvents[0].type, "click");
});

test("content script uses only a visible connect control when reconnect is enabled", async () => {
    let clickCount = 0;
    const reconnectTarget = {
        disabled: false,
        getBoundingClientRect: () => ({ width: 10, height: 10 }),
        click: () => { clickCount += 1; }
    };
    const connectTarget = { shadowRoot: { querySelector: () => reconnectTarget } };
    const activityTarget = {};

    const { result, dispatchedEvents } = await runContentScript({
        activityTarget,
        connectTarget,
        reconnectEnabled: true
    });

    assert.deepEqual(JSON.parse(JSON.stringify(result)), {
        action: "reconnect",
        outcome: "attempted",
        reason: "connect-control-clicked"
    });
    assert.equal(clickCount, 1);
    assert.equal(dispatchedEvents.length, 0);
});

test("content script does not click generic dialogs in reconnect mode", async () => {
    const { result } = await runContentScript({ reconnectEnabled: true });

    assert.deepEqual(JSON.parse(JSON.stringify(result)), {
        action: "reconnect",
        outcome: "reconnect-not-detected",
        reason: "visible-connect-control-not-found"
    });
});
