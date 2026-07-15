import express, { type Express, type Request, type Response } from "express";
import { config } from "./config.ts";
import submitRouter from "./routes/submit.route.ts";
import { errorHandler } from "./middleware/error.middleware.ts";

const app: Express = express();

// Middleware for parsing URL-encoded bodies and serving static assets
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Added to support JSON request bodies if needed in the future
app.use(express.static("public"));

// Routes
app.get("/", (req: Request, res: Response) => {
    res.sendFile("index.html", { root: "public" });
});

app.use("/api", submitRouter);

// Global Error Handler Middleware (must be registered after routes)
app.use(errorHandler);

// Start Server
app.listen(config.PORT, () => {
    console.log(`Server running on port http://localhost:${config.PORT}`);
});
