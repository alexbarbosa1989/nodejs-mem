const express = require("express");
const { PerformanceObserver, performance } = require("perf_hooks");
const os = require("os");
const v8 = require("v8");

const app = express();
let gcStats = new Set();
const MAX_ENTRIES = 100; // Limit stored GC events

// Track Garbage Collection Events
const obs = new PerformanceObserver((list) => {
    const entry = list.getEntries()[0];
    gcStats.add({
        timestamp: Date.now(),
        gcType: entry.kind === 1 ? "Scavenge" : entry.kind === 2 ? "Mark-Sweep" : "Incremental",
        duration: `${entry.duration.toFixed(2)}ms`,
        memory: os.freemem(),
        totalMemory: os.totalmem(),
        uptime: os.uptime(),
    });

    // Ensure we don't store too many events
    if (gcStats.size > MAX_ENTRIES) {
        gcStats = new Set([...gcStats].slice(-MAX_ENTRIES)); // Keep the latest entries
    }
});

obs.observe({ entryTypes: ["gc"], buffered: true });

// Garbage Collection Tracing Endpoint
app.get("/gctracing", (req, res) => {
    res.json({ gcEvents: [...gcStats] });
});


// Garbage Collection Tracing
app.get("/gctracing", (req, res) => {
    res.json({ gcEvents: [...gcStats] });
});

// OOM Trigger - Forces Memory Exhaustion
app.get("/oom", (req, res) => {
    try {
        let memoryHog = [];
        for (let i = 0; i < 500000; i++) {
            memoryHog.push(Buffer.alloc(1024 * 1024)); // Allocate ~500MB
        }

        global.gc?.(); // If Node.js is run with --expose-gc, explicitly trigger GC
        res.json({ message: "Memory pressure applied, GC should trigger soon." });
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
            <td>${bytesToMegabytes(memoryUsage.heapTotal)}</td>
            <td>${bytesToMegabytes(memoryUsage.heapUsed)}</td>
            <td>${bytesToMegabytes(memoryUsage.external)}</td></tr>
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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Service running on http://localhost:${PORT}`);
    console.log(`Memory stats: http://localhost:${PORT}/memstats`);
    console.log(`GC tracing: http://localhost:${PORT}/gctracing`);
    console.log(`OOM Trigger: http://localhost:${PORT}/oom`);
});