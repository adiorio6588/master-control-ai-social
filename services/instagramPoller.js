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

    const instagramKey =
        `automation:${organizationId}:${businessId}:instagram`;

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
                instagramKey
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
    organizationId,
    business,
    commentId,
    externalCommentId,
    content,
    automation,
    accessToken
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
        `🤖 Instagram reply generated for comment ${commentId}`
    );


    /*
    ================================================
    AUTO POST TO INSTAGRAM
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
                !accessToken
            ) {

                throw new Error(
                    "Instagram comment ID or access token is missing."
                );

            }


            const replyUrl =
                new URL(
                    `https://graph.instagram.com/v26.0/${encodeURIComponent(
                        externalCommentId
                    )}/replies`
                );


            replyUrl.searchParams.set(
                "message",
                reply
            );


            replyUrl.searchParams.set(
                "access_token",
                accessToken
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
                    "Instagram rejected the automatic reply."
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
                `🚀 Instagram reply auto-posted for comment ${commentId}`
            );

        }
        catch (error) {

            console.error(
                `Instagram auto-post failed for comment ${commentId}:`,
                error
            );

        }

    }

}


/*
====================================================
GET INSTAGRAM COMMENTS FOR POST
====================================================
*/

async function getPostComments(
    mediaId,
    accessToken
) {

    const commentsUrl =
        new URL(
            `https://graph.instagram.com/v26.0/${encodeURIComponent(
                mediaId
            )}/comments`
        );


    commentsUrl.searchParams.set(
        "fields",
        "id,text,timestamp,username"
    );


    commentsUrl.searchParams.set(
        "limit",
        "50"
    );


    commentsUrl.searchParams.set(
        "access_token",
        accessToken
    );


    const response =
        await fetch(
            commentsUrl,
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
            `Instagram comments error for media ${mediaId}:`,
            data?.error?.message ||
            data
        );

        return [];

    }


    return data.data || [];

}


/*
====================================================
SYNC INSTAGRAM COMMENTS
====================================================
*/

async function syncInstagramComments() {

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
                        provider = 'instagram'
                        AND access_token_encrypted != ''
                `)
                .all();


        for (
            const connection of connections
        ) {

            const accessToken =
                decryptToken(
                    connection
                        .access_token_encrypted
                );


            if (!accessToken) {
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
                            AND social_accounts.platform = 'instagram'
                            AND social_accounts.connected = 1
                    `)
                    .all(
                        connection.organization_id
                    );


            for (
                const account of accounts
            ) {

                /*
                ========================================
                GET INSTAGRAM MEDIA
                ========================================
                */

                const mediaUrl =
                    new URL(
                        "https://graph.instagram.com/me/media"
                    );


                mediaUrl.searchParams.set(
                    "fields",
                    "id"
                );


                mediaUrl.searchParams.set(
                    "limit",
                    "25"
                );


                mediaUrl.searchParams.set(
                    "access_token",
                    accessToken
                );


                const response =
                    await fetch(
                        mediaUrl,
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
                        "Instagram polling error:",
                        data?.error?.message ||
                        data
                    );

                    continue;

                }


                const findExisting =
                    database
                        .prepare(`
                            SELECT id

                            FROM comments

                            WHERE
                                platform = 'instagram'
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
                                'instagram',
                                ?,
                                ?,
                                'pending',
                                ?,
                                'instagram-poller',
                                ?
                            )
                        `);


                let inserted =
                    0;


                /*
                ========================================
                CHECK EACH POST DIRECTLY
                ========================================
                */

                for (
                    const post of data.data || []
                ) {

                    if (!post.id) {
                        continue;
                    }


                    const comments =
                        await getPostComments(
                            post.id,
                            accessToken
                        );


                    for (
                        const comment of comments
                    ) {

                        const id =
                            String(
                                comment.id || ""
                            ).trim();


                        const text =
                            String(
                                comment.text || ""
                            ).trim();


                        const commentUsername =
                            String(
                                comment.username || ""
                            )
                                .trim()
                                .toLowerCase();


                        const accountUsername =
                            String(
                                account.account_name || ""
                            )
                                .trim()
                                .toLowerCase();


                        /*
                        ========================================
                        IGNORE OUR OWN COMMENTS / REPLIES
                        ========================================
                        */

                        if (
                            commentUsername
                            &&
                            accountUsername
                            &&
                            commentUsername === accountUsername
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

                                comment.username ||
                                    "Instagram User",

                                text,

                                comment.timestamp
                                    ? new Date(
                                        comment.timestamp
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

                                    organizationId:
                                        connection.organization_id,

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

                                    accessToken

                                });

                            }
                            catch (error) {

                                console.error(
                                    "Instagram automatic reply failed:",
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
                        `✅ Instagram poller added ${inserted} new comment(s) for ${account.account_name}`
                    );

                }

            }

        }

    }
    catch (error) {

        console.error(
            "Instagram poller failed:",
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

function startInstagramPoller() {

    console.log(
        "Instagram comment poller started — checking every 2 minutes."
    );


    syncInstagramComments();


    setInterval(
        syncInstagramComments,
        2 * 60 * 1000
    );

}


module.exports = {
    startInstagramPoller
};