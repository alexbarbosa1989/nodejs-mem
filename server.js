const express = require("express");
const { PerformanceObserver, performance } = require("perf_hooks");
const os = require("os");
const fs = require("fs");

const PORT = 8080;
const app = express();
let gcStats = new Set();
const MAX_ENTRIES = 100; // Limit stored GC events
let memoryHog = []; // making memoryHog global
const http = require("http");

app.get("/readurl", (req, res) => {
    const targetHost = req.query.host || "google.com";
    const targetPath = req.query.path || "/";

    const options = {
        host: targetHost,
        path: targetPath,
        timeout: 5000,
    };

    const request = http.request(options, (response) => {
        let data = "";

        response.on("data", (chunk) => {
            data += chunk;
        });

        response.on("end", () => {
            res.status(200).json({
                target: `http://${targetHost}${targetPath}`,
                contentLength: data.length,
                preview: data.substring(0, 1000) + "...", // Show first 1000 chars
            });
        });
    });

    request.on("error", (err) => {
        res.status(500).json({
            error: err.message,
            target: `http://${targetHost}${targetPath}`,
        });
    });

    request.end();
});


// Detect and read container memory stats (supports cgroup v1 and v2)
function getContainerMemoryStats() {
    try {
        if (fs.existsSync("/sys/fs/cgroup/memory/memory.usage_in_bytes")) {
            // cgroup v1
            const memUsage = fs.readFileSync("/sys/fs/cgroup/memory/memory.usage_in_bytes", "utf8").trim();
            const memLimit = fs.readFileSync("/sys/fs/cgroup/memory/memory.limit_in_bytes", "utf8").trim();
            return {
                memoryUsageMB: bytesToMegabytes(parseInt(memUsage, 10)),
                memoryLimitMB: bytesToMegabytes(parseInt(memLimit, 10)),
            };
        } else if (fs.existsSync("/sys/fs/cgroup/memory.max")) {
            // cgroup v2
            const memUsage = fs.readFileSync("/sys/fs/cgroup/memory.current", "utf8").trim();
            const memLimit = fs.readFileSync("/sys/fs/cgroup/memory.max", "utf8").trim();
            return {
                memoryUsageMB: bytesToMegabytes(parseInt(memUsage, 10)),
                memoryLimitMB: memLimit === "max" ? "Unlimited" : bytesToMegabytes(parseInt(memLimit, 10)),
            };
        }
        return { error: "Cgroup memory stats not found." };
    } catch (err) {
        return { error: "Unable to read container memory stats." };
    }
}

// Track GC events using PerformanceObserver
const obs = new PerformanceObserver((list) => {
    const entry = list.getEntries()[0];
    const containerMemory = getContainerMemoryStats();

    gcStats.add({
        timestamp: new Date().toISOString(),
        gcType: entry.kind === 1 ? "Scavenge" : entry.kind === 2 ? "Mark-Sweep" : "Incremental",
        duration: `${entry.duration.toFixed(2)}ms`,
        memoryUsageMB: containerMemory.memoryUsageMB,
        memoryLimitMB: containerMemory.memoryLimitMB,
        uptime: `${(os.uptime() / 60).toFixed(2)} minutes`
    });

    if (gcStats.size > MAX_ENTRIES) {
        gcStats = new Set([...gcStats].slice(-MAX_ENTRIES));
    }
});

// Start tracking GC events
obs.observe({ entryTypes: ["gc"], buffered: true });

// Expose a service at /gctracing
app.get("/gctracing", (req, res) => {
    res.json({
        gcEvents: [...gcStats],
        containerMemoryStats: getContainerMemoryStats(),
    });
});

// Forces Memory allocation
app.get("/memory", (req, res) => {
    const size = parseInt(req.query.size, 10) || 100; // Default to 100MB
    const sizePerItem = 1024 * 1024; // 1MB in bytes

    try {
        for (let i = 0; i < size; i++) {
            memoryHog.push("X".repeat(sizePerItem)); // Allocating string to the heap
        }

        global.gc?.(); // Force GC if '--expose-gc' is enabled

        res.json({ message: `Allocated ${size}MB of memory. GC should trigger soon.` });
    } catch (err) {
        res.status(500).json({ error: "OOM simulation failed", details: err.message });
    }
});

// Ensure Explicit GC Can Be Triggered
if (!global.gc) {
    console.warn("Run Node.js with '--expose-gc' to enable manual GC triggers.");
}

// Memory Usage Endpoint
app.get("/memstats", (req, res) => {
    const memoryUsage = process.memoryUsage();

    const stats = `
        <html><body><h2>Node.js Memory Usage</h2>
        <table border="1">
            <tr><th></th><th>Used (MB)</th><th>Heap Total (MB)</th><th>Heap Used (MB)</th><th>External (MB)</th></tr>
            <tr><td>RSS (Resident Set Size)</td><td>${bytesToMegabytes(memoryUsage.rss)}</td>
            <td>Heap Total ${bytesToMegabytes(memoryUsage.heapTotal)}</td>
            <td>Heap used ${bytesToMegabytes(memoryUsage.heapUsed)}</td>
            <td>Memory used ${bytesToMegabytes(memoryUsage.external)}</td></tr>
        </table>
        <h2>Node.js Version</h2>
        <p>${process.version}</p>
        </body></html>
    `;

    res.send(stats);
});

function bytesToMegabytes(bytes) {
    return (bytes / (1024 * 1024)).toFixed(2);
}

app.listen(PORT, () => {
    console.log(`Service running on http://localhost:${PORT}`);
    console.log(`Memory stats: http://localhost:${PORT}/memstats`);
    console.log(`GC tracing: http://localhost:${PORT}/gctracing`);
    console.log(`OOM Trigger: http://localhost:${PORT}/memory`);
    console.log(`Read URL: http://localhost:${PORT}/readurl`);
});