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

No login required.
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
AUTH ROUTES
====================================================

Public:

POST /api/auth/register
POST /api/auth/login

GET /api/auth/me
uses auth middleware inside routes/auth.js
====================================================
*/

app.use(
    "/api",
    authRoutes
);


/*
====================================================
AUTHENTICATED API
====================================================

Everything registered below requires:

Authorization: Bearer <token>

The JWT determines:

req.user
req.organizationId
req.organizationRole
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
CLEAN PAGE ROUTES
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
            ` API Status: http://localhost:${PORT}/api/status`
        );

        console.log(
            ` Register API: POST http://localhost:${PORT}/api/auth/register`
        );

        console.log(
            ` Login API: POST http://localhost:${PORT}/api/auth/login`
        );

        console.log(
            ` Account API: GET http://localhost:${PORT}/api/auth/me`
        );

        console.log(
            "========================================"
        );

        console.log("");

    }
);