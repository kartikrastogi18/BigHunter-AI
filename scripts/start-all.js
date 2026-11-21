const { spawn } = require("child_process");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const isWindows = process.platform === "win32";

const services = [
    {
        name: "AI-SERVICE",
        color: "\x1b[36m", // Cyan
        cwd: path.join(rootDir, "ai-service"),
        command: "python",
        args: ["-m", "uvicorn", "app.main:app", "--reload", "--port", "8000"]
    },
    {
        name: "NODE-API",
        color: "\x1b[32m", // Green
        cwd: path.join(rootDir, "server"),
        command: isWindows ? "npm.cmd" : "npm",
        args: ["run", "dev"]
    },
    {
        name: "REACT-UI",
        color: "\x1b[35m", // Magenta
        cwd: path.join(rootDir, "client"),
        command: isWindows ? "npm.cmd" : "npm",
        args: ["run", "dev"]
    }
];

const resetColor = "\x1b[0m";
const children = [];

function logStream(service, stream, isError = false) {
    let buffer = "";
    stream.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || "";
        for (const line of lines) {
            if (!line.trim()) continue;
            const prefix = `${service.color}[${service.name}]${resetColor}`;
            if (isError) {
                console.error(`${prefix} ${line}`);
            } else {
                console.log(`${prefix} ${line}`);
            }
        }
    });
}

console.log("\n🐛 Starting BugHunter AI Full-Stack Platform...\n");

for (const svc of services) {
    const child = spawn(svc.command, svc.args, {
        cwd: svc.cwd,
        shell: isWindows,
        env: {
            ...process.env,
            PYTHONIOENCODING: "utf-8",
            PYTHONUTF8: "1"
        }
    });

    logStream(svc, child.stdout, false);
    logStream(svc, child.stderr, true);

    child.on("error", (err) => {
        console.error(`${svc.color}[${svc.name}]${resetColor} Failed to start: ${err.message}`);
    });

    child.on("exit", (code) => {
        if (code !== null && code !== 0) {
            console.log(`${svc.color}[${svc.name}]${resetColor} Exited with code ${code}`);
        }
    });

    children.push(child);
}

function shutdown() {
    console.log("\n🛑 Shutting down all BugHunter AI services...");
    for (const child of children) {
        try {
            if (isWindows && child.pid) {
                spawn("taskkill", ["/pid", String(child.pid), "/f", "/t"], { shell: true });
            } else {
                child.kill("SIGTERM");
            }
        } catch {
            // ignore cleanup errors
        }
    }
    setTimeout(() => process.exit(0), 500);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

