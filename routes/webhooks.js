const express =
    require("express");


const database =
    require("../database/database");


const {
    decryptToken
} =
    require("../services/tokenEncryption");


const {
    generateReply
} =
    require("../services/openai");


const {
    generateAutomaticReply,
    getPageAccessToken,
    getAutomationSettings
} =
    require("../services/facebookPoller");


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
    async (req, res) => {

        try {

            const body =
                req.body;

                console.log(
                    "📨 Incoming Meta webhook:",
                    {
                        object:
                            body?.object || null,
                
                        entries:
                            Array.isArray(
                                body?.entry
                            )
                                ? body.entry.length
                                : 0
                    }
                );

                console.log(
                    "META RAW:",
                    JSON.stringify(body, null, 2)
                );

            /*
            ============================================
            ONLY PROCESS PAGE EVENTS
            ============================================
            */

           if (!body) {

            return res
                .sendStatus(404);
        
        }
        
        
        /*
        ====================================================
        INSTAGRAM COMMENT EVENTS
        ====================================================
        */
        
        if (
            body.object === "instagram"
        ) {
        
            const entries =
                Array.isArray(
                    body.entry
                )
                    ? body.entry
                    : [];
        
        
            for (
                const entry of entries
            ) {
        
                const instagramAccountId =
                    String(
                        entry.id ||
                        ""
                    ).trim();
        
        
                if (!instagramAccountId) {
                    continue;
                }

                /*
                ====================================================
                INSTAGRAM DIRECT MESSAGES
                ====================================================
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
                            businesses.organization_id,
                            businesses.prompt

                        FROM social_accounts

                        INNER JOIN businesses
                            ON businesses.id =
                                social_accounts.business_id

                        WHERE
                            social_accounts.platform = 'instagram'
                            AND social_accounts.external_account_id = ?
                            AND social_accounts.connected = 1
                    `)
                    .get(
                        instagramAccountId
                    );


                const messagingEvents =
                Array.isArray(
                    entry.messaging
                )
                    ? entry.messaging
                    : [];


                for (
                const event of messagingEvents
                ) {

                if (!socialAccount) {

                    console.log(
                        "Instagram DM ignored — account is not assigned:",
                        {
                            instagramAccountId
                        }
                    );

                    continue;

                }


                const senderId =
                    String(
                        event?.sender?.id ||
                        ""
                    ).trim();


                const message =
                    event?.message ||
                    {};


                const externalMessageId =
                    String(
                        message.mid ||
                        ""
                    ).trim();


                const content =
                    String(
                        message.text ||
                        ""
                    ).trim();


                if (
                    message.is_echo
                    ||
                    senderId === instagramAccountId
                ) {

                    continue;

                }


                if (
                    !senderId
                    ||
                    !externalMessageId
                    ||
                    !content
                ) {

                    continue;

                }


                const existingMessage =
                    database
                        .prepare(`
                            SELECT id

                            FROM messages

                            WHERE
                                platform = 'instagram'
                                AND external_message_id = ?
                        `)
                        .get(
                            externalMessageId
                        );


                if (existingMessage) {

                    continue;

                }


                let createdAt =
                    new Date()
                        .toISOString();


                const timestamp =
                    Number(
                        event.timestamp
                    );


                if (
                    Number.isFinite(timestamp)
                    &&
                    timestamp > 0
                ) {

                    createdAt =
                        new Date(
                            timestamp
                        )
                            .toISOString();

                }


                const result =
                    database
                        .prepare(`
                            INSERT INTO messages (
                                business_id,
                                platform,
                                sender_id,
                                sender_name,
                                content,
                                external_message_id,
                                conversation_id,
                                direction,
                                status,
                                source,
                                created_at
                            )

                            VALUES (
                                ?,
                                'instagram',
                                ?,
                                'Instagram User',
                                ?,
                                ?,
                                ?,
                                'incoming',
                                'pending',
                                'meta',
                                ?
                            )
                        `)
                        .run(
                            socialAccount.business_id,
                            senderId,
                            content,
                            externalMessageId,
                            senderId,
                            createdAt
                        );


                const localMessageId =
                    Number(
                        result.lastInsertRowid
                    );


                console.log(
                    "✅ Instagram DM added:",
                    {
                        localMessageId,

                        businessId:
                            socialAccount.business_id,

                        business:
                            socialAccount.business_name,

                        instagramAccountId,

                        senderId,

                        externalMessageId,

                        message:
                            content
                    }
                );

                    /*
                    ====================================================
                    INSTAGRAM DM AUTOMATIC REPLY GENERATION
                    ====================================================
                    */

                    const automation =
                        getAutomationSettings(
                            socialAccount.organization_id,
                            socialAccount.business_id
                        );


                    if (
                        automation.autoGenerate
                    ) {

                        try {

                            const reply =
                                await generateReply(
                                    socialAccount.prompt,
                                    content
                                );


                            database
                                .prepare(`
                                    UPDATE messages

                                    SET
                                        reply = ?,
                                        status = ?,
                                        source = 'GPT',
                                        updated_at = CURRENT_TIMESTAMP

                                    WHERE id = ?
                                `)
                                .run(
                                    reply,
                                    automation.requireApproval
                                        ? 'replied'
                                        : 'approved',
                                    localMessageId
                                );


                            console.log(
                                `🤖 Instagram DM reply generated for message ${localMessageId}`
                            );

                            if (
                                automation.autoPost
                                &&
                                !automation.requireApproval
                            ) {

                                const connection =
                                    database
                                        .prepare(`
                                            SELECT access_token_encrypted

                                            FROM social_oauth_connections

                                            WHERE
                                                organization_id = ?
                                                AND provider = 'meta'
                                                AND access_token_encrypted != ''

                                            LIMIT 1
                                        `)
                                        .get(
                                            socialAccount.organization_id
                                        );


                                if (!connection) {

                                    throw new Error(
                                        "Meta connection not found."
                                    );

                                }


                                const organizationAccessToken =
                                    decryptToken(
                                        connection.access_token_encrypted
                                    );


                                const facebookAccount =
                                    database
                                        .prepare(`
                                            SELECT external_account_id

                                            FROM social_accounts

                                            WHERE
                                                business_id = ?
                                                AND platform = 'facebook'
                                                AND connected = 1

                                            LIMIT 1
                                        `)
                                        .get(
                                            socialAccount.business_id
                                        );


                                if (
                                    !facebookAccount
                                    ||
                                    !facebookAccount.external_account_id
                                ) {

                                    throw new Error(
                                        "Connected Facebook Page not found for Instagram account."
                                    );

                                }


                                const page =
                                    await getPageAccessToken(
                                        facebookAccount.external_account_id,
                                        organizationAccessToken
                                    );


                                if (!page) {

                                    throw new Error(
                                        "Facebook Page access token not available for Instagram messaging."
                                    );

                                }


                                const response =
                                    await fetch(
                                        `https://graph.facebook.com/v26.0/${encodeURIComponent(
                                            facebookAccount.external_account_id
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


                                database
                                    .prepare(`
                                        UPDATE messages

                                        SET
                                            status = 'posted',
                                            updated_at = CURRENT_TIMESTAMP

                                        WHERE id = ?
                                    `)
                                    .run(
                                        localMessageId
                                    );


                                console.log(
                                    `🚀 Instagram DM reply auto-posted for message ${localMessageId}`
                                );

                            }

                        }
                        catch (error) {

                            console.error(
                                `Instagram DM reply generation failed for message ${localMessageId}:`,
                                error
                            );

                        }

                    }


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
                        )
                            .trim()
                            .toLowerCase();
        
        
                    if (
                        field !== "comments"
                    ) {
        
                        continue;
        
                    }
        
        
                    const value =
                        change.value ||
                        {};
        
        
                    const externalCommentId =
                        String(
                            value.id ||
                            ""
                        ).trim();
        
        
                    const message =
                        String(
                            value.text ||
                            ""
                        ).trim();
        
        
                    const senderName =
                        String(
                            value
                                ?.from
                                ?.username ||
                            "Instagram User"
                        ).trim();
        
        
                    const senderId =
                        String(
                            value
                                ?.from
                                ?.id ||
                            ""
                        ).trim();
        
        
                    /*
                    ============================================
                    FIND CONNECTED INSTAGRAM BUSINESS
                    ============================================
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
                                    social_accounts.platform = 'instagram'
                                    AND social_accounts.external_account_id = ?
                                    AND social_accounts.connected = 1
                            `)
                            .get(
                                instagramAccountId
                            );
        
        
                    if (!socialAccount) {
        
                        console.log(
                            "Instagram webhook ignored — account is not assigned:",
                            {
                                instagramAccountId,
                                externalCommentId
                            }
                        );
        
                        continue;
        
                    }
        
        
                    /*
                    ============================================
                    IGNORE OWN INSTAGRAM COMMENTS
                    ============================================
                    */
        
                    if (
                        senderId
                        &&
                        senderId ===
                            instagramAccountId
                    ) {
        
                        console.log(
                            "Instagram webhook ignored self-comment:",
                            {
                                instagramAccountId,
                                externalCommentId
                            }
                        );
        
                        continue;
        
                    }
        
        
                    if (
                        !externalCommentId
                        ||
                        !message
                    ) {
        
                        console.log(
                            "Instagram webhook comment skipped:",
                            {
                                instagramAccountId,
                                externalCommentId,
                                hasMessage:
                                    Boolean(message)
                            }
                        );
        
                        continue;
        
                    }
        
        
                    /*
                    ============================================
                    DUPLICATE CHECK
                    ============================================
                    */
        
                    const existing =
                        database
                            .prepare(`
                                SELECT id
        
                                FROM comments
        
                                WHERE
                                    platform = 'instagram'
                                    AND external_comment_id = ?
                            `)
                            .get(
                                externalCommentId
                            );
        
        
                    if (existing) {
        
                        console.log(
                            "Instagram webhook duplicate skipped:",
                            {
                                externalCommentId
                            }
                        );
        
                        continue;
        
                    }
        
        
                    /*
                    ============================================
                    INSERT INTO SOCIAL INBOX
                    ============================================
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
                                    'instagram',
                                    ?,
                                    ?,
                                    'pending',
                                    CURRENT_TIMESTAMP,
                                    'meta',
                                    ?
                                )
                            `)
                            .run(
                                socialAccount.business_id,
                                senderName,
                                message,
                                externalCommentId
                            );
        
        
                    console.log(
                        "✅ Instagram webhook comment added:",
                        {
                            localCommentId:
                                Number(
                                    result.lastInsertRowid
                                ),
        
                            businessId:
                                socialAccount.business_id,
        
                            business:
                                socialAccount.business_name,
        
                            instagramAccountId,
        
                            externalCommentId,
        
                            senderName,
        
                            message
                        }
                    );
        
                }
        
            }
        
        
            return res
                .sendStatus(200);
        
        }
        
        
        /*
        ====================================================
        ONLY PROCESS FACEBOOK PAGE EVENTS
        ====================================================
        */
        
        if (
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
                                businesses.organization_id,
                                businesses.prompt

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


                /*
                ========================================
                FACEBOOK MESSENGER MESSAGES
                ========================================
                */

                const messagingEvents =
                    Array.isArray(
                        entry.messaging
                    )
                        ? entry.messaging
                        : [];


                for (
                    const event of messagingEvents
                ) {

                    const senderId =
                        String(
                            event?.sender?.id ||
                            ""
                        ).trim();


                    const message =
                        event?.message ||
                        {};


                    const externalMessageId =
                        String(
                            message.mid ||
                            ""
                        ).trim();


                    const content =
                        String(
                            message.text ||
                            ""
                        ).trim();


                    if (
                        message.is_echo
                        ||
                        senderId === pageId
                    ) {

                        continue;

                    }


                    if (
                        !senderId
                        ||
                        !externalMessageId
                        ||
                        !content
                    ) {

                        continue;

                    }


                    const existingMessage =
                        database
                            .prepare(`
                                SELECT id

                                FROM messages

                                WHERE
                                    platform = 'facebook'
                                    AND external_message_id = ?
                            `)
                            .get(
                                externalMessageId
                            );


                    if (existingMessage) {

                        continue;

                    }


                    let createdAt =
                        new Date()
                            .toISOString();


                    const timestamp =
                        Number(
                            event.timestamp
                        );


                    if (
                        Number.isFinite(timestamp)
                        &&
                        timestamp > 0
                    ) {

                        createdAt =
                            new Date(
                                timestamp
                            )
                                .toISOString();

                    }


                    const result =
                        database
                            .prepare(`
                                INSERT INTO messages (
                                    business_id,
                                    platform,
                                    sender_id,
                                    sender_name,
                                    content,
                                    external_message_id,
                                    conversation_id,
                                    direction,
                                    status,
                                    source,
                                    created_at
                                )

                                VALUES (
                                    ?,
                                    'facebook',
                                    ?,
                                    'Facebook User',
                                    ?,
                                    ?,
                                    ?,
                                    'incoming',
                                    'pending',
                                    'meta',
                                    ?
                                )
                            `)
                            .run(
                                socialAccount.business_id,
                                senderId,
                                content,
                                externalMessageId,
                                senderId,
                                createdAt
                            );


                    const localMessageId =
                        Number(
                            result.lastInsertRowid
                        );


                    console.log(
                        "✅ Facebook Messenger message added:",
                        {
                            localMessageId,

                            businessId:
                                socialAccount.business_id,

                            business:
                                socialAccount.business_name,

                            pageId,

                            senderId,

                            externalMessageId,

                            message:
                                content
                        }
                    );


                    /*
                    ========================================
                    FACEBOOK MESSENGER AUTOMATIC REPLY
                    ========================================
                    */

                    const automation =
                        getAutomationSettings(
                            socialAccount.organization_id,
                            socialAccount.business_id
                        );


                    if (
                        automation.autoGenerate
                    ) {

                        try {

                            const reply =
                                await generateReply(
                                    socialAccount.prompt,
                                    content
                                );


                            database
                                .prepare(`
                                    UPDATE messages

                                    SET
                                        reply = ?,
                                        status = ?,
                                        source = 'GPT',
                                        updated_at = CURRENT_TIMESTAMP

                                    WHERE id = ?
                                `)
                                .run(
                                    reply,
                                    automation.requireApproval
                                        ? 'replied'
                                        : 'approved',
                                    localMessageId
                                );


                            console.log(
                                `🤖 Messenger reply generated for message ${localMessageId}`
                            );


                            if (
                                automation.autoPost
                                &&
                                !automation.requireApproval
                            ) {

                                const connection =
                                    database
                                        .prepare(`
                                            SELECT access_token_encrypted

                                            FROM social_oauth_connections

                                            WHERE
                                                organization_id = ?
                                                AND provider = 'meta'
                                                AND access_token_encrypted != ''

                                            LIMIT 1
                                        `)
                                        .get(
                                            socialAccount.organization_id
                                        );


                                if (!connection) {

                                    throw new Error(
                                        "Meta connection not found."
                                    );

                                }


                                const organizationAccessToken =
                                    decryptToken(
                                        connection.access_token_encrypted
                                    );


                                const page =
                                    await getPageAccessToken(
                                        pageId,
                                        organizationAccessToken
                                    );


                                if (!page) {

                                    throw new Error(
                                        "Facebook Page access token not available."
                                    );

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


                                database
                                    .prepare(`
                                        UPDATE messages

                                        SET
                                            status = 'posted',
                                            updated_at = CURRENT_TIMESTAMP

                                        WHERE id = ?
                                    `)
                                    .run(
                                        localMessageId
                                    );


                                console.log(
                                    `🚀 Messenger reply auto-posted for message ${localMessageId}`
                                );

                            }

                        }
                        catch (error) {

                            console.error(
                                `Messenger automatic reply failed for message ${localMessageId}:`,
                                error
                            );

                        }

                    }

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
                            value?.from?.id ||
                            value.sender_id ||
                            ""
                        ).trim();


                    const senderName =
                        String(
                            value?.from?.name ||
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


                    const commentId =
                        Number(
                            result.lastInsertRowid
                        );


                    /*
                    ====================================
                    FACEBOOK AUTOMATIC REPLY
                    ====================================
                    */

                    const automation =
                        getAutomationSettings(
                            socialAccount.organization_id,
                            socialAccount.business_id
                        );


                    if (
                        automation.autoGenerate
                    ) {

                        try {

                            const connection =
                                database
                                    .prepare(`
                                        SELECT access_token_encrypted

                                        FROM social_oauth_connections

                                        WHERE
                                            organization_id = ?
                                            AND provider = 'meta'
                                            AND access_token_encrypted != ''

                                        LIMIT 1
                                    `)
                                    .get(
                                        socialAccount.organization_id
                                    );


                            if (!connection) {

                                throw new Error(
                                    "Meta connection not found."
                                );

                            }


                            const organizationAccessToken =
                                decryptToken(
                                    connection.access_token_encrypted
                                );


                            const page =
                                await getPageAccessToken(
                                    pageId,
                                    organizationAccessToken
                                );


                            if (!page) {

                                throw new Error(
                                    "Facebook Page access token not available."
                                );

                            }


                            await generateAutomaticReply({

                                business: {
                                    id:
                                        socialAccount.business_id,

                                    name:
                                        socialAccount.business_name,

                                    prompt:
                                        socialAccount.prompt
                                },

                                commentId,

                                externalCommentId,

                                content:
                                    message,

                                automation,

                                pageAccessToken:
                                    page.accessToken

                            });

                        }
                        catch (error) {

                            console.error(
                                "Facebook webhook automatic reply failed:",
                                error
                            );

                        }

                    }


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