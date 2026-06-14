const os = require('os');

const parsedInstanceCount = Number.parseInt(
    process.env.WEB_CONCURRENCY || process.env.PM2_INSTANCES || '',
    10
);

// Memory-aware default: each Next.js cluster worker can comfortably use
// ~700MB, so blindly scaling to os.cpus().length OOMs small VPSes (a 2GB box
// running Postgres alongside can only afford one worker). Cap the default by
// both core count and ~60% of total RAM. Operators can still force any value
// via WEB_CONCURRENCY / PM2_INSTANCES.
const cpuCount = Math.max(1, os.cpus()?.length || 1);
const MEMORY_PER_INSTANCE_BYTES = 700 * 1024 * 1024;
const memoryBudgetBytes = (os.totalmem() || 0) * 0.6;
const memoryInstanceCap = Math.max(1, Math.floor(memoryBudgetBytes / MEMORY_PER_INSTANCE_BYTES));
const defaultInstanceCount = Math.max(1, Math.min(cpuCount, memoryInstanceCap));

module.exports = {
    apps: [
        {
            name: "nextjs-app",
            script: "server.js",
            instances: Number.isFinite(parsedInstanceCount) && parsedInstanceCount > 0
                ? parsedInstanceCount
                : defaultInstanceCount,
            exec_mode: "cluster",
            max_memory_restart: process.env.PM2_MAX_MEMORY || "512M",
            listen_timeout: 10000,
            kill_timeout: 5000,
            env: {
                NODE_ENV: process.env.NODE_ENV || 'production',
            },
        },
    ],
};
