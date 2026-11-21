const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");
const { promisify } = require("util");
const crypto = require("crypto");

const execFileAsync = promisify(execFile);

let AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
if (AI_SERVICE_URL.includes("localhost")) {
    AI_SERVICE_URL = AI_SERVICE_URL.replace("localhost", "127.0.0.1");
}

/**
 * Lightweight Jest-compatible test runner shim for Node.js isolated sandbox execution.
 * Zero external dependencies required.
 */
const JS_SANDBOX_SHIM = `
const assert = require("assert");
const _bhTests = [];

function describe(suiteName, fn) {
    fn();
}

function test(name, fn) {
    _bhTests.push({ name, fn });
}

const it = test;

function createMatchers(actual, isNegated = false) {
    const check = (cond, msg) => {
        const finalCond = isNegated ? !cond : cond;
        if (!finalCond) {
            throw new Error(isNegated ? "Expected negation to pass: " + msg : msg);
        }
    };

    const matchers = {
        toBe(expected) {
            const pass = Object.is(actual, expected);
            check(pass, "Expected " + JSON.stringify(expected) + ", received " + JSON.stringify(actual));
        },
        toEqual(expected) {
            let pass = false;
            try {
                assert.deepStrictEqual(actual, expected);
                pass = true;
            } catch {
                pass = false;
            }
            check(pass, "Expected deep equal " + JSON.stringify(expected) + ", received " + JSON.stringify(actual));
        },
        toStrictEqual(expected) {
            return matchers.toEqual(expected);
        },
        toThrow(expectedMsg) {
            let threw = false;
            let caughtError = null;
            try {
                actual();
            } catch (err) {
                threw = true;
                caughtError = err;
            }
            if (!isNegated && !threw) {
                throw new Error("Expected function to throw an error, but it did not throw.");
            }
            if (isNegated && threw) {
                throw new Error("Expected function not to throw, but it threw: " + (caughtError?.message || caughtError));
            }
            if (threw && expectedMsg) {
                const msg = caughtError?.message || String(caughtError);
                const matches = expectedMsg instanceof RegExp ? expectedMsg.test(msg) : msg.includes(String(expectedMsg));
                check(matches, "Expected error matching '" + expectedMsg + "', got '" + msg + "'");
            }
        },
        toBeTruthy() {
            check(Boolean(actual), "Expected truthy value, received " + JSON.stringify(actual));
        },
        toBeFalsy() {
            check(!Boolean(actual), "Expected falsy value, received " + JSON.stringify(actual));
        },
        toBeNull() {
            check(actual === null, "Expected null, received " + JSON.stringify(actual));
        },
        toBeUndefined() {
            check(actual === undefined, "Expected undefined, received " + JSON.stringify(actual));
        },
        toBeDefined() {
            check(actual !== undefined, "Expected value to be defined");
        },
        toBeNaN() {
            check(Number.isNaN(actual), "Expected NaN, received " + actual);
        },
        toBeGreaterThan(n) {
            check(actual > n, "Expected " + actual + " > " + n);
        },
        toBeGreaterThanOrEqual(n) {
            check(actual >= n, "Expected " + actual + " >= " + n);
        },
        toBeLessThan(n) {
            check(actual < n, "Expected " + actual + " < " + n);
        },
        toBeLessThanOrEqual(n) {
            check(actual <= n, "Expected " + actual + " <= " + n);
        },
        toContain(item) {
            const has = Array.isArray(actual) || typeof actual === "string" ? actual.includes(item) : false;
            check(has, "Expected " + JSON.stringify(actual) + " to contain " + JSON.stringify(item));
        },
        toBeCloseTo(num, precision = 2) {
            const diff = Math.abs(actual - num);
            const pass = diff < Math.pow(10, -precision) / 2;
            check(pass, "Expected " + actual + " to be close to " + num);
        }
    };

    if (!isNegated) {
        matchers.not = createMatchers(actual, true);
    }

    return matchers;
}

function expect(actual) {
    return createMatchers(actual, false);
}
`;

const JS_SANDBOX_RUNNER_FOOTER = `
(async () => {
    const results = [];
    let allPassed = true;

    for (const t of _bhTests) {
        try {
            await t.fn();
            results.push({ name: t.name, passed: true, error: null });
        } catch (err) {
            allPassed = false;
            results.push({ name: t.name, passed: false, error: err?.message || String(err) });
        }
    }

    if (results.length === 0) {
        allPassed = false;
        results.push({ name: "discovery", passed: false, error: "No test() blocks executed." });
    }

    console.log("__BUGHUNTER_RESULTS__:" + JSON.stringify(results));
    process.exit(allPassed ? 0 : 1);
})();
`;

/**
 * Executes a single JS test run inside an isolated temporary directory with a 5s timeout.
 */
async function executeJavaScriptSandbox(codeUnderTest, testAssertions) {
    const runId = crypto.randomBytes(6).toString("hex");
    const sandboxDir = path.join(os.tmpdir(), `bughunter-sandbox-${runId}`);
    const scriptPath = path.join(sandboxDir, "verify.test.js");

    const fullScript = [
        JS_SANDBOX_SHIM,
        "// --- CODE UNDER TEST ---",
        codeUnderTest,
        "// --- TEST ASSERTIONS ---",
        testAssertions,
        JS_SANDBOX_RUNNER_FOOTER
    ].join("\n\n");

    const startTime = Date.now();

    try {
        await fs.mkdir(sandboxDir, { recursive: true });
        await fs.writeFile(scriptPath, fullScript, "utf8");

        const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath], {
            cwd: sandboxDir,
            timeout: 5000,
            maxBuffer: 1024 * 1024
        });

        const durationMs = Date.now() - startTime;
        return parseJsSandboxOutput(0, stdout, stderr, durationMs);
    } catch (err) {
        const durationMs = Date.now() - startTime;
        if (err.killed || err.signal === "SIGTERM") {
            return {
                passed: false,
                exitCode: 124,
                durationMs,
                stdout: err.stdout || "",
                stderr: "Execution timed out after 5000ms (possible infinite loop).",
                testResults: [{ name: "timeout_guard", passed: false, error: "Timed out after 5s" }]
            };
        }

        const exitCode = typeof err.code === "number" ? err.code : 1;
        return parseJsSandboxOutput(exitCode, err.stdout || "", err.stderr || err.message || "", durationMs);
    } finally {
        await fs.rm(sandboxDir, { recursive: true, force: true }).catch(() => {});
    }
}

function parseJsSandboxOutput(exitCode, rawStdout, rawStderr, durationMs) {
    let testResults = [];
    const cleanStdoutLines = [];

    for (const line of String(rawStdout || "").split(/\r?\n/)) {
        if (line.startsWith("__BUGHUNTER_RESULTS__:")) {
            try {
                testResults = JSON.parse(line.replace("__BUGHUNTER_RESULTS__:", ""));
            } catch {
                // ignore malformed json line
            }
        } else if (line.trim()) {
            cleanStdoutLines.push(line);
        }
    }

    if (testResults.length === 0 && rawStderr) {
        testResults.push({
            name: "runtime_error",
            passed: false,
            error: rawStderr.split("\n")[0] || "Runtime execution failed"
        });
    }

    return {
        passed: exitCode === 0,
        exitCode,
        durationMs,
        stdout: cleanStdoutLines.join("\n").trim(),
        stderr: String(rawStderr || "").trim(),
        testResults
    };
}

/**
 * Executes a Python test run via the Python AI Service isolated sandbox endpoint.
 */
async function executePythonSandbox(codeUnderTest, testAssertions) {
    const response = await fetch(`${AI_SERVICE_URL}/execute-python-sandbox`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            code_under_test: codeUnderTest,
            test_assertions: testAssertions
        }),
        signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Python sandbox execution failed: ${response.status} ${errText}`);
    }

    const data = await response.json();
    return {
        passed: Boolean(data.passed),
        exitCode: data.exit_code ?? (data.passed ? 0 : 1),
        durationMs: data.duration_ms ?? 0,
        stdout: data.stdout || "",
        stderr: data.stderr || "",
        testResults: data.test_results || []
    };
}

/**
 * Orchestrates full dual-stage SWE-bench style patch verification:
 *   1. Synthesize unified test harness matching both buggy & patched code
 *   2. Run test on buggy code (Expected: FAIL -> confirms bug reproduction)
 *   3. Run test on patched code (Expected: PASS -> verifies the AI fix)
 */
async function verifyPatchInSandbox({ buggyCode, patchedCode, issueDescription, testCode, language }) {
    if (!buggyCode || !patchedCode || !issueDescription) {
        throw new Error("buggyCode, patchedCode, and issueDescription are required for sandbox verification.");
    }

    // 1. Synthesize clean test harness
    const synthResponse = await fetch(`${AI_SERVICE_URL}/synthesize-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            buggy_code: buggyCode,
            patched_code: patchedCode,
            issue_description: issueDescription,
            test_code: testCode || null,
            language: language || null
        }),
        signal: AbortSignal.timeout(90000)
    });

    if (!synthResponse.ok) {
        const errText = await synthResponse.text();
        throw new Error(`Failed to synthesize verification suite: ${synthResponse.status} ${errText}`);
    }

    const harness = await synthResponse.json();
    const detectedLang = harness.language || "javascript";
    const cleanBuggy = harness.clean_buggy_code || buggyCode;
    const cleanPatched = harness.clean_patched_code || patchedCode;
    const assertions = harness.test_assertions;

    if (!assertions) {
        throw new Error("Verification harness did not return any executable test assertions.");
    }

    // 2. Execute both runs in isolated sandbox
    const runner = detectedLang === "python" ? executePythonSandbox : executeJavaScriptSandbox;

    console.log(`🛡️ [Sandbox] Stage 1: Running reproduction suite on ORIGINAL buggy code (${detectedLang})...`);
    const buggyRun = await runner(cleanBuggy, assertions);

    console.log(`🛡️ [Sandbox] Stage 2: Running reproduction suite on PATCHED fixed code (${detectedLang})...`);
    const patchedRun = await runner(cleanPatched, assertions);

    // 3. Evaluate verdict
    const bugReproduced = !buggyRun.passed;
    const patchVerified = patchedRun.passed;

    let verdict = "VERIFICATION_FAILED";
    let verdictSummary = "Patched code failed one or more verification tests.";

    if (bugReproduced && patchVerified) {
        verdict = "VERIFIED_PASS";
        verdictSummary = "Bug reproduced on baseline (FAILED) and resolved on patched code (PASSED).";
    } else if (!bugReproduced && patchVerified) {
        verdict = "DID_NOT_REPRODUCE";
        verdictSummary = "Patched code passed, but baseline buggy code also passed all assertions.";
    }

    return {
        success: true,
        language: detectedLang,
        verdict,
        verdictSummary,
        bugReproduced,
        patchVerified,
        testAssertions: assertions,
        buggyRun,
        patchedRun,
        totalDurationMs: Math.round((buggyRun.durationMs || 0) + (patchedRun.durationMs || 0))
    };
}

module.exports = {
    verifyPatchInSandbox
};

