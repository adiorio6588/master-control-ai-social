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
    content,
    automation
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

        }
    )();


    console.log(
        `🤖 Instagram reply generated for comment ${commentId}`
    );

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

                const mediaUrl =
                    new URL(
                        "https://graph.instagram.com/me/media"
                    );


                mediaUrl.searchParams.set(
                    "fields",
                    "id,comments.limit(50){id,text,timestamp,username}"
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


                for (
                    const post of data.data || []
                ) {

                    for (
                        const comment of
                        post?.comments?.data || []
                    ) {

                        const id =
                            String(
                                comment.id || ""
                            ).trim();


                        const text =
                            String(
                                comment.text || ""
                            ).trim();


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

                                    content:
                                        text,

                                    automation

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