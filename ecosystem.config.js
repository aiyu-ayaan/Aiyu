const os = require('os');

const parsedInstanceCount = Number.parseInt(
    process.env.WEB_CONCURRENCY || process.env.PM2_INSTANCES || '',
    10
);
const defaultInstanceCount = Math.max(1, os.cpus()?.length || 1);

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
