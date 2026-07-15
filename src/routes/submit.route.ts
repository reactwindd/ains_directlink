import {
    Router,
    type Request,
    type Response,
    type NextFunction,
} from "express";
import { getRandomWord } from "../services/word.service.ts";
import { getRandomBook } from "../services/books.service.ts";
import { submitNilamRecord } from "../services/nilam.service.ts";
import type { SubmitRequestBody } from "../types/index.ts";

const router = Router();

/**
 * Safely decodes the payload portion of a JWT token without verifying it.
 */
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
        const payloadJson = Buffer.from(base64, "base64").toString("utf-8");
        return JSON.parse(payloadJson);
    } catch (e) {
        console.error("[JWT Decoder] Failed to decode token:", e);
        return null;
    }
}

/**
 * POST /api/submit
 * Generates a random book using a random word, generates review/summary,
 * and submits it to the external AINS Nilam API.
 */
router.post(
    "/submit",
    async (
        req: Request<{}, {}, SubmitRequestBody>,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const { userid, token, cookies } = req.body;

            // Input Validation
            if (!token) {
                res.status(400).json({
                    error: "Missing required parameter: token",
                });
                return;
            }
            if (!cookies) {
                res.status(400).json({
                    error: "Missing required parameter: cookies",
                });
                return;
            }

            // Decode the JWT token to inspect the payload and extract user ID
            const decodedToken = decodeJwt(token);
            console.log(
                `[JWT Decoded Payload]:`,
                JSON.stringify(decodedToken, null, 2),
            );

            // Extract the user ID from the token if possible, fallback to body.userid
            let finalUserId: number;
            if (
                decodedToken &&
                (decodedToken.id || decodedToken.userId || decodedToken.sub)
            ) {
                const extractedId = Number(
                    decodedToken.id || decodedToken.userId || decodedToken.sub,
                );
                if (!isNaN(extractedId)) {
                    finalUserId = extractedId;
                    console.log(
                        `[JWT Decoder] Extracted user ID from token: ${finalUserId}`,
                    );
                } else {
                    finalUserId = Number(userid);
                }
            } else {
                finalUserId = Number(userid);
            }

            if (isNaN(finalUserId)) {
                res.status(400).json({
                    error: "Missing or invalid parameter: userid (could not extract from token or body)",
                });
                return;
            }

            // 1. Retrieve a random word
            const randomWord = await getRandomWord();

            // 2. Fetch a random book matching that word and generate LLM review/summary
            const randomBook = await getRandomBook(randomWord, finalUserId);

            if (!randomBook) {
                res.status(404).json({
                    error: `No books found matching the search query: "${randomWord}"`,
                });
                return;
            }

            // Log incoming and outgoing payloads for debugging
            console.log(`[Request Payload] Incoming from user form:`, {
                userid,
                finalUserId,
                token: token ? `${token.substring(0, 15)}...` : "missing",
                cookies: cookies ? `${cookies.substring(0, 15)}...` : "missing",
            });
            console.log(
                `[AINS Submission Payload] Outgoing to AINS API:`,
                JSON.stringify(randomBook, null, 2),
            );

            // 3. Post the book record to the external AINS system
            await submitNilamRecord(randomBook, token, cookies);
            console.log(
                `[Submission] Successfully posted book "${randomBook.data.title}" for user ${finalUserId}`,
            );

            // 4. Return the result details to client
            res.json({
                token,
                cookies,
                word: randomWord,
                data: {
                    randomBook,
                },
            });
        } catch (error) {
            // Bubble up errors to the central Express error handler
            next(error);
        }
    },
);

export default router;
