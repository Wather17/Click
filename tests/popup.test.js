const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const coreScript = fs.readFileSync(path.join(__dirname, "..", "core.js"), "utf8");
const popupScript = fs.readFileSync(path.join(__dirname, "..", "popup.js"), "utf8");

function createElement() {
    return {
        disabled: false,
        hidden: false,
        checked: false,
        value: "5",
        textContent: "",
        className: "",
        style: {},
        listeners: {},
        addEventListener(type, listener) {
            this.listeners[type] = listener;
        },
        setCustomValidity(message) {
            this.customValidity = message;
        },
        reportValidity() {
            return this.customValidity === "";
        }
    };
}

function createPopupContext({ running = false, startResponse = { success: true, targetTabId: 7 } } = {}) {
    const ids = [
        "btnStart",
        "btnStop",
        "statusDisplay",
        "intervalInput",
        "reconnectInput",
        "targetDisplay",
        "nextRunDisplay",
        "lastAttemptDisplay",
        "errorDisplay"
    ];
    const elements = Object.fromEntries(ids.map((id) => [id, createElement()]));
    const messageListeners = [];
    const context = {
        document: {
            getElementById(id) {
                return elements[id];
            }
        },
        chrome: {
            runtime: {
                lastError: null,
                onMessage: {
                    addListener(listener) {
                        messageListeners.push(listener);
                    }
                },
                sendMessage(message, callback) {
                    callback(message.action === "START" ? startResponse : { success: true });
                }
            },
            storage: {
                local: {
                    get(keys, callback) {
                        callback({
                            isRunning: running,
                            intervalMinutes: 5,
                            targetTabId: running ? 7 : null,
                            lastAttempt: null,
                            lastClickTime: null,
                            reconnectEnabled: true
                        });
                    },
                    set(values, callback) {
                        callback();
                    }
                }
            },
            alarms: {
                get(name, callback) {
                    callback({ scheduledTime: Date.now() + 60000 });
                }
            },
            tabs: {
                get(tabId, callback) {
                    callback({ id: tabId, title: "Notebook de teste" });
                }
            }
        }
    };

    vm.runInNewContext(coreScript, context);
    vm.runInNewContext(popupScript, context);
    return { context, elements, messageListeners };
}

test("popup renders the monitored tab and next cycle", () => {
    const { elements } = createPopupContext({ running: true });

    assert.equal(elements.statusDisplay.textContent, "Monitorando");
    assert.match(elements.targetDisplay.textContent, /Notebook de teste/);
    assert.match(elements.nextRunDisplay.textContent, /Próximo ciclo:/);
    assert.equal(elements.reconnectInput.checked, true);
});

test("popup exposes a start error instead of claiming success", () => {
    const { elements } = createPopupContext({
        startResponse: {
            success: false,
            error: { message: "Abra uma aba do Google Colab antes de iniciar." }
        }
    });

    elements.btnStart.listeners.click();

    assert.equal(elements.statusDisplay.textContent, "Erro");
    assert.equal(elements.statusDisplay.className, "status-container status-error");
    assert.equal(elements.errorDisplay.hidden, false);
    assert.match(elements.errorDisplay.textContent, /Abra uma aba/);
});
