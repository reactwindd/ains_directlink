import express, { type Express, type Request, type Response } from "express";
import OpenAI from "openai";
import CryptoJS from "crypto-js";
import "dotenv/config";
import { ResponseStream } from "openai/lib/responses/ResponseStream.js";

const app: Express = express();
const PORT = process.env.PORT;

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (res: Response) => {
    res.send("/public/index.html");
});

type book = {
    user: number;
    type: string;
    date: String;
    title: string;
    bookType?: string;
    category: string;
    noOfPage?: number;
    isbn?: string;
    author: string;
    publisher: string;
    publishedYear?: string;
    language: string;
    summary: string;
    review: string;
    rating?: number;
    reviewIsVideo?: boolean;
    provider?: string;
};

app.post("/api/submit", async (req: Request, res: Response) => {
    async function getRandomWord() {
        const url = "https://api.api-ninjas.com/v2/randomword";

        try {
            const response = await fetch(url, {
                headers: {
                    "X-Api-Key":
                        process.env.RANDOM_WORD_API || "placeholder_key",
                },
            });
            if (!response.ok) {
                throw new Error(`WORD, Response status: ${response.status}`);
            }
            const data = await response.json();
            return data[0];
        } catch (error: unknown) {
            if (error instanceof Error) {
                return `WORD: ${error.message}`;
            }
        }
    }

    function getRandomInt(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function formatDate(date: number): String {
        var d = new Date(date),
            month = "" + (d.getMonth() + 1),
            day = "" + d.getDate(),
            year = d.getFullYear();

        if (month.length < 2) month = "0" + month;
        if (day.length < 2) day = "0" + day;

        return [year, month, day].join("-");
    }

    function formatPublishedDate(date: string) {
        return date.slice(0 || 0, 4);
    }

    async function generateSummary(
        title: string,
        publishedYear: string,
        author: string,
    ) {
        const openai = new OpenAI({
            baseURL: "https://api.deepseek.com",
            apiKey: process.env.OPENAI_API_KEY,
        });

        const completion = await openai.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `
Write a 15-word summary of ${title} published ${publishedYear} by ${author} in perspective of a primary school learner non native speaker tone. Use only:
- Letters, commas, periods, and basic punctuation
- No line breaks (\n), asterisks, or special formatting
- Exactly 15 words
- Simple English words (A0 level)`,
                },
            ],
            model: "deepseek-chat",
            response_format: {
                type: "text",
            },
        });
        let result: string =
            (completion.choices?.[0]?.message?.content as string) || "";
        result = result.replace(/\\|\*|_/g, "");

        return result;
    }

    async function generateReview(
        title: string,
        publishedYear: string,
        author: string,
    ) {
        const openai = new OpenAI({
            baseURL: "https://api.deepseek.com",
            apiKey: process.env.OPENAI_API_KEY,
        });

        const completion = await openai.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `
rite a 15-word review of ${title} published ${publishedYear} by ${author} in perspective of a primary school learner non native speaker tone. Use only:
- Letters, commas, periods, and basic punctuation
- No line breaks (\n), asterisks, or special formatting
- Exactly 25 words
- Simple English words (A0 level)`,
                },
            ],
            model: "deepseek-chat",
            response_format: {
                type: "text",
            },
        });
        let result: string =
            (completion.choices?.[0]?.message?.content as string) || "";
        result = result.replace(/\\|\*|_/g, "");

        return result;
    }

    async function getRandomBook(randomWord: String) {
        const url = `https://www.googleapis.com/books/v1/volumes?q=intitle:${randomWord}&key=${process.env.GOOGLE_BOOKS_API}`;

        try {
            const response = await fetch(url);

            // Checking For Response Status
            if (!response.ok) {
                throw new Error(`BOOKS, Response status: ${response.status}`);
            }

            // Parsing Response to JSON Object
            const data = await response.json();

            // Validating the JSON Object Book List Array
            if (!data.items || data.items.length === 0) return null;
            const maxIndex = data.items.length - 1;
            const randomIndex = getRandomInt(0, maxIndex);
            const book = data.items[randomIndex || 0];

            if (!book.volumeInfo.publishedDate) {
                book.volumeInfo.publishedDate = "-";
            }

            const author = book.volumeInfo.authors
                ? book.volumeInfo.authors[0]
                : "";

            const review = await generateReview(
                book.volumeInfo.title,
                formatPublishedDate(book.volumeInfo.publishedDate),
                author,
            );

            const summary = await generateSummary(
                book.volumeInfo.title,
                formatPublishedDate(book.volumeInfo.publishedDate),
                author,
            );

            let payload: book = {
                user: Number(req.body.userid),
                type: "book",
                date: formatDate(Date.now()),
                title: book.volumeInfo.title,
                category: "fiction",
                author: book.volumeInfo.authors
                    ? book.volumeInfo.authors[0]
                    : "John Smith",
                publisher: book.volumeInfo.publisher
                    ? book.volumeInfo.publisher
                    : "Unknown Publisher",
                language: "en",
                summary: summary,
                review: review,
            };

            const provider = CryptoJS.AES.encrypt(
                JSON.stringify(payload),
                process.env.SECRET_KEY || "",
            ).toString();

            return {
                data: {
                    user: Number(req.body.userid),
                    type: "book",
                    date: formatDate(Date.now()),
                    title: book.volumeInfo.title,
                    bookType: "physical",
                    category: "fiction",
                    noOfPage: book.volumeInfo.pageCount
                        ? book.volumeInfo.pageCount
                        : 25,
                    isbn: book.volumeInfo.industryIdentifiers
                        ? book.volumeInfo.industryIdentifiers[0].identifier
                        : "-",
                    author: book.volumeInfo.authors
                        ? book.volumeInfo.authors[0]
                        : "John Smith",
                    publisher: book.volumeInfo.publisher
                        ? book.volumeInfo.publisher
                        : "Unknown Publisher",
                    publishedYear: formatPublishedDate(
                        book.volumeInfo.publishedDate,
                    ),
                    language: "en",
                    summary: summary,
                    review: review,
                    rating: 5,
                    reviewIsVideo: false,
                    provider: provider,
                },
            };
        } catch (error: unknown) {
            if (error instanceof Error) {
                return `BOOK: ${error.message}`;
            }
        }
    }

    const randomWord = await getRandomWord();
    const randomBook = await getRandomBook(randomWord);

    const url = "https://ains-api.moe.gov.my/api/nilam-records/submit";
    const options = {
        method: "POST",
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:147.0) Gecko/20100101 Firefox/147.0",
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            Authorization: req.body.token,
            Origin: "https://ains.moe.gov.my",
            Referer: "https://ains.moe.gov.my/",
            Cookie: req.body.cookies,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(randomBook),
    };

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            console.log("Something Went Wrong When Submitting");
        }
        const data = await response.json();
        console.log("Submitted Successfuly!");
    } catch (error) {
        console.error(error);
    }

    res.send({
        token: req.body.token,
        cookies: req.body.cookies,
        word: randomWord,
        data: {
            randomBook,
        },
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
});
