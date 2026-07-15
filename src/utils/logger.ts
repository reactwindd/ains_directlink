import fs from "fs/promises";
import path from "path";
import type { Request } from "express";

const LOGS_DIR = path.join(process.cwd(), "logs");

/**
 * Ensures that the logs directory exists.
 */
async function ensureLogsDirExists(): Promise<void> {
    try {
        await fs.mkdir(LOGS_DIR, { recursive: true });
    } catch (err) {
        console.error("Failed to create logs directory:", err);
    }
}

/**
 * Logs an error to a JSON file under the `logs/` directory.
 * Redacts sensitive fields (like bearer tokens and cookies) for safety.
 * 
 * @returns The path to the written log file, or null if it fails.
 */
export async function logErrorToJson(err: Error, req?: Request): Promise<string | null> {
    await ensureLogsDirExists();

    const timestamp = new Date().toISOString();
    // Replace characters invalid in filenames on Windows/Linux
    const safeTimestamp = timestamp.replace(/[:.]/g, "-");
    const filename = `error-${safeTimestamp}-${Math.floor(1000 + Math.random() * 9000)}.json`;
    const filepath = path.join(LOGS_DIR, filename);

    // Extract request information safely
    const requestDetails = req ? {
        method: req.method,
        url: req.url,
        query: req.query,
        headers: {
            "user-agent": req.headers["user-agent"],
            "content-type": req.headers["content-type"],
            "accept": req.headers["accept"],
        },
        body: req.body ? { ...req.body } : undefined,
    } : undefined;

    // Redact credentials/tokens from request log
    if (requestDetails?.body) {
        if (requestDetails.body.token) {
            requestDetails.body.token = "[REDACTED]";
        }
        if (requestDetails.body.cookies) {
            requestDetails.body.cookies = "[REDACTED]";
        }
    }

    // Safely extract all error details, including non-enumerable properties
    const errorDetails: Record<string, any> = {};
    Object.getOwnPropertyNames(err).forEach((key) => {
        errorDetails[key] = (err as any)[key];
    });

    const logPayload = {
        timestamp,
        error: errorDetails,
        request: requestDetails,
    };

    try {
        await fs.writeFile(filepath, JSON.stringify(logPayload, null, 2), "utf-8");
        console.log(`[Logger] Saved error log: ${filepath}`);
        return filepath;
    } catch (writeErr) {
        console.error("Failed to write error log to JSON file:", writeErr);
        return null;
    }
}
