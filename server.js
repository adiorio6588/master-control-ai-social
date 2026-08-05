require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const initializeDatabase =
    require("./database/init");

const aiRoutes =
    require("./routes/ai");

const businessRoutes =
    require("./routes/businesses");

const historyRoutes =
    require("./routes/history");

const rulesRoutes =
    require("./routes/rules");

const commentsRoutes =
    require("./routes/comments");

const dashboardRoutes =
    require("./routes/dashboard");

const app = express();

const PORT =
    process.env.PORT || 3000;

/*
 * Initialize SQLite tables,
 * migrations, indexes, businesses, and rules.
 */
initializeDatabase();

/*
 * Middleware
 */
app.use(cors());

app.use(
    express.json({
        limit: "1mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "1mb"
    })
);

/*
 * API routes
 */
app.use("/api", aiRoutes);
app.use("/api", businessRoutes);
app.use("/api", historyRoutes);
app.use("/api", rulesRoutes);
app.use("/api", commentsRoutes);
app.use("/api", dashboardRoutes);

/*
 * Server status endpoint
 */
app.get("/api/status", (req, res) => {
    res.json({
        status: "online",
        message:
            "Master Control AI is running",
        port: PORT
    });
});

/*
 * Serve frontend files from /public.
 */
app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);

/*
 * Return the current index.html for the root URL.
 *
 * Your index.html currently contains the inbox,
 * so opening localhost:3000 will continue to show it.
 */
app.get("/", (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            "public",
            "index.html"
        )
    );
});

/*
 * Handle unknown API routes.
 */
app.use("/api", (req, res) => {
    res.status(404).json({
        error: "API route not found."
    });
});

/*
 * General server error handler.
 */
app.use((error, req, res, next) => {
    console.error(
        "Unhandled server error:",
        error
    );

    if (res.headersSent) {
        return next(error);
    }

    res.status(500).json({
        error:
            "An unexpected server error occurred."
    });
});

/*
 * Start the server.
 */
app.listen(PORT, () => {
    console.log("");
    console.log(
        "================================="
    );
    console.log(
        " Master Control AI"
    );
    console.log(
        ` Running on http://localhost:${PORT}`
    );
    console.log(
        ` Dashboard API: http://localhost:${PORT}/api/dashboard`
    );
    console.log(
        "================================="
    );
    console.log("");
});