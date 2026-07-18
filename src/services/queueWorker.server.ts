import { JobStore } from "./jobQueue.service.ts";
import type { Job } from "../types/index.ts";
import { getRandomWord } from "../services/word.service.ts";
import { getRandomBook } from "../services/books.service.ts";
import { submitNilamRecord } from "../services/nilam.service.ts";

const delay = (seconds: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, seconds * 1000));

class QueueWorker {
    private active: boolean = false;

    public start() {
        if (this.active) return;
        this.active = true;
        this.workLoop();
    }

    private async workLoop() {
        while (this.active) {
            const jobId = JobStore.nextInQueue();

            if (!jobId) {
                await delay(1);
                continue;
            }

            const job = JobStore.getJob(jobId);
            if (!job) continue;

            try {
                await this.processJob(job);
            } catch (err) {
                JobStore.updateJob(jobId, { status: "FAILED" });
            }
        }
    }

    private async processJob(job: Job): Promise<void> {
        const { id, payload } = job;
        const { token, cookies, totalRuns, delaySeconds } = payload;

        function decodeJwt(token: string): any {
            try {
                const cleanToken = token.startsWith("Bearer ")
                    ? token.substring(7)
                    : token;
                const parts = cleanToken.split(".");
                if (parts.length !== 3) {
                    return null;
                }
                const base64Url = parts[1];
                // Replace base64url characters to standard base64
                const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
                const payloadJson = Buffer.from(base64, "base64").toString(
                    "utf-8",
                );
                return JSON.parse(payloadJson);
            } catch (e) {
                console.error("[JWT Decoder] Failed to decode token:", e);
                return null;
            }
        }

        JobStore.updateJob(id, { status: "PROCESSING" });

        for (let currentRun = 1; currentRun <= totalRuns; currentRun++) {
            const timestamp = new Date().toISOString();
            let runResult: any = {
                run: currentRun,
                status: "SUCCESS",
                timestamp,
                data: {},
                error: {},
            };

            try {
                if (!token) {
                    runResult.error = {
                        error: "Missing required parameter: token",
                    };
                    return;
                }
                if (!cookies) {
                    runResult.error = {
                        error: "Missing required parameter: cookies",
                    };
                    return;
                }

                // Decode the JWT token to inspect the payload and extract user ID
                const decodedToken = decodeJwt(token);
                console.log(
                    `[JWT Decoded Payload]:`,
                    JSON.stringify(decodedToken, null, 2),
                );

                let userId: number = NaN;
                if (
                    decodedToken &&
                    (decodedToken.id || decodedToken.userId || decodedToken.sub)
                ) {
                    const extractedId = Number(
                        decodedToken.id ||
                            decodedToken.userId ||
                            decodedToken.sub,
                    );
                    if (!isNaN(extractedId)) {
                        userId = extractedId;
                        console.log(
                            `[JWT Decoder] Extracted user ID from token: ${userId}`,
                        );
                    } else {
                        runResult.error = {
                            error: "Missing or invalid parameter: userid (could not extract from tken or body)",
                        };
                    }
                } else {
                    runResult.error = {
                        error: "Missing or invalid parameter: userid (could not extract from tken or body)",
                    };
                }

                if (isNaN(userId)) {
                    runResult.error = {
                        error: "Missing or invalid parameter: userid (could not extract from token or body)",
                    };
                    return;
                }

                // 1. Retrieve a random word
                const randomWord = await getRandomWord();

                // 2. Fetch a random book matching that word and generate LLM review/summary
                const randomBook = await getRandomBook(randomWord, userId);

                if (!randomBook) {
                    runResult.error = {
                        error: `No books found matching the search query: "${randomWord}"`,
                    };
                    return;
                }

                // Log incoming and outgoing payloads for debugging
                console.log(`[Request Payload] Incoming from user form:`, {
                    userId,
                    token: token ? `${token.substring(0, 15)}...` : "missing",
                    cookies: cookies
                        ? `${cookies.substring(0, 15)}...`
                        : "missing",
                });
                console.log(
                    `[AINS Submission Payload] Outgoing to AINS API:`,
                    JSON.stringify(randomBook, null, 2),
                );

                // 3. Post the book record to the external AINS system
                await submitNilamRecord(randomBook, token, cookies);
                console.log(
                    `[Submission] ✅ Successfully posted book "${randomBook.data.title}" for user ${userId}`,
                );

                // 4. Return the result details to client
                runResult.data = {
                    randomBook,
                };
            } catch (error: any) {
                runResult.status = "FAILED";
                runResult.error = {
                    error: error.message || "API Error",
                };
            }

            const currentJob = JobStore.getJob(id);
            if (!currentJob) break;

            const updateHistory = [...currentJob.history, runResult];
            const runsLeft = totalRuns - currentRun;

            let nextActionAt: string | null = null;
            if (currentRun < totalRuns) {
                nextActionAt = new Date(
                    Date.now() + delaySeconds * 1000,
                ).toISOString();
            }

            JobStore.updateJob(id, {
                currentRun,
                runsLeft,
                nextActionAt,
                history: updateHistory,
            });

            if (currentRun < totalRuns) {
                await delay(delaySeconds);
            }
        }

        JobStore.updateJob(id, { status: "COMPLETED", nextActionAt: null });
    }
}

export const backgroundWorker = new QueueWorker();
