const express =
    require("express");

const database =
    require("../database/database");

const {
    decryptToken
} =
    require("../services/tokenEncryption");

const {
    getPageAccessToken
} =
    require("../services/facebookPoller");

const router =
    express.Router();


/*
====================================================
GET CURRENT ORGANIZATION
====================================================
*/

function getCurrentOrganizationId(req) {

    const organizationId =
        Number(
            req.organizationId ||
            req.user?.organizationId ||
            req.user?.organization_id ||
            req.session?.organizationId ||
            0
        );

    return Number.isInteger(organizationId)
        && organizationId > 0
        ? organizationId
        : 0;
}


/*
====================================================
LOAD MESSAGE
====================================================
*/

function getMessage(
    messageId,
    organizationId
) {

    return database
        .prepare(`
            SELECT
                messages.*,
                businesses.organization_id,
                businesses.name AS business_name

            FROM messages

            INNER JOIN businesses
                ON businesses.id =
                    messages.business_id

            WHERE
                messages.id = ?
                AND businesses.organization_id = ?

            LIMIT 1
        `)
        .get(
            messageId,
            organizationId
        );
}


/*
====================================================
POST /api/messages/:id/approve
====================================================
*/

router.post(
    "/messages/:id/approve",
    (req, res) => {

        try {

            const organizationId =
                getCurrentOrganizationId(req);

            const messageId =
                Number(req.params.id);


            if (
                !organizationId
                ||
                !Number.isInteger(messageId)
                ||
                messageId <= 0
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "A valid message ID is required."
                    });

            }


            const message =
                getMessage(
                    messageId,
                    organizationId
                );


            if (!message) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Message not found."
                    });

            }


            const reply =
                String(
                    message.reply ||
                    ""
                ).trim();


            if (!reply) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Generate or save a reply before approving."
                    });

            }


            if (
                message.status ===
                "posted"
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "This message reply has already been posted."
                    });

            }


            database
                .prepare(`
                    UPDATE messages

                    SET
                        status = 'approved',
                        updated_at = CURRENT_TIMESTAMP

                    WHERE id = ?
                `)
                .run(messageId);


            return res.json({
                success: true,
                messageId,
                status:
                    "approved"
            });

        }
        catch (error) {

            console.error(
                "Message approval failed:",
                error
            );


            return res
                .status(500)
                .json({
                    error:
                        "Unable to approve message reply.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
POST /api/messages/:id/post
====================================================
*/

router.post(
    "/messages/:id/post",
    async (req, res) => {

        try {

            const organizationId =
                getCurrentOrganizationId(req);

            const messageId =
                Number(req.params.id);


            if (
                !organizationId
                ||
                !Number.isInteger(messageId)
                ||
                messageId <= 0
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "A valid message ID is required."
                    });

            }


            const message =
                getMessage(
                    messageId,
                    organizationId
                );


            if (!message) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Message not found."
                    });

            }


            const reply =
                String(
                    message.reply ||
                    ""
                ).trim();


            if (!reply) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Generate or save a reply before posting."
                    });

            }


            if (
                message.status !==
                "approved"
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Approve the reply before posting."
                    });

            }


            const senderId =
                String(
                    message.sender_id ||
                    ""
                ).trim();


            if (!senderId) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Message sender ID is missing."
                    });

            }


            /*
            ================================================
            LOAD META CONNECTION
            ================================================
            */

            const connection =
                database
                    .prepare(`
                        SELECT
                            access_token_encrypted

                        FROM social_oauth_connections

                        WHERE
                            organization_id = ?
                            AND provider = 'meta'
                            AND access_token_encrypted != ''

                        LIMIT 1
                    `)
                    .get(
                        organizationId
                    );


            if (!connection) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Meta connection not found."
                    });

            }


            const organizationAccessToken =
                decryptToken(
                    connection
                        .access_token_encrypted
                );


            /*
            ================================================
            FACEBOOK MESSENGER
            ================================================
            */

            if (
                message.platform ===
                "facebook"
            ) {

                const facebookAccount =
                    database
                        .prepare(`
                            SELECT
                                external_account_id

                            FROM social_accounts

                            WHERE
                                business_id = ?
                                AND platform = 'facebook'
                                AND connected = 1

                            LIMIT 1
                        `)
                        .get(
                            message.business_id
                        );


                if (
                    !facebookAccount
                    ||
                    !facebookAccount
                        .external_account_id
                ) {

                    return res
                        .status(400)
                        .json({
                            error:
                                "Connected Facebook Page not found."
                        });

                }


                const page =
                    await getPageAccessToken(
                        facebookAccount
                            .external_account_id,
                        organizationAccessToken
                    );


                if (!page) {

                    return res
                        .status(400)
                        .json({
                            error:
                                "Facebook Page access token not available."
                        });

                }


                const response =
                    await fetch(
                        "https://graph.facebook.com/v26.0/me/messages",
                        {
                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                Accept:
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    recipient: {
                                        id:
                                            senderId
                                    },

                                    messaging_type:
                                        "RESPONSE",

                                    message: {
                                        text:
                                            reply
                                    },

                                    access_token:
                                        page.accessToken
                                })
                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok
                    ||
                    !data.message_id
                ) {

                    throw new Error(
                        data?.error?.message ||
                        "Facebook rejected the Messenger reply."
                    );

                }

            }


            /*
            ================================================
            INSTAGRAM MESSENGER
            ================================================
            */

            else if (
                message.platform ===
                "instagram"
            ) {

                const facebookAccount =
                    database
                        .prepare(`
                            SELECT
                                external_account_id

                            FROM social_accounts

                            WHERE
                                business_id = ?
                                AND platform = 'facebook'
                                AND connected = 1

                            LIMIT 1
                        `)
                        .get(
                            message.business_id
                        );


                if (
                    !facebookAccount
                    ||
                    !facebookAccount
                        .external_account_id
                ) {

                    return res
                        .status(400)
                        .json({
                            error:
                                "Connected Facebook Page not found for Instagram account."
                        });

                }


                const page =
                    await getPageAccessToken(
                        facebookAccount
                            .external_account_id,
                        organizationAccessToken
                    );


                if (!page) {

                    return res
                        .status(400)
                        .json({
                            error:
                                "Facebook Page access token not available for Instagram messaging."
                        });

                }


                const response =
                    await fetch(
                        `https://graph.facebook.com/v26.0/${encodeURIComponent(
                            facebookAccount
                                .external_account_id
                        )}/messages`,
                        {
                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                Accept:
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    recipient: {
                                        id:
                                            senderId
                                    },

                                    messaging_type:
                                        "RESPONSE",

                                    message: {
                                        text:
                                            reply
                                    },

                                    access_token:
                                        page.accessToken
                                })
                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok
                    ||
                    !data.message_id
                ) {

                    throw new Error(
                        data?.error?.message ||
                        "Instagram rejected the DM reply."
                    );

                }

            }


            else {

                return res
                    .status(400)
                    .json({
                        error:
                            "Unsupported messaging platform."
                    });

            }


            /*
            ================================================
            MARK POSTED
            ================================================
            */

            database
                .prepare(`
                    UPDATE messages

                    SET
                        status = 'posted',
                        updated_at = CURRENT_TIMESTAMP

                    WHERE id = ?
                `)
                .run(messageId);


            console.log(
                `🚀 Manual ${message.platform} message reply posted for message ${messageId}`
            );


            return res.json({
                success: true,
                messageId,
                platform:
                    message.platform,
                status:
                    "posted"
            });

        }
        catch (error) {

            console.error(
                "Manual message reply failed:",
                error
            );


            return res
                .status(500)
                .json({
                    error:
                        "Unable to post message reply.",

                    details:
                        error.message
                });

        }

    }
);


module.exports =
    router;
