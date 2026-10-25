const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const manifest = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "manifest.json"), "utf8")
);

test("manifest declares a Manifest V3 extension with the required runtime", () => {
    assert.equal(manifest.manifest_version, 3);
    assert.equal(manifest.background.service_worker, "background.js");
    assert.equal(manifest.action.default_popup, "popup.html");
    assert.ok(manifest.permissions.includes("alarms"));
    assert.ok(manifest.permissions.includes("scripting"));
    assert.ok(manifest.host_permissions.includes("https://colab.research.google.com/*"));
});
