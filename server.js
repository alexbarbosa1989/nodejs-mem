const express = require("express");

const app = express();

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
    console.log(`Memory stats service running on http://localhost:${PORT}/memstats`);
});