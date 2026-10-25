const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const repoRoot = path.join(__dirname, "..");
const artifactName = "colab-clicker-v0.1.0.zip";

test("package checksum is portable outside the repository", () => {
    execFileSync("bash", ["scripts/package-extension.sh", "0.1.0"], {
        cwd: repoRoot,
        stdio: "pipe"
    });

    const distDir = path.join(repoRoot, "dist");
    const checksumPath = path.join(distDir, "SHA256SUMS");
    const checksum = fs.readFileSync(checksumPath, "utf8").trim();
    const checksumParts = checksum.split(/\s+/);

    assert.equal(checksumParts[1], artifactName);

    const isolatedDir = fs.mkdtempSync(path.join(os.tmpdir(), "colab-clicker-checksum-"));
    try {
        fs.copyFileSync(path.join(distDir, artifactName), path.join(isolatedDir, artifactName));
        fs.copyFileSync(checksumPath, path.join(isolatedDir, "SHA256SUMS"));
        execFileSync("sha256sum", ["-c", "SHA256SUMS"], {
            cwd: isolatedDir,
            stdio: "pipe"
        });
    } finally {
        fs.rmSync(isolatedDir, { recursive: true, force: true });
    }
});
