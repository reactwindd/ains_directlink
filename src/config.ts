import "dotenv/config";

// Read and validate environment variables
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
let SECRET_KEY = process.env.SECRET_KEY;
const GOOGLE_BOOKS_API = process.env.GOOGLE_BOOKS_API;
const RANDOM_WORD_API = process.env.RANDOM_WORD_API;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Strip surrounding quotes if present (which happens when Node's native --env_file runs on Windows)
if (SECRET_KEY) {
    if (
        (SECRET_KEY.startsWith('"') && SECRET_KEY.endsWith('"')) ||
        (SECRET_KEY.startsWith("'") && SECRET_KEY.endsWith("'"))
    ) {
        SECRET_KEY = SECRET_KEY.slice(1, -1);
    }
}

// Check critical environment variables
if (!SECRET_KEY) {
    console.warn("WARNING: SECRET_KEY is not defined in environment variables.");
}
if (!GOOGLE_BOOKS_API) {
    console.warn("WARNING: GOOGLE_BOOKS_API is not defined in environment variables.");
}
if (!RANDOM_WORD_API) {
    console.warn("WARNING: RANDOM_WORD_API is not defined in environment variables.");
}
if (!OPENAI_API_KEY) {
    console.warn("WARNING: OPENAI_API_KEY is not defined in environment variables.");
}

export const config = {
    PORT,
    SECRET_KEY: SECRET_KEY || "placeholder_secret_key",
    GOOGLE_BOOKS_API: GOOGLE_BOOKS_API || "",
    RANDOM_WORD_API: RANDOM_WORD_API || "placeholder_key",
    OPENAI_API_KEY: OPENAI_API_KEY || "",
    DEEPSEEK_BASE_URL: "https://api.deepseek.com",
};
