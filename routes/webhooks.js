const express =
    require("express");


const database =
    require("../database/database");


const router =
    express.Router();


/*
====================================================
MASTER CONTROL
META WEBHOOKS
====================================================
*/


/*
====================================================
GET /api/webhooks/meta
====================================================
*/

router.get(
    "/webhooks/meta",
    (req, res) => {

        const mode =
            req.query["hub.mode"];


        const token =
            req.query["hub.verify_token"];


        const challenge =
            req.query["hub.challenge"];


        const verifyToken =
            process.env
                .META_WEBHOOK_VERIFY_TOKEN;


        if (!verifyToken) {

            console.error(
                "META_WEBHOOK_VERIFY_TOKEN is not configured."
            );


            return res
                .status(500)
                .send(
                    "Webhook verification is not configured."
                );

        }


        if (
            mode === "subscribe"
            &&
            token === verifyToken
        ) {

            console.log(
                "✅ Meta webhook verified."
            );


            return res
                .status(200)
                .send(
                    challenge
                );

        }


        console.warn(
            "Meta webhook verification failed."
        );


        return res
            .sendStatus(403);

    }
);


/*
====================================================
POST /api/webhooks/meta
====================================================

Receives real-time Facebook Page feed events.

For new Facebook comments:

Page ID
    ↓
Find connected Master Control business
    ↓
Check external_comment_id
    ↓
Insert only if new
    ↓
Comment appears in Social Inbox

Facebook Page replies are ignored so Master
Control does not import its own outgoing replies
back into the Inbox.
====================================================
*/

router.post(
    "/webhooks/meta",
    (req, res) => {

        try {

            const body =
                req.body;


            /*
            ============================================
            ONLY PROCESS PAGE EVENTS
            ============================================
            */

            if (
                !body
                ||
                body.object !== "page"
            ) {

                return res
                    .sendStatus(404);

            }


            const entries =
                Array.isArray(
                    body.entry
                )
                    ? body.entry
                    : [];


            for (
                const entry of entries
            ) {

                const pageId =
                    String(
                        entry.id ||
                        ""
                    ).trim();


                if (!pageId) {

                    continue;

                }


                /*
                ========================================
                FIND MASTER CONTROL BUSINESS
                ========================================
                */

                const socialAccount =
                    database
                        .prepare(`
                            SELECT
                                social_accounts.id,
                                social_accounts.business_id,
                                social_accounts.account_name,
                                social_accounts.external_account_id,
                                social_accounts.connected,
                                businesses.name AS business_name,
                                businesses.organization_id

                            FROM social_accounts

                            INNER JOIN businesses

                                ON businesses.id =
                                    social_accounts.business_id

                            WHERE
                                social_accounts.platform = 'facebook'
                                AND social_accounts.external_account_id = ?
                                AND social_accounts.connected = 1
                        `)
                        .get(
                            pageId
                        );


                if (!socialAccount) {

                    console.log(
                        "Meta webhook ignored — Page is not assigned:",
                        {
                            pageId
                        }
                    );

                    continue;

                }


                const changes =
                    Array.isArray(
                        entry.changes
                    )
                        ? entry.changes
                        : [];


                for (
                    const change of changes
                ) {

                    const field =
                        String(
                            change.field ||
                            ""
                        ).trim();


                    const value =
                        change.value ||
                        {};


                    /*
                    ====================================
                    ONLY FACEBOOK FEED COMMENTS
                    ====================================
                    */

                    const item =
                        String(
                            value.item ||
                            ""
                        )
                            .trim()
                            .toLowerCase();


                    const verb =
                        String(
                            value.verb ||
                            ""
                        )
                            .trim()
                            .toLowerCase();


                    if (
                        field !== "feed"
                        ||
                        item !== "comment"
                        ||
                        verb !== "add"
                    ) {

                        continue;

                    }


                    const externalCommentId =
                        String(
                            value.comment_id ||
                            ""
                        ).trim();


                    const message =
                        String(
                            value.message ||
                            ""
                        ).trim();


                    const senderId =
                        String(
                            value.sender_id ||
                            ""
                        ).trim();


                    const senderName =
                        String(
                            value.sender_name ||
                            "Facebook User"
                        ).trim();


                    /*
                    ====================================
                    IGNORE PAGE'S OWN REPLIES
                    ====================================
                    */

                    if (
                        senderId
                        &&
                        senderId === pageId
                    ) {

                        console.log(
                            "Meta webhook ignored Page-authored reply:",
                            {
                                pageId,
                                externalCommentId
                            }
                        );

                        continue;

                    }


                    /*
                    ====================================
                    REQUIRE COMMENT ID + MESSAGE
                    ====================================
                    */

                    if (
                        !externalCommentId
                        ||
                        !message
                    ) {

                        console.log(
                            "Meta webhook comment skipped:",
                            {
                                pageId,
                                externalCommentId,
                                hasMessage:
                                    Boolean(message)
                            }
                        );

                        continue;

                    }


                    /*
                    ====================================
                    DUPLICATE CHECK
                    ====================================
                    */

                    const existing =
                        database
                            .prepare(`
                                SELECT id

                                FROM comments

                                WHERE
                                    platform = 'facebook'
                                    AND external_comment_id = ?
                            `)
                            .get(
                                externalCommentId
                            );


                    if (existing) {

                        console.log(
                            "Meta webhook duplicate skipped:",
                            {
                                externalCommentId
                            }
                        );

                        continue;

                    }


                    /*
                    ====================================
                    CREATED TIME
                    ====================================
                    */

                    let createdAt =
                        new Date()
                            .toISOString();


                    if (
                        value.created_time
                    ) {

                        const createdTimeNumber =
                            Number(
                                value.created_time
                            );


                        if (
                            Number.isFinite(
                                createdTimeNumber
                            )
                        ) {

                            createdAt =
                                new Date(
                                    createdTimeNumber *
                                    1000
                                )
                                    .toISOString();

                        }

                    }


                    /*
                    ====================================
                    INSERT INTO SOCIAL INBOX
                    ====================================
                    */

                    const result =
                        database
                            .prepare(`
                                INSERT INTO comments (
                                    business_id,
                                    platform,
                                    author,
                                    content,
                                    status,
                                    created_at,
                                    source,
                                    external_comment_id
                                )

                                VALUES (
                                    ?,
                                    'facebook',
                                    ?,
                                    ?,
                                    'pending',
                                    ?,
                                    'meta',
                                    ?
                                )
                            `)
                            .run(
                                socialAccount.business_id,
                                senderName,
                                message,
                                createdAt,
                                externalCommentId
                            );


                    console.log(
                        "✅ Facebook webhook comment added:",
                        {
                            localCommentId:
                                Number(
                                    result.lastInsertRowid
                                ),

                            businessId:
                                socialAccount.business_id,

                            business:
                                socialAccount.business_name,

                            pageId,

                            externalCommentId,

                            senderName,

                            message
                        }
                    );

                }

            }


            /*
            ============================================
            ACKNOWLEDGE META
            ============================================
            */

            return res
                .sendStatus(200);

        }
        catch (error) {

            console.error(
                "Meta webhook processing error:",
                error
            );


            /*
            ============================================
            ACKNOWLEDGE DURING DEVELOPMENT
            ============================================
            */

            return res
                .sendStatus(200);

        }

    }
);


module.exports =
    router;