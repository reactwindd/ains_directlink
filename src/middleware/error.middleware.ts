import type { Request, Response, NextFunction } from "express";
import { logErrorToJson } from "../utils/logger.ts";

export interface CustomError extends Error {
    statusCode?: number;
}

/**
 * Centered Express error handler middleware.
 * Formats errors, writes them to a JSON log file, and returns a standard JSON response.
 */
export function errorHandler(
    err: CustomError,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log to console
    console.error(`[Express Error] Status ${statusCode}: ${message}`);
    if (err.stack) {
        console.error(err.stack);
    }

    // Log the error to a JSON file asynchronously in the background
    logErrorToJson(err, req).catch((logErr) => {
        console.error("[Logger] Failed to write JSON error log:", logErr);
    });

    res.status(statusCode).json({
        success: false,
        error: {
            message,
            ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
        },
    });
}
