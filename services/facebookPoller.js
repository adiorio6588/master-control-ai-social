const database =
    require("../database/database");

const {
    decryptToken
} =
    require("./tokenEncryption");

const {
    generateReply
} =
    require("./openai");

const {
    findMatchingRule
} =
    require("./rulesEngine");


let polling =
    false;


/*
====================================================
AUTOMATION SETTINGS
====================================================
*/

function getAutomationSettings(
    organizationId,
    businessId
) {

    const facebookKey =
        `automation:${organizationId}:${businessId}:facebook`;

    const allKey =
        `automation:${organizationId}:${businessId}:all`;


    let row =
        database
            .prepare(`
                SELECT value
                FROM settings
                WHERE key = ?
            `)
            .get(
                facebookKey
            );


    if (!row) {

        row =
            database
                .prepare(`
                    SELECT value
                    FROM settings
                    WHERE key = ?
                `)
                .get(
                    allKey
                );

    }


    if (!row) {

        return {
            autoGenerate: false,
            requireApproval: true,
            autoRules: false,
            autoPost: false
        };

    }


    try {

        const settings =
            JSON.parse(
                row.value
            );


        return {
            autoGenerate:
                Boolean(
                    settings.autoGenerate
                ),

            requireApproval:
                settings.requireApproval !== false,

            autoRules:
                Boolean(
                    settings.autoRules
                ),

            autoPost:
                Boolean(
                    settings.autoPost
                )
        };

    }
    catch {

        return {
            autoGenerate: false,
            requireApproval: true,
            autoRules: false,
            autoPost: false
        };

    }

}


/*
====================================================
GENERATE AUTOMATIC REPLY
====================================================
*/

async function generateAutomaticReply({
    business,
    commentId,
    externalCommentId,
    content,
    automation,
    pageAccessToken
}) {

    const startedAt =
        Date.now();


    let reply;

    let source =
        "GPT";

    let ruleName =
        null;

    let confidence =
        null;

    let estimatedCost =
        null;


    /*
    ================================================
    RULE ENGINE
    ================================================
    */

    if (
        automation.autoRules
    ) {

        const ruleResult =
            findMatchingRule(
                business.id,
                content
            );


        if (
            ruleResult.matched
        ) {

            reply =
                ruleResult.reply;

            source =
                "RULE";

            ruleName =
                ruleResult.ruleName;

            confidence =
                100;

            estimatedCost =
                0;

        }

    }


    /*
    ================================================
    GPT FALLBACK
    ================================================
    */

    if (!reply) {

        reply =
            await generateReply(
                business.prompt,
                content
            );

        source =
            "GPT";

    }


    const processingTime =
        Date.now() -
        startedAt;


    const finalStatus =
        automation.requireApproval
            ? "replied"
            : "approved";


    const approved =
        automation.requireApproval
            ? 0
            : 1;


    /*
    ================================================
    SAVE GENERATED REPLY
    ================================================
    */

    const replyId =
        database.transaction(
            () => {

                database
                    .prepare(`
                        UPDATE comments

                        SET
                            reply = ?,
                            source = ?,
                            rule = ?,
                            confidence = ?,
                            processing_time = ?,
                            estimated_cost = ?,
                            status = ?,
                            updated_at =
                                CURRENT_TIMESTAMP

                        WHERE id = ?
                    `)
                    .run(
                        reply,
                        source,
                        ruleName,
                        confidence,
                        processingTime,
                        estimatedCost,
                        finalStatus,
                        commentId
                    );


                const result =
                    database
                        .prepare(`
                            INSERT INTO replies (
                                comment_id,
                                content,
                                approved,
                                posted
                            )

                            VALUES (
                                ?,
                                ?,
                                ?,
                                0
                            )
                        `)
                        .run(
                            commentId,
                            reply,
                            approved
                        );


                return Number(
                    result.lastInsertRowid
                );

            }
        )();


    console.log(
        `🤖 Facebook reply generated for comment ${commentId}`
    );


    /*
    ================================================
    AUTO POST TO FACEBOOK
    ================================================
    */

    if (
        automation.autoPost
        &&
        !automation.requireApproval
    ) {

        try {

            if (
                !externalCommentId
                ||
                !pageAccessToken
            ) {

                throw new Error(
                    "Facebook comment ID or Page access token is missing."
                );

            }


            const replyUrl =
                new URL(
                    `https://graph.facebook.com/v26.0/${encodeURIComponent(
                        externalCommentId
                    )}/comments`
                );


            replyUrl.searchParams.set(
                "message",
                reply
            );


            replyUrl.searchParams.set(
                "access_token",
                pageAccessToken
            );


            const response =
                await fetch(
                    replyUrl,
                    {
                        method:
                            "POST",

                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );


            const data =
                await response.json();


            if (
                !response.ok
                ||
                !data.id
            ) {

                throw new Error(
                    data?.error?.message ||
                    "Facebook rejected the automatic reply."
                );

            }


            database.transaction(
                () => {

                    database
                        .prepare(`
                            UPDATE comments

                            SET
                                status = 'posted',
                                updated_at =
                                    CURRENT_TIMESTAMP

                            WHERE id = ?
                        `)
                        .run(
                            commentId
                        );


                    database
                        .prepare(`
                            UPDATE replies

                            SET
                                approved = 1,
                                posted = 1

                            WHERE id = ?
                        `)
                        .run(
                            replyId
                        );

                }
            )();


            console.log(
                `🚀 Facebook reply auto-posted for comment ${commentId}`
            );

        }
        catch (error) {

            console.error(
                `Facebook auto-post failed for comment ${commentId}:`,
                error
            );

        }

    }

}


/*
====================================================
GET FACEBOOK PAGE ACCESS TOKEN
====================================================
*/

async function getPageAccessToken(
    pageId,
    organizationAccessToken
) {

    const accountsUrl =
        new URL(
            "https://graph.facebook.com/v26.0/me/accounts"
        );


    accountsUrl.searchParams.set(
        "fields",
        "id,name,access_token"
    );


    accountsUrl.searchParams.set(
        "access_token",
        organizationAccessToken
    );


    const response =
        await fetch(
            accountsUrl,
            {
                headers: {
                    Accept:
                        "application/json"
                }
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        console.error(
            "Facebook Page token lookup failed:",
            data?.error?.message ||
            data
        );

        return null;

    }


    const pages =
        Array.isArray(
            data.data
        )
            ? data.data
            : [];


    const page =
        pages.find(
            item =>
                String(
                    item.id
                ) === String(
                    pageId
                )
        );


    if (
        !page
        ||
        !page.access_token
    ) {

        return null;

    }


    return {
        id:
            String(
                page.id
            ),

        name:
            page.name || "",

        accessToken:
            page.access_token
    };

}


/*
====================================================
GET FACEBOOK COMMENTS
====================================================
*/

async function getFacebookPosts(
    pageId,
    pageAccessToken
) {

    const feedUrl =
        new URL(
            `https://graph.facebook.com/v26.0/${encodeURIComponent(
                pageId
            )}/feed`
        );


    feedUrl.searchParams.set(
        "fields",
        [
            "id",
            "message",
            "created_time",
            "comments.limit(50){id,message,created_time,from{id,name}}"
        ].join(",")
    );


    feedUrl.searchParams.set(
        "limit",
        "25"
    );


    feedUrl.searchParams.set(
        "access_token",
        pageAccessToken
    );


    const response =
        await fetch(
            feedUrl,
            {
                headers: {
                    Accept:
                        "application/json"
                }
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        console.error(
            `Facebook feed error for Page ${pageId}:`,
            data?.error?.message ||
            data
        );

        return [];

    }


    return data.data || [];

}


/*
====================================================
SYNC FACEBOOK COMMENTS
====================================================
*/

async function syncFacebookComments() {

    if (polling) {
        return;
    }


    polling =
        true;


    try {

        const connections =
            database
                .prepare(`
                    SELECT
                        organization_id,
                        access_token_encrypted

                    FROM social_oauth_connections

                    WHERE
                        provider = 'meta'
                        AND access_token_encrypted != ''
                `)
                .all();


        for (
            const connection of connections
        ) {

            const organizationAccessToken =
                decryptToken(
                    connection
                        .access_token_encrypted
                );


            if (!organizationAccessToken) {
                continue;
            }


            const accounts =
                database
                    .prepare(`
                        SELECT
                            social_accounts.business_id,
                            social_accounts.account_name,
                            social_accounts.external_account_id,
                            businesses.name
                                AS business_name,
                            businesses.prompt

                        FROM social_accounts

                        INNER JOIN businesses
                            ON businesses.id =
                                social_accounts.business_id

                        WHERE
                            businesses.organization_id = ?
                            AND social_accounts.platform = 'facebook'
                            AND social_accounts.connected = 1
                    `)
                    .all(
                        connection.organization_id
                    );


            for (
                const account of accounts
            ) {

                const pageId =
                    String(
                        account.external_account_id ||
                        ""
                    ).trim();


                if (!pageId) {
                    continue;
                }


                /*
                ========================================
                GET PAGE TOKEN
                ========================================
                */

                const page =
                    await getPageAccessToken(
                        pageId,
                        organizationAccessToken
                    );


                if (!page) {

                    console.error(
                        `Facebook Page ${pageId} is not available through the current Meta connection.`
                    );

                    continue;

                }


                /*
                ========================================
                GET POSTS + COMMENTS
                ========================================
                */

                const posts =
                    await getFacebookPosts(
                        pageId,
                        page.accessToken
                    );


                const findExisting =
                    database
                        .prepare(`
                            SELECT id

                            FROM comments

                            WHERE
                                platform = 'facebook'
                                AND external_comment_id = ?
                        `);


                const insertComment =
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
                                'facebook-poller',
                                ?
                            )
                        `);


                let inserted =
                    0;


                /*
                ========================================
                CHECK EACH COMMENT
                ========================================
                */

                for (
                    const post of posts
                ) {

                    const comments =
                        Array.isArray(
                            post
                                ?.comments
                                ?.data
                        )
                            ? post.comments.data
                            : [];


                    for (
                        const comment of comments
                    ) {

                        const id =
                            String(
                                comment.id || ""
                            ).trim();


                        const text =
                            String(
                                comment.message || ""
                            ).trim();


                        const authorId =
                            String(
                                comment
                                    ?.from
                                    ?.id ||
                                ""
                            ).trim();


                        /*
                        ========================================
                        IGNORE OUR OWN PAGE COMMENTS / REPLIES
                        ========================================
                        */

                        if (
                            authorId
                            &&
                            authorId === pageId
                        ) {

                            continue;

                        }


                        /*
                        ========================================
                        IGNORE INVALID / EXISTING COMMENTS
                        ========================================
                        */

                        if (
                            !id
                            ||
                            !text
                            ||
                            findExisting.get(id)
                        ) {

                            continue;

                        }


                        const result =
                            insertComment.run(
                                account.business_id,

                                comment
                                    ?.from
                                    ?.name ||
                                    "Facebook User",

                                text,

                                comment.created_time
                                    ? new Date(
                                        comment.created_time
                                    ).toISOString()
                                    : new Date()
                                        .toISOString(),

                                id
                            );


                        const commentId =
                            Number(
                                result.lastInsertRowid
                            );


                        inserted++;


                        /*
                        ========================================
                        AUTOMATIC REPLY
                        ========================================
                        */

                        const automation =
                            getAutomationSettings(
                                connection.organization_id,
                                account.business_id
                            );


                        if (
                            automation.autoGenerate
                        ) {

                            try {

                                await generateAutomaticReply({

                                    business: {
                                        id:
                                            account.business_id,

                                        name:
                                            account.business_name,

                                        prompt:
                                            account.prompt
                                    },

                                    commentId,

                                    externalCommentId:
                                        id,

                                    content:
                                        text,

                                    automation,

                                    pageAccessToken:
                                        page.accessToken

                                });

                            }
                            catch (error) {

                                console.error(
                                    "Facebook automatic reply failed:",
                                    error
                                );

                            }

                        }

                    }

                }


                if (
                    inserted > 0
                ) {

                    console.log(
                        `✅ Facebook poller added ${inserted} new comment(s) for ${account.account_name}`
                    );

                }

            }

        }

    }
    catch (error) {

        console.error(
            "Facebook poller failed:",
            error
        );

    }
    finally {

        polling =
            false;

    }

}


/*
====================================================
START POLLER
====================================================
*/

function startFacebookPoller() {

    console.log(
        "Facebook comment poller started — checking every 2 minutes."
    );


    syncFacebookComments();


    setInterval(
        syncFacebookComments,
        2 * 60 * 1000
    );

}


module.exports = {
    startFacebookPoller,
    generateAutomaticReply,
    getPageAccessToken,
    getAutomationSettings
};