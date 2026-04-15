module.exports = {
    apps: [
        {
            name: "nextjs-app",
            script: "server.js",
            instances: process.env.PM2_INSTANCES || 2,
            exec_mode: "cluster",
            max_memory_restart: process.env.PM2_MAX_MEMORY || "512M",
        },
    ],
};
