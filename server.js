require("dotenv").config();

const express =
    require("express");

const cors =
    require("cors");

const path =
    require("path");


/*
====================================================
Database
====================================================
*/

const initializeDatabase =
    require("./database/init");


/*
====================================================
Routes
====================================================
*/

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
Express
====================================================
*/

const app =
    express();


const PORT =
    process.env.PORT ||
    3000;


/*
====================================================
Initialize Database
====================================================
*/

initializeDatabase();


/*
====================================================
Middleware
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
API Routes
====================================================
*/

app.use(
    "/api",
    aiRoutes
);


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
    historyRoutes
);


app.use(
    "/api",
    rulesRoutes
);


app.use(
    "/api",
    dashboardRoutes
);


app.use(
    "/api",
    socialAccountRoutes
);


/*
====================================================
System Status
====================================================
*/

app.get(
    "/api/status",
    (req, res) => {

        res.json({
            status:
                "online",

            message:
                "Master Control AI is running",

            port:
                PORT
        });

    }
);


/*
====================================================
Static Frontend
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
Root Dashboard
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
Clean Page Routes
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
Unknown API Route
====================================================
*/

app.use(
    "/api",
    (req, res) => {

        res.status(404).json({
            error:
                "API route not found."
        });

    }
);


/*
====================================================
Server Error Handler
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
                    "An unexpected server error occurred."
            });

    }
);


/*
====================================================
Start Server
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
            ` Dashboard: http://localhost:${PORT}/dashboard`
        );

        console.log(
            ` Inbox: http://localhost:${PORT}/inbox`
        );

        console.log(
            ` Businesses: http://localhost:${PORT}/businesses`
        );

        console.log(
            ` Social Accounts API: http://localhost:${PORT}/api/social-accounts`
        );

        console.log(
            "========================================"
        );

        console.log("");

    }
);