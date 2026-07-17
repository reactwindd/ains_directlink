import { Router, type Request, type Response } from "express";
import { JobStore, jobEvents } from "../services/jobQueue.service.ts";

const router = Router();

// Endpoint 1: Submit a new job (Returns instantly)
router.post("/jobs", (req: Request, res: Response) => {
    const { token, cookies, totalRuns, delaySeconds } = req.body;

    const jobId = JobStore.addJob({
        token: String(token || ""),
        cookies: String(cookies || ""),
        totalRuns: parseInt(totalRuns, 10) || 30,
        delaySeconds: parseFloat(delaySeconds) || 50,
    });

    // HTTP 202 Accepted means "request has been accepted for processing, but not finished"
    return res.status(202).json({ jobId, status: "PENDING" });
});

// Endpoint 2: Subscribe to a specific job's events via SSE
router.get("/jobs/:id/stream", (req: Request, res: Response) => {
    const { id } = req.params;
    const job = JobStore.getJob(Array.isArray(id) ? id[0] : id);

    if (!job) {
        return res.status(404).json({ error: "Job not found" });
    }

    // Setup streaming headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Send current status immediately upon connection
    res.write(`data: ${JSON.stringify(job)}\n\n`);

    // Define how we listen to changes for this specific job ID
    const updateListener = (updatedJob: any) => {
        res.write(`data: ${JSON.stringify(updatedJob)}\n\n`);
        if (
            updatedJob.status === "COMPLETED" ||
            updatedJob.status === "FAILED"
        ) {
            cleanup();
        }
    };

    // Subscribe to the event bus
    jobEvents.on(`update:${id}`, updateListener);

    const cleanup = () => {
        jobEvents.off(`update:${id}`, updateListener);
        res.end();
    };

    // If client closes tab/disconnects, clean up subscription listeners to avoid memory leaks
    req.on("close", cleanup);
});

export default router;
