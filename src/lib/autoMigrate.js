import { execFile } from "child_process";
import { existsSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Run `prisma migrate deploy` from inside the running app.
 *
 * Used by the backup import route to self-heal schema drift: when a restore
 * hits P2021/P2022 (table/column missing because pending migrations were never
 * applied), it applies the shipped migration history and retries instead of
 * bouncing the admin to a shell.
 *
 * Resolves both runtime layouts:
 *   - Docker standalone: isolated CLI at /app/prisma-cli/node_modules (see
 *     Dockerfile) with the schema at /app/prisma/schema.prisma. Also probes the
 *     nested prisma/prisma/ layout produced by the pre-fix image, so restores
 *     on the broken image can still self-heal.
 *   - Local dev: prisma CLI from the project's own node_modules.
 */

function hasMigrations(schemaPath) {
    try {
        const migrationsDir = join(schemaPath, "..", "migrations");
        return readdirSync(migrationsDir, { withFileTypes: true }).some(
            (entry) => entry.isDirectory()
                && existsSync(join(migrationsDir, entry.name, "migration.sql"))
        );
    } catch {
        return false;
    }
}

function resolveSchemaPath() {
    const candidates = [
        join(process.cwd(), "prisma", "schema.prisma"),
        // Nested layout from the broken `cp -a prisma /out/prisma` image.
        join(process.cwd(), "prisma", "prisma", "schema.prisma"),
    ];
    // Prefer a schema that actually sits next to a migration history;
    // migrate deploy silently no-ops on an empty migrations folder.
    const existing = candidates.filter((p) => existsSync(p));
    return existing.find(hasMigrations) || existing[0] || null;
}

function resolveCliPath() {
    const candidates = [
        // Docker: self-contained CLI copied by the runner stage.
        "/app/prisma-cli/node_modules/prisma/build/index.js",
        // Dev / non-standalone: project-local CLI.
        join(process.cwd(), "node_modules", "prisma", "build", "index.js"),
    ];
    return candidates.find((p) => existsSync(p)) || null;
}

/**
 * @returns {Promise<{ ok: boolean, output: string }>} never throws.
 */
export async function runMigrateDeploy() {
    const schemaPath = resolveSchemaPath();
    const cliPath = resolveCliPath();

    if (!schemaPath) {
        return { ok: false, output: "prisma/schema.prisma not found in the runtime image" };
    }
    if (!hasMigrations(schemaPath)) {
        return { ok: false, output: `no migration history next to ${schemaPath}; migrate deploy would no-op` };
    }
    if (!cliPath) {
        return { ok: false, output: "prisma CLI not found in the runtime image" };
    }

    return new Promise((resolve) => {
        execFile(
            process.execPath,
            [cliPath, "migrate", "deploy", "--schema", schemaPath],
            { timeout: 120_000, env: process.env },
            (error, stdout, stderr) => {
                const output = [stdout, stderr].filter(Boolean).join("\n").trim();
                if (error) {
                    resolve({ ok: false, output: output || error.message });
                } else {
                    resolve({ ok: true, output });
                }
            }
        );
    });
}
