import type { NilamPayload } from "../types/index.ts";

/**
 * Submits the book record to the external AINS Nilam API.
 * Throws an error with detailed response details if the submission fails.
 * 
 * @param payload The book record payload.
 * @param token Bearer token for authorization.
 * @param cookies Cookie string for session info.
 * @returns The raw fetch Response from the external API.
 */
export async function submitNilamRecord(
    payload: NilamPayload,
    token: string,
    cookies: string
): Promise<Response> {
    const url = "https://ains-api.moe.gov.my/api/nilam-records/submit";
    
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:147.0) Gecko/20100101 Firefox/147.0",
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            Authorization: token,
            Origin: "https://ains.moe.gov.my",
            Referer: "https://ains.moe.gov.my/",
            Cookie: cookies,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        let responseBody = "";
        try {
            responseBody = await response.text();
        } catch (_) {
            // Fallback if reading response fails
        }
        
        throw new Error(
            `AINS API submission failed: Status ${response.status}${
                responseBody ? ` - Details: ${responseBody.trim()}` : ""
            }`
        );
    }

    return response;
}
