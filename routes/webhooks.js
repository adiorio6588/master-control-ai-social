const express =
    require("express");


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

Meta calls this endpoint when verifying the
webhook configuration.

Meta sends:

hub.mode
hub.verify_token
hub.challenge

If the verify token matches our environment
variable, return hub.challenge.
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


        if (
            !verifyToken
        ) {

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

Receives webhook events from Meta.

For the first test we intentionally DO NOT
write anything to the database.

We only log a sanitized description of incoming
Page feed/comment events.

Once we confirm Meta delivery works, we'll map
the Page ID to the correct Master Control
business and save the comment.
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
            ACKNOWLEDGE ONLY META PAGE EVENTS
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


            /*
            ============================================
            PROCESS ENTRIES
            ============================================
            */

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
                    entry.id
                        ? String(
                            entry.id
                        )
                        : "";


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
                        change.field ||
                        "";


                    const value =
                        change.value ||
                        {};


                    /*
                    ====================================
                    SANITIZED DEVELOPMENT LOG
                    ====================================

                    Do not log tokens or the complete
                    raw webhook payload.
                    ====================================
                    */

                    console.log(
                        "📨 Meta webhook event:",
                        {
                            pageId,

                            field,

                            item:
                                value.item ||
                                null,

                            verb:
                                value.verb ||
                                null,

                            senderId:
                                value.sender_id
                                    ? String(
                                        value.sender_id
                                    )
                                    : null,

                            senderName:
                                value.sender_name ||
                                null,

                            message:
                                typeof value.message ===
                                    "string"
                                    ? value.message
                                    : null,

                            commentId:
                                value.comment_id
                                    ? String(
                                        value.comment_id
                                    )
                                    : null,

                            postId:
                                value.post_id
                                    ? String(
                                        value.post_id
                                    )
                                    : null
                        }
                    );

                }

            }


            /*
            ============================================
            ACKNOWLEDGE EVENT
            ============================================

            Respond quickly so Meta knows the webhook
            was successfully received.
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

            We don't want Meta repeatedly retrying an
            event while we're still building the
            processing pipeline.
            ============================================
            */

            return res
                .sendStatus(200);

        }

    }
);


module.exports =
    router;