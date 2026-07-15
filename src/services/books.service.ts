import CryptoJS from "crypto-js";
import { config } from "../config.ts";
import type {
    Book,
    NilamPayload,
    GoogleBooksResponse,
} from "../types/index.ts";
import { getRandomInt } from "../utils/math.ts";
import { formatDate, formatPublishedDate } from "../utils/date.ts";
import { generateReview, generateSummary } from "./llm.service.ts";

/**
 * Fetches a random book from Google Books API and formats it.
 * Runs LLM summary and review generation in parallel.
 * Sanitizes book details (title length, strictly numeric ISBN, realistic published year)
 * to comply with database constraints of the external system.
 *
 * @param randomWord The word to search for in titles.
 * @param userId The ID of the submitting user.
 * @returns Formatted NilamPayload, or null if no books are found.
 */
export async function getRandomBook(
    randomWord: string,
    userId: number,
): Promise<NilamPayload | null> {
    const url = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(
        randomWord,
    )}&key=${config.GOOGLE_BOOKS_API}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Google Books API error: Status ${response.status}`);
    }

    const data = (await response.json()) as GoogleBooksResponse;

    if (!data.items || data.items.length === 0) {
        return null;
    }

    const maxIndex = data.items.length - 1;
    const randomIndex = getRandomInt(0, maxIndex);
    const book = data.items[randomIndex];

    const volumeInfo = book.volumeInfo;

    // 1. Sanitize Title (truncate to avoid long text errors)
    let title = volumeInfo.title || "Unknown Book";
    if (title.length > 80) {
        title = title.substring(0, 77) + "...";
    }

    // 2. Sanitize Published Year (must be a realistic 4-digit year, e.g., 1900-present)
    const rawPublishedDate = volumeInfo.publishedDate || "";
    let publishedYear = formatPublishedDate(rawPublishedDate);
    const yearNum = parseInt(publishedYear, 10);
    const currentYear = new Date().getFullYear();
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear) {
        publishedYear = "2020"; // sensible default fallback
    }

    // 3. Sanitize Author & Publisher
    let author =
        volumeInfo.authors && volumeInfo.authors.length > 0
            ? volumeInfo.authors[0]
            : "John Smith";
    if (author.length > 50) {
        author = author.substring(0, 47) + "...";
    }

    let publisher = volumeInfo.publisher || "Unknown Publisher";
    if (publisher.length > 50) {
        publisher = publisher.substring(0, 47) + "...";
    }

    // 4. Sanitize ISBN (AINS strictly validates numeric formats; strip characters/letters)
    let isbn = "9780000000000"; // default numeric 13-digit placeholder
    if (
        volumeInfo.industryIdentifiers &&
        volumeInfo.industryIdentifiers.length > 0
    ) {
        const isbn13 = volumeInfo.industryIdentifiers.find(
            (id) => id.type === "ISBN_13",
        );
        const isbn10 = volumeInfo.industryIdentifiers.find(
            (id) => id.type === "ISBN_10",
        );

        if (isbn13) {
            isbn = isbn13.identifier;
        } else if (isbn10) {
            isbn = isbn10.identifier;
        } else {
            // If it is another type (e.g. OCLC), strip non-digit characters to keep it strictly numeric
            const digitsOnly =
                volumeInfo.industryIdentifiers[0].identifier.replace(/\D/g, "");
            if (digitsOnly.length >= 8) {
                isbn = digitsOnly;
            }
        }
    }

    // Generate summary and review in parallel to improve performance
    const [summary, review] = await Promise.all([
        generateSummary(title, publishedYear, author),
        generateReview(title, publishedYear, author),
    ]);

    // Build the payload that gets encrypted in the provider field
    const providerPayload: Book = {
        user: userId,
        type: "book",
        date: formatDate(Date.now()),
        title: title,
        category: "fiction",
        author: author,
        publisher: publisher,
        language: "en",
        summary: summary,
        review: review,
    };

    // The AINS API expects the decrypted value of the provider field to be wrapped inside an Array [payload]
    const provider = CryptoJS.AES.encrypt(
        JSON.stringify(providerPayload),
        config.SECRET_KEY,
    ).toString();

    // Return the final submission payload structure
    return {
        data: {
            user: userId,
            type: "book",
            date: formatDate(Date.now()),
            title: title,
            bookType: "physical",
            category: "fiction",
            noOfPage: volumeInfo.pageCount || 25,
            isbn: isbn,
            author: author,
            publisher: publisher,
            publishedYear: publishedYear,
            language: "en",
            summary: summary,
            review: review,
            rating: 5,
            reviewIsVideo: false,
            provider: provider,
        },
    };
}
