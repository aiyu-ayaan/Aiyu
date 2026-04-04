module.exports = {
    apps: [
        {
            name: "nextjs-app",
            script: "server.js",
            instances: "max",
            exec_mode: "cluster",
        },
    ],
};
