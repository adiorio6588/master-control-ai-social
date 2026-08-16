const express =
    require("express");

const router =
    express.Router();

const database =
    require("../database/database");

const {
    generateReply
} =
    require("../services/openai");

const {
    findMatchingRule
} =
    require("../services/rulesEngine");


/*
====================================================
ALLOWED VALUES
====================================================
*/

const allowedPlatforms = [
    "manual",
    "facebook",
    "instagram",
    "youtube",
    "tiktok"
];

const allowedStatuses = [
    "pending",
    "replied",
    "approved",
    "posted",
    "ignored"
];


/*
====================================================
GET /api/comments
====================================================
*/

router.get(
    "/comments",
    (req, res) => {

        try {

            const organizationId =
                getCurrentOrganizationId(
                    req
                );

            const businessId =
                req.query.businessId
                    ? Number(
                        req.query.businessId
                    )
                    : null;

            const platform =
                normalizeText(
                    req.query.platform
                );

            const status =
                normalizeText(
                    req.query.status
                );


            if (
                businessId !== null
                &&
                (
                    !Number.isInteger(
                        businessId
                    )
                    ||
                    businessId <= 0
                )
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Invalid business ID."
                    });

            }


            if (
                platform
                &&
                !allowedPlatforms.includes(
                    platform
                )
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Invalid social platform."
                    });

            }


            if (
                status
                &&
                !allowedStatuses.includes(
                    status
                )
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Invalid comment status."
                    });

            }


            const conditions = [
                "businesses.organization_id = ?"
            ];

            const values = [
                organizationId
            ];


            if (
                businessId !== null
            ) {

                conditions.push(
                    "comments.business_id = ?"
                );

                values.push(
                    businessId
                );

            }


            if (platform) {

                conditions.push(
                    "comments.platform = ?"
                );

                values.push(
                    platform
                );

            }


            if (status) {

                conditions.push(
                    "comments.status = ?"
                );

                values.push(
                    status
                );

            }


            const whereClause =
                `WHERE ${conditions.join(
                    " AND "
                )}`;


            const comments =
                database
                    .prepare(`
                        SELECT

                            comments.id,

                            comments.business_id,

                            businesses.organization_id,

                            businesses.name
                                AS business_name,

                            businesses.emoji
                                AS business_emoji,

                            comments.platform,

                            comments.author,

                            comments.content,

                            comments.status,

                            COALESCE(
                                comments.reply,
                                replies.content
                            ) AS reply,

                            comments.source,

                            comments.rule,

                            comments.confidence,

                            comments.processing_time,

                            comments.estimated_cost,

                            comments.created_at,

                            comments.updated_at,

                            replies.id
                                AS reply_id,

                            replies.approved,

                            replies.posted

                        FROM comments

                        INNER JOIN businesses

                            ON businesses.id =
                                comments.business_id

                        LEFT JOIN replies

                            ON replies.id = (

                                SELECT
                                    newest_reply.id

                                FROM replies
                                    AS newest_reply

                                WHERE
                                    newest_reply.comment_id =
                                        comments.id

                                ORDER BY
                                    newest_reply.id DESC

                                LIMIT 1
                            )

                        ${whereClause}

                        ORDER BY
                            comments.id DESC

                        LIMIT 100
                    `)
                    .all(
                        ...values
                    );


            res.json(
                comments
            );

        }
        catch (error) {

            console.error(
                "Load comments error:",
                error
            );

            res
                .status(500)
                .json({
                    error:
                        "Unable to load inbox comments.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
GET /api/comments/:id
====================================================
*/

router.get(
    "/comments/:id",
    (req, res) => {

        try {

            const organizationId =
                getCurrentOrganizationId(
                    req
                );

            const commentId =
                Number(
                    req.params.id
                );


            if (
                !Number.isInteger(
                    commentId
                )
                ||
                commentId <= 0
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "A valid comment ID is required."
                    });

            }


            const comment =
                getCommentById(
                    commentId,
                    organizationId
                );


            if (!comment) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Comment not found."
                    });

            }


            res.json(
                comment
            );

        }
        catch (error) {

            console.error(
                "Load comment error:",
                error
            );

            res
                .status(500)
                .json({
                    error:
                        "Unable to load the comment.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
POST /api/comments
====================================================
*/

router.post(
    "/comments",
    async (req, res) => {

        try {

            const organizationId =
                getCurrentOrganizationId(
                    req
                );


            const {
                businessId,
                platform = "manual",
                author = "Customer",
                content
            } =
                req.body;


            const numericBusinessId =
                Number(
                    businessId
                );


            const normalizedPlatform =
                normalizeText(
                    platform
                )
                ||
                "manual";


            const normalizedAuthor =
                String(
                    author ||
                    "Customer"
                )
                    .trim()
                ||
                "Customer";


            const normalizedContent =
                typeof content === "string"
                    ? content.trim()
                    : "";


            /*
            ====================================================
            VALIDATION
            ====================================================
            */

            if (
                !Number.isInteger(
                    numericBusinessId
                )
                ||
                numericBusinessId <= 0
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Business is required."
                    });

            }


            if (!normalizedContent) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Comment text is required."
                    });

            }


            if (
                !allowedPlatforms.includes(
                    normalizedPlatform
                )
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Invalid social platform."
                    });

            }


            /*
            ====================================================
            VERIFY BUSINESS
            ====================================================
            */

            const business =
                database
                    .prepare(`
                        SELECT

                            id,

                            name,

                            emoji,

                            prompt

                        FROM businesses

                        WHERE

                            id = ?

                            AND organization_id = ?
                    `)
                    .get(
                        numericBusinessId,
                        organizationId
                    );


            if (!business) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Business not found."
                    });

            }


            /*
            ====================================================
            CREATE COMMENT
            ====================================================
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

                            updated_at

                        )

                        VALUES (
                            ?,
                            ?,
                            ?,
                            ?,
                            'pending',
                            CURRENT_TIMESTAMP
                        )
                    `)
                    .run(

                        numericBusinessId,

                        normalizedPlatform,

                        normalizedAuthor,

                        normalizedContent

                    );


            const commentId =
                Number(
                    result.lastInsertRowid
                );


            /*
            ====================================================
            LOAD AUTOMATION SETTINGS
            ====================================================
            */

            const automation =
                getAutomationSettings(
                    organizationId,
                    numericBusinessId,
                    normalizedPlatform
                );


            /*
            ====================================================
            AUTO GENERATE REPLY
            ====================================================
            */

            if (
                automation.autoGenerate
            ) {

                try {

                    await generateAutomaticReply({

                        organizationId,

                        business,

                        commentId,

                        content:
                            normalizedContent,

                        useRules:
                            automation.autoRules,

                        requireApproval:
                            automation.requireApproval

                    });

                }
                catch (automationError) {

                    console.error(
                        "Automatic reply generation failed:",
                        automationError
                    );

                }

            }


            /*
            ====================================================
            RESPONSE
            ====================================================
            */

            const comment =
                getCommentById(
                    commentId,
                    organizationId
                );


            res
                .status(201)
                .json(
                    comment
                );

        }
        catch (error) {

            console.error(
                "Create comment error:",
                error
            );


            res
                .status(500)
                .json({
                    error:
                        "Unable to create the inbox comment.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
PUT /api/comments/:id
====================================================
*/

router.put(
    "/comments/:id",
    (req, res) => {

        try {

            const organizationId =
                getCurrentOrganizationId(
                    req
                );

            const commentId =
                Number(
                    req.params.id
                );


            if (
                !Number.isInteger(
                    commentId
                )
                ||
                commentId <= 0
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "A valid comment ID is required."
                    });

            }


            const existingComment =
                getCommentById(
                    commentId,
                    organizationId
                );


            if (!existingComment) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Comment not found."
                    });

            }


            const businessId =
                req.body.businessId !==
                    undefined

                    ? Number(
                        req.body.businessId
                    )

                    : existingComment
                        .business_id;


            const platform =
                req.body.platform !==
                    undefined

                    ? normalizeText(
                        req.body.platform
                    )

                    : existingComment
                        .platform;


            const author =
                req.body.author !==
                    undefined

                    ? String(
                        req.body.author
                    ).trim()

                    : existingComment
                        .author;


            const content =
                req.body.content !==
                    undefined

                    ? String(
                        req.body.content
                    ).trim()

                    : existingComment
                        .content;


            const status =
                req.body.status !==
                    undefined

                    ? normalizeText(
                        req.body.status
                    )

                    : existingComment
                        .status;


            if (
                !Number.isInteger(
                    Number(
                        businessId
                    )
                )
                ||
                Number(
                    businessId
                ) <= 0
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Business is required."
                    });

            }


            if (!content) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Comment text is required."
                    });

            }


            if (
                !allowedPlatforms.includes(
                    platform
                )
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Invalid social platform."
                    });

            }


            if (
                !allowedStatuses.includes(
                    status
                )
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Invalid comment status."
                    });

            }


            const business =
                database
                    .prepare(`
                        SELECT
                            id

                        FROM businesses

                        WHERE

                            id = ?

                            AND organization_id = ?
                    `)
                    .get(
                        Number(
                            businessId
                        ),
                        organizationId
                    );


            if (!business) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Business not found."
                    });

            }


            const result =
                database
                    .prepare(`
                        UPDATE comments

                        SET

                            business_id = ?,

                            platform = ?,

                            author = ?,

                            content = ?,

                            status = ?,

                            updated_at =
                                CURRENT_TIMESTAMP

                        WHERE

                            id = ?

                            AND EXISTS (

                                SELECT 1

                                FROM businesses

                                WHERE

                                    businesses.id =
                                        comments.business_id

                                    AND businesses.organization_id = ?
                            )
                    `)
                    .run(

                        Number(
                            businessId
                        ),

                        platform,

                        author ||
                            "Customer",

                        content,

                        status,

                        commentId,

                        organizationId

                    );


            if (
                result.changes === 0
            ) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Comment not found."
                    });

            }


            res.json(
                getCommentById(
                    commentId,
                    organizationId
                )
            );

        }
        catch (error) {

            console.error(
                "Update comment error:",
                error
            );


            res
                .status(500)
                .json({
                    error:
                        "Unable to update the inbox comment.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
POST /api/comments/:id/reply
====================================================
*/

router.post(
    "/comments/:id/reply",
    (req, res) => {

        try {

            const organizationId =
                getCurrentOrganizationId(
                    req
                );

            const commentId =
                Number(
                    req.params.id
                );

            const reply =
                typeof req.body.reply ===
                    "string"

                    ? req.body.reply.trim()

                    : "";


            if (
                !Number.isInteger(
                    commentId
                )
                ||
                commentId <= 0
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "A valid comment ID is required."
                    });

            }


            if (!reply) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Reply text is required."
                    });

            }


            const comment =
                getCommentById(
                    commentId,
                    organizationId
                );


            if (!comment) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Comment not found."
                    });

            }


            const saveReply =
                database.transaction(
                    () => {

                        const updateResult =
                            database
                                .prepare(`
                                    UPDATE comments

                                    SET

                                        reply = ?,

                                        status =
                                            CASE

                                                WHEN status =
                                                    'pending'

                                                THEN
                                                    'replied'

                                                ELSE
                                                    status
                                            END,

                                        updated_at =
                                            CURRENT_TIMESTAMP

                                    WHERE

                                        id = ?

                                        AND EXISTS (

                                            SELECT 1

                                            FROM businesses

                                            WHERE

                                                businesses.id =
                                                    comments.business_id

                                                AND businesses.organization_id = ?
                                        )
                                `)
                                .run(

                                    reply,

                                    commentId,

                                    organizationId

                                );


                        if (
                            updateResult.changes ===
                            0
                        ) {

                            throw new Error(
                                "Comment not found."
                            );

                        }


                        const replyResult =
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
                                        0,
                                        0
                                    )
                                `)
                                .run(

                                    commentId,

                                    reply

                                );


                        return Number(
                            replyResult
                                .lastInsertRowid
                        );

                    }
                );


            const replyId =
                saveReply();


            res.json({

                success:
                    true,

                replyId,

                ...getCommentById(
                    commentId,
                    organizationId
                )

            });

        }
        catch (error) {

            console.error(
                "Save comment reply error:",
                error
            );


            res
                .status(500)
                .json({
                    error:
                        "Unable to save the reply.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
PATCH /api/comments/:id/status
====================================================
*/

router.patch(
    "/comments/:id/status",
    (req, res) => {

        try {

            const organizationId =
                getCurrentOrganizationId(
                    req
                );

            const commentId =
                Number(
                    req.params.id
                );

            const status =
                normalizeText(
                    req.body.status
                );


            if (
                !Number.isInteger(
                    commentId
                )
                ||
                commentId <= 0
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "A valid comment ID is required."
                    });

            }


            if (
                !allowedStatuses.includes(
                    status
                )
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Invalid comment status."
                    });

            }


            const existingComment =
                getCommentById(
                    commentId,
                    organizationId
                );


            if (!existingComment) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Comment not found."
                    });

            }


            if (
                (
                    status ===
                        "approved"

                    ||
                    status ===
                        "posted"
                )

                &&
                !String(
                    existingComment.reply ||
                    ""
                ).trim()
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Generate or save a reply before approving or posting."
                    });

            }


            if (
                status ===
                    "posted"

                &&
                existingComment.status !==
                    "approved"

                &&
                existingComment.status !==
                    "posted"
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Approve the reply before marking it as posted."
                    });

            }


            const result =
                database
                    .prepare(`
                        UPDATE comments

                        SET

                            status = ?,

                            updated_at =
                                CURRENT_TIMESTAMP

                        WHERE

                            id = ?

                            AND EXISTS (

                                SELECT 1

                                FROM businesses

                                WHERE

                                    businesses.id =
                                        comments.business_id

                                    AND businesses.organization_id = ?
                            )
                    `)
                    .run(

                        status,

                        commentId,

                        organizationId

                    );


            if (
                result.changes === 0
            ) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Comment not found."
                    });

            }


            const latestReply =
                database
                    .prepare(`
                        SELECT
                            replies.id

                        FROM replies

                        INNER JOIN comments

                            ON comments.id =
                                replies.comment_id

                        INNER JOIN businesses

                            ON businesses.id =
                                comments.business_id

                        WHERE

                            replies.comment_id = ?

                            AND businesses.organization_id = ?

                        ORDER BY
                            replies.id DESC

                        LIMIT 1
                    `)
                    .get(

                        commentId,

                        organizationId

                    );


            if (latestReply) {

                if (
                    status ===
                    "approved"
                ) {

                    database
                        .prepare(`
                            UPDATE replies

                            SET

                                approved = 1,

                                posted = 0

                            WHERE id = ?
                        `)
                        .run(
                            latestReply.id
                        );

                }


                if (
                    status ===
                    "posted"
                ) {

                    database
                        .prepare(`
                            UPDATE replies

                            SET

                                approved = 1,

                                posted = 1

                            WHERE id = ?
                        `)
                        .run(
                            latestReply.id
                        );

                }


                if (
                    status ===
                        "pending"

                    ||
                    status ===
                        "replied"

                    ||
                    status ===
                        "ignored"
                ) {

                    database
                        .prepare(`
                            UPDATE replies

                            SET

                                approved = 0,

                                posted = 0

                            WHERE id = ?
                        `)
                        .run(
                            latestReply.id
                        );

                }

            }


            res.json(
                getCommentById(
                    commentId,
                    organizationId
                )
            );

        }
        catch (error) {

            console.error(
                "Update comment status error:",
                error
            );


            res
                .status(500)
                .json({
                    error:
                        "Unable to update the comment status.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
DELETE /api/comments/:id
====================================================
*/

router.delete(
    "/comments/:id",
    (req, res) => {

        try {

            const organizationId =
                getCurrentOrganizationId(
                    req
                );

            const commentId =
                Number(
                    req.params.id
                );


            if (
                !Number.isInteger(
                    commentId
                )
                ||
                commentId <= 0
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "A valid comment ID is required."
                    });

            }


            const comment =
                getCommentById(
                    commentId,
                    organizationId
                );


            if (!comment) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Comment not found."
                    });

            }


            const deleteComment =
                database.transaction(
                    () => {

                        database
                            .prepare(`
                                DELETE FROM replies

                                WHERE comment_id = ?
                            `)
                            .run(
                                commentId
                            );


                        const result =
                            database
                                .prepare(`
                                    DELETE FROM comments

                                    WHERE

                                        id = ?

                                        AND EXISTS (

                                            SELECT 1

                                            FROM businesses

                                            WHERE

                                                businesses.id =
                                                    comments.business_id

                                                AND businesses.organization_id = ?
                                        )
                                `)
                                .run(

                                    commentId,

                                    organizationId

                                );


                        if (
                            result.changes ===
                            0
                        ) {

                            throw new Error(
                                "Comment not found."
                            );

                        }

                    }
                );


            deleteComment();


            res.json({

                success:
                    true,

                message:
                    `Comment from ${comment.author} was deleted.`

            });

        }
        catch (error) {

            console.error(
                "Delete comment error:",
                error
            );


            res
                .status(500)
                .json({
                    error:
                        "Unable to delete the inbox comment.",

                    details:
                        error.message
                });

        }

    }
);


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
    useRules,
    requireApproval
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
    ====================================================
    RULE ENGINE
    ====================================================
    */

    if (useRules) {

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
    ====================================================
    GPT FALLBACK
    ====================================================
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


    /*
    ====================================================
    APPROVAL BEHAVIOR
    ====================================================
    */

    const finalStatus =
        requireApproval
            ? "replied"
            : "approved";


    const approved =
        requireApproval
            ? 0
            : 1;


    /*
    ====================================================
    SAVE AUTOMATIC REPLY
    ====================================================
    */

    database.transaction(
        () => {

            const updateResult =
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

                        WHERE

                            id = ?

                            AND EXISTS (

                                SELECT 1

                                FROM businesses

                                WHERE

                                    businesses.id =
                                        comments.business_id

                                    AND businesses.organization_id = ?
                            )
                    `)
                    .run(

                        reply,

                        source,

                        ruleName,

                        confidence,

                        processingTime,

                        estimatedCost,

                        finalStatus,

                        commentId,

                        organizationId

                    );


            if (
                updateResult.changes ===
                0
            ) {

                throw new Error(
                    "Unable to save automatic reply."
                );

            }


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


    return reply;

}


/*
====================================================
AUTOMATION SETTINGS
====================================================
*/

function getAutomationSettings(
    organizationId,
    businessId,
    platform
) {

    const platformKey =
        getAutomationKey(
            organizationId,
            businessId,
            platform
        );


    let row =
        database
            .prepare(`
                SELECT value

                FROM settings

                WHERE key = ?
            `)
            .get(
                platformKey
            );


    /*
    ====================================================
    FALL BACK TO ALL PLATFORMS
    ====================================================
    */

    if (
        !row
        &&
        platform !== "all"
    ) {

        const allPlatformsKey =
            getAutomationKey(
                organizationId,
                businessId,
                "all"
            );


        row =
            database
                .prepare(`
                    SELECT value

                    FROM settings

                    WHERE key = ?
                `)
                .get(
                    allPlatformsKey
                );

    }


    if (!row) {

        return {

            autoGenerate:
                false,

            requireApproval:
                true,

            autoRules:
                false,

            autoPost:
                false

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
                settings.requireApproval !==
                false,

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

            autoGenerate:
                false,

            requireApproval:
                true,

            autoRules:
                false,

            autoPost:
                false

        };

    }

}


/*
====================================================
AUTOMATION KEY
====================================================
*/

function getAutomationKey(
    organizationId,
    businessId,
    platform
) {

    return (
        "automation:" +
        organizationId +
        ":" +
        businessId +
        ":" +
        platform
    );

}


/*
====================================================
GET COMMENT BY ID
====================================================
*/

function getCommentById(
    commentId,
    organizationId
) {

    return database
        .prepare(`
            SELECT

                comments.id,

                comments.business_id,

                businesses.organization_id,

                businesses.name
                    AS business_name,

                businesses.emoji
                    AS business_emoji,

                comments.platform,

                comments.author,

                comments.content,

                comments.status,

                COALESCE(
                    comments.reply,
                    replies.content
                ) AS reply,

                comments.source,

                comments.rule,

                comments.confidence,

                comments.processing_time,

                comments.estimated_cost,

                comments.created_at,

                comments.updated_at,

                replies.id
                    AS reply_id,

                replies.approved,

                replies.posted

            FROM comments

            INNER JOIN businesses

                ON businesses.id =
                    comments.business_id

            LEFT JOIN replies

                ON replies.id = (

                    SELECT
                        newest_reply.id

                    FROM replies
                        AS newest_reply

                    WHERE
                        newest_reply.comment_id =
                            comments.id

                    ORDER BY
                        newest_reply.id DESC

                    LIMIT 1
                )

            WHERE

                comments.id = ?

                AND businesses.organization_id = ?
        `)
        .get(

            Number(
                commentId
            ),

            Number(
                organizationId
            )

        );

}


/*
====================================================
CURRENT ORGANIZATION
====================================================
*/

function getCurrentOrganizationId(
    req
) {

    const organizationId =
        Number(
            req.organizationId
        );


    if (
        !Number.isInteger(
            organizationId
        )
        ||
        organizationId <= 0
    ) {

        throw new Error(
            "Organization context is missing."
        );

    }


    return organizationId;

}


/*
====================================================
NORMALIZE TEXT
====================================================
*/

function normalizeText(
    value
) {

    return typeof value ===
        "string"

        ? value
            .trim()
            .toLowerCase()

        : "";

}


/*
====================================================
EXPORT
====================================================
*/

module.exports =
    router;