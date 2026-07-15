import { config } from "../config.ts";

/**
 * Fetches a random word from the Ninja API.
 * Throws an error if the request fails.
 */
export async function getRandomWord(): Promise<string> {
    const url = "https://api.api-ninjas.com/v2/randomword";

    const response = await fetch(url, {
        headers: {
            "X-Api-Key": config.RANDOM_WORD_API,
        },
    });

    if (!response.ok) {
        throw new Error(`Ninja API error: Status ${response.status}`);
    }

    const data = await response.json();
    
    // Support multiple format options for safety
    if (Array.isArray(data) && data.length > 0) {
        return data[0];
    }
    if (data && typeof data === "object" && "word" in data && typeof data.word === "string") {
        return data.word;
    }
    if (typeof data === "string") {
        return data;
    }
    
    throw new Error("Invalid response format from Ninja API");
}
