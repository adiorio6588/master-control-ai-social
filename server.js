require("dotenv").config();


const express =
    require("express");

const cors =
    require("cors");

const path =
    require("path");


/*
====================================================
DATABASE
====================================================
*/

const initializeDatabase =
    require("./database/init");


/*
====================================================
AUTHENTICATION
====================================================
*/

const authMiddleware =
    require("./middleware/auth");


/*
====================================================
ROUTES
====================================================
*/

const authRoutes =
    require("./routes/auth");

const metaRoutes =
    require("./routes/meta");

const webhookRoutes =
    require("./routes/webhooks");

const aiRoutes =
    require("./routes/ai");

const businessRoutes =
    require("./routes/businesses");

const commentsRoutes =
    require("./routes/comments");

const historyRoutes =
    require("./routes/history");

const rulesRoutes =
    require("./routes/rules");

const dashboardRoutes =
    require("./routes/dashboard");

const socialAccountRoutes =
    require("./routes/socialAccounts");

const settingsRoutes =
    require("./routes/settings");


/*
====================================================
INSTAGRAM POLLER
====================================================
*/

const {
    startInstagramPoller
} =
    require("./services/instagramPoller");


/*
====================================================
EXPRESS
====================================================
*/

const app =
    express();


const PORT =
    process.env.PORT ||
    3000;


/*
====================================================
INITIALIZE DATABASE
====================================================
*/

initializeDatabase();


/*
====================================================
GLOBAL MIDDLEWARE
====================================================
*/

app.use(
    cors()
);


app.use(
    express.json({
        limit:
            "1mb"
    })
);


app.use(
    express.urlencoded({
        extended:
            true,

        limit:
            "1mb"
    })
);


/*
====================================================
PUBLIC API STATUS
====================================================
*/

app.get(
    "/api/status",
    (req, res) => {

        res.json({

            status:
                "online",

            system:
                "Master Control",

            message:
                "Master Control AI is running",

            port:
                PORT

        });

    }
);


/*
====================================================
PUBLIC AUTH ROUTES
====================================================
*/

app.use(
    "/api",
    authRoutes
);


/*
====================================================
META OAUTH ROUTES
====================================================
*/

app.use(
    "/api",
    metaRoutes
);


/*
====================================================
META WEBHOOK ROUTES
====================================================
*/

app.use(
    "/api",
    webhookRoutes
);


/*
====================================================
AUTHENTICATED API
====================================================
*/

app.use(
    "/api",
    authMiddleware
);


/*
====================================================
PROTECTED API ROUTES
====================================================
*/

app.use(
    "/api",
    businessRoutes
);


app.use(
    "/api",
    commentsRoutes
);


app.use(
    "/api",
    rulesRoutes
);


app.use(
    "/api",
    historyRoutes
);


app.use(
    "/api",
    dashboardRoutes
);


app.use(
    "/api",
    socialAccountRoutes
);


app.use(
    "/api",
    settingsRoutes
);


app.use(
    "/api",
    aiRoutes
);


/*
====================================================
STATIC FRONTEND
====================================================
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
====================================================
ROOT
====================================================
*/

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "pages",
                "dashboard.html"
            )
        );

    }
);


/*
====================================================
LOGIN
====================================================
*/

app.get(
    "/login",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "pages",
                "login.html"
            )
        );

    }
);


/*
====================================================
REGISTER
====================================================
*/

app.get(
    "/register",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "pages",
                "register.html"
            )
        );

    }
);


/*
====================================================
PRIVACY POLICY
====================================================
*/

app.get(
    "/privacy",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "pages",
                "privacy.html"
            )
        );

    }
);


/*
====================================================
DASHBOARD
====================================================
*/

app.get(
    "/dashboard",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "pages",
                "dashboard.html"
            )
        );

    }
);


/*
====================================================
SOCIAL INBOX
====================================================
*/

app.get(
    "/inbox",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "pages",
                "inbox.html"
            )
        );

    }
);


/*
====================================================
BUSINESSES
====================================================
*/

app.get(
    "/businesses",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "pages",
                "businesses.html"
            )
        );

    }
);


/*
====================================================
RULES
====================================================
*/

app.get(
    "/rules",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "pages",
                "rules.html"
            )
        );

    }
);


/*
====================================================
ANALYTICS
====================================================
*/

app.get(
    "/analytics",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "pages",
                "analytics.html"
            )
        );

    }
);


/*
====================================================
AUTOMATION
====================================================
*/

app.get(
    "/automation",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "pages",
                "automation.html"
            )
        );

    }
);


/*
====================================================
SETTINGS
====================================================
*/

app.get(
    "/settings",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "pages",
                "settings.html"
            )
        );

    }
);


/*
====================================================
UNKNOWN API ROUTE
====================================================
*/

app.use(
    "/api",
    (req, res) => {

        res
            .status(404)
            .json({
                error:
                    "API route not found."
            });

    }
);


/*
====================================================
SERVER ERROR HANDLER
====================================================
*/

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        console.error(
            "Unhandled server error:",
            error
        );


        if (
            res.headersSent
        ) {

            return next(
                error
            );

        }


        res
            .status(500)
            .json({

                error:
                    "An unexpected server error occurred.",

                details:
                    error.message

            });

    }
);


/*
====================================================
START SERVER
====================================================
*/

app.listen(
    PORT,
    () => {

        console.log("");

        console.log(
            "========================================"
        );

        console.log(
            " MASTER CONTROL"
        );

        console.log(
            " Business Operating System"
        );

        console.log(
            "========================================"
        );

        console.log(
            ` Server: http://localhost:${PORT}`
        );

        console.log(
            ` Login: http://localhost:${PORT}/login`
        );

        console.log(
            ` Register: http://localhost:${PORT}/register`
        );

        console.log(
            ` Dashboard: http://localhost:${PORT}/dashboard`
        );

        console.log(
            ` Inbox: http://localhost:${PORT}/inbox`
        );

        console.log(
            ` Businesses: http://localhost:${PORT}/businesses`
        );

        console.log(
            ` Rules: http://localhost:${PORT}/rules`
        );

        console.log(
            ` Analytics: http://localhost:${PORT}/analytics`
        );

        console.log(
            ` Automation: http://localhost:${PORT}/automation`
        );

        console.log(
            ` Settings: http://localhost:${PORT}/settings`
        );

        console.log(
            ` API Status: http://localhost:${PORT}/api/status`
        );

        console.log(
            ` Meta Connect: GET http://localhost:${PORT}/api/meta/connect`
        );

        console.log(
            ` Meta Callback: GET http://localhost:${PORT}/api/meta/callback`
        );

        console.log(
            ` Meta Assets: GET http://localhost:${PORT}/api/meta/assets`
        );

        console.log(
            ` Meta Webhook: GET/POST http://localhost:${PORT}/api/webhooks/meta`
        );

        console.log(
            "========================================"
        );

        console.log("");


        /*
        ================================================
        START INSTAGRAM COMMENT POLLING
        ================================================
        */

        startInstagramPoller();

    }
);