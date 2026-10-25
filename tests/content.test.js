const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const contentScript = fs.readFileSync(
    path.join(__dirname, "..", "content.js"),
    "utf8"
);

function runContentScript(activityTarget) {
    const dispatchedEvents = [];
    const context = {
        document: {
            querySelector() {
                return activityTarget;
            }
        },
        window: {},
        MouseEvent: class MouseEvent {
            constructor(type, options) {
                this.type = type;
                this.options = options;
            }
        },
        console: {
            log() {},
            error() {}
        }
    };

    if (activityTarget) {
        activityTarget.dispatchEvent = (event) => {
            dispatchedEvents.push(event);
        };
    }

    const result = vm.runInNewContext(contentScript, context);
    return { result, dispatchedEvents };
}

test("content script reports target-not-found without a fallback click", () => {
    const { result, dispatchedEvents } = runContentScript(null);

    assert.deepEqual(JSON.parse(JSON.stringify(result)), {
        action: "periodic-click",
        outcome: "target-not-found",
        reason: "colab-tab-layout-container-not-found"
    });
    assert.equal(dispatchedEvents.length, 0);
});

test("content script dispatches one periodic attempt to the supported target", () => {
    const target = {};
    const { result, dispatchedEvents } = runContentScript(target);

    assert.deepEqual(JSON.parse(JSON.stringify(result)), {
        action: "periodic-click",
        outcome: "attempted",
        reason: "activity-target-dispatched"
    });
    assert.equal(dispatchedEvents.length, 1);
    assert.equal(dispatchedEvents[0].type, "click");
});
