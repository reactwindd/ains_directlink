import OpenAI from "openai";
import { config } from "../config.ts";

// Initialize OpenAI client once at the module level
const openai = new OpenAI({
    baseURL: config.DEEPSEEK_BASE_URL,
    apiKey: config.OPENAI_API_KEY,
});

/**
 * Internal helper to query DeepSeek completion.
 */
async function getCompletion(systemPrompt: string): Promise<string> {
    const completion = await openai.chat.completions.create({
        messages: [
            {
                role: "system",
                content: systemPrompt,
            },
        ],
        model: "deepseek-chat",
        response_format: {
            type: "text",
        },
    });

    const result = completion.choices?.[0]?.message?.content || "";
    // Clean backslashes, asterisks, and underscores
    return result.replace(/\\|\*|_/g, "").trim();
}

/**
 * Generates a 15-word summary of a book in a simplified tone.
 */
export async function generateSummary(
    title: string,
    publishedYear: string,
    author: string
): Promise<string> {
    const systemPrompt = `Write a 15-word summary of ${title} published ${publishedYear} by ${author} in perspective of a primary school learner non native speaker tone. Use only:
- Letters, commas, periods, and basic punctuation
- No line breaks (\\n), asterisks, or special formatting
- Exactly 15 words
- Simple English words (A0 level)`;

    return getCompletion(systemPrompt);
}

/**
 * Generates a 25-word review of a book in a simplified tone.
 */
export async function generateReview(
    title: string,
    publishedYear: string,
    author: string
): Promise<string> {
    const systemPrompt = `Write a 25-word review of ${title} published ${publishedYear} by ${author} in perspective of a primary school learner non native speaker tone. Use only:
- Letters, commas, periods, and basic punctuation
- No line breaks (\\n), asterisks, or special formatting
- Exactly 25 words
- Simple English words (A0 level)`;

    return getCompletion(systemPrompt);
}
