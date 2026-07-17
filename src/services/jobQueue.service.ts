import { EventEmitter } from "events";
import type { Job, JobPayload } from "../types/index.ts";

const jobsDatabase = new Map<string, Job>();

const pendingQueue: string[] = [];

export const jobEvents = new EventEmitter();

export const JobStore = {
    addJob(payload: JobPayload) {
        const id = crypto.randomUUID();
        const newJob: Job = {
            id,
            status: "PENDING",
            payload,
            currentRun: 0,
            runsLeft: payload.totalRuns,
            nextActionAt: null,
            history: [],
        };

        jobsDatabase.set(id, newJob);
        pendingQueue.push(id);

        jobEvents.emit(`Update: ${id}`, newJob);
        return id;
    },

    nextInQueue(): string | undefined {
        return pendingQueue.shift();
    },

    getJob(id: string): Job | undefined {
        return jobsDatabase.get(id);
    },

    updateJob(id: string, updates: Partial<Job>): void {
        const job = jobsDatabase.get(id);
        if (job) {
            const updatedJob = { ...job, ...updates };
            jobsDatabase.set(id, updatedJob);

            jobEvents.emit(`UPDATE: ${id}`, updatedJob);
        }
    },
};
