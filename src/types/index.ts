export interface Book {
    user: number;
    type: string;
    date: string;
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
}

export interface SubmitRequestBody {
    userid: string | number;
    token: string;
    cookies: string;
}

export interface NilamPayload {
    data: Book;
}

// Google Books API Interface (partial definition matching what is used)
export interface GoogleBookVolumeInfo {
    title: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    pageCount?: number;
    industryIdentifiers?: Array<{
        type: string;
        identifier: string;
    }>;
}

export interface GoogleBookItem {
    volumeInfo: GoogleBookVolumeInfo;
}

export interface GoogleBooksResponse {
    items?: GoogleBookItem[];
}

export interface JobPayload {
    token: string;
    cookies: string;
    totalRuns: number;
    delaySeconds: number;
}

export interface Job {
    id: string;
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
    payload: JobPayload;
    currentRun: number;
    runsLeft: number;
    nextActionAt: string | null;
    history: Array<{
        run: number;
        status: "SUCCESS" | "FAILED";
        timestamp: string;
        data?: any;
        error?: string;
    }>;
}
