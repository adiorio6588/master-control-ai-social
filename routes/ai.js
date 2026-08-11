const express = require("express");
const router = express.Router();

const database =
    require("../database/database");

const {
    generateReply
} = require("../services/openai");

const {
    findMatchingRule
} = require("../services/rulesEngine");

const {
    detectBusiness
} = require("../services/businessDetector");


/*
====================================================
POST /api/reply
====================================================

Generate a reply for a comment.

All business and comment access is restricted
to the current organization.
====================================================
*/

router.post(
    "/reply",
    async (req, res) => {

        const startedAt =
            Date.now();


        try {

            const organizationId =
                getCurrentOrganizationId(
                    req
                );


            const comment =
                typeof req.body.comment ===
                    "string"

                    ? req.body.comment.trim()

                    : "";


            let businessId =
                Number(
                    req.body.businessId
                )
                ||
                null;


            const requestedCommentId =
                Number(
                    req.body.commentId
                )
                ||
                null;


            let detectedAutomatically =
                false;


            /*
            ====================================================
            VALIDATE COMMENT
            ====================================================
            */

            if (
                !comment
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Comment is required."
                    });

            }


            /*
            ====================================================
            AUTOMATIC BUSINESS DETECTION
            ====================================================

            Business detection may return a business ID,
            but that business is STILL verified against the
            current organization below.
            ====================================================
            */

            if (
                !businessId
            ) {

                const detection =
                detectBusiness(
                    comment,
                    organizationId
                );


                if (
                    !detection.detected
                ) {

                    return res
                        .status(400)
                        .json({
                            error:
                                "Unable to determine which business this comment belongs to."
                        });

                }


                businessId =
                    Number(
                        detection.businessId
                    );


                detectedAutomatically =
                    true;


                console.log(
                    `🧠 Detected business: ` +
                    `${detection.emoji || "🏢"} ` +
                    `${detection.businessName}`
                );

            }


            /*
            ====================================================
            VALIDATE BUSINESS ID
            ====================================================
            */

            if (
                !Number.isInteger(
                    businessId
                )
                ||
                businessId <= 0
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "A valid business ID is required."
                    });

            }


            /*
            ====================================================
            LOAD BUSINESS FOR CURRENT ORGANIZATION
            ====================================================
            */

            const business =
                database
                    .prepare(`
                        SELECT

                            id,

                            organization_id,

                            name,

                            emoji,

                            prompt

                        FROM businesses

                        WHERE

                            id = ?

                            AND organization_id = ?
                    `)
                    .get(
                        businessId,
                        organizationId
                    );


            if (
                !business
            ) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Business not found."
                    });

            }


            /*
            ====================================================
            VERIFY EXISTING INBOX COMMENT
            ====================================================

            If commentId was supplied, verify that comment
            belongs to a business inside this organization.

            This is done BEFORE generating an AI response.
            ====================================================
            */

            let existingInboxComment =
                null;


            if (
                requestedCommentId
            ) {

                existingInboxComment =
                    getTenantCommentById(
                        requestedCommentId,
                        organizationId
                    );


                if (
                    !existingInboxComment
                ) {

                    return res
                        .status(404)
                        .json({
                            error:
                                "Inbox comment not found."
                        });

                }

            }


            /*
            ====================================================
            CHECK REPLY RULES
            ====================================================
            */

            const ruleResult =
                findMatchingRule(
                    business.id,
                    comment
                );


            let reply;

            let source;

            let ruleName =
                null;

            let confidence =
                null;

            let estimatedCost =
                null;


            /*
            ====================================================
            RULE MATCH
            ====================================================
            */

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


                console.log(
                    `✅ Rule matched: ${ruleName}`
                );

            }


            /*
            ====================================================
            GPT / MOCK FALLBACK
            ====================================================
            */

            else {

                source =
                    "GPT";


                console.log(
                    "🤖 No rule matched. Using GPT or mock mode..."
                );


                reply =
                    await generateReply(
                        business.prompt,
                        comment
                    );


                /*
                 * Real GPT confidence and cost stay null
                 * until token usage is tracked.
                 */

                confidence =
                    null;


                estimatedCost =
                    null;

            }


            const processingTime =
                Date.now() -
                startedAt;


            /*
            ====================================================
            SAVE COMMENT + REPLY
            ====================================================
            */

            const saveResult =
                database.transaction(
                    () => {

                        let commentId =
                            requestedCommentId;


                        /*
                        ============================================
                        UPDATE EXISTING COMMENT
                        ============================================
                        */

                        if (
                            commentId
                        ) {

                            const updateResult =
                                database
                                    .prepare(`
                                        UPDATE comments

                                        SET

                                            business_id = ?,

                                            reply = ?,

                                            source = ?,

                                            rule = ?,

                                            confidence = ?,

                                            processing_time = ?,

                                            estimated_cost = ?,

                                            status =
                                                'replied',

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

                                        business.id,

                                        reply,

                                        source,

                                        ruleName,

                                        confidence,

                                        processingTime,

                                        estimatedCost,

                                        commentId,

                                        organizationId

                                    );


                            if (
                                updateResult.changes ===
                                0
                            ) {

                                const error =
                                    new Error(
                                        "Inbox comment not found."
                                    );


                                error.statusCode =
                                    404;


                                throw error;

                            }

                        }


                        /*
                        ============================================
                        CREATE MANUAL COMMENT
                        ============================================
                        */

                        else {

                            const commentResult =
                                database
                                    .prepare(`
                                        INSERT INTO comments (

                                            business_id,

                                            platform,

                                            author,

                                            content,

                                            status,

                                            reply,

                                            source,

                                            rule,

                                            confidence,

                                            processing_time,

                                            estimated_cost,

                                            updated_at

                                        )

                                        VALUES (

                                            ?,

                                            'manual',

                                            'Customer',

                                            ?,

                                            'replied',

                                            ?,

                                            ?,

                                            ?,

                                            ?,

                                            ?,

                                            ?,

                                            CURRENT_TIMESTAMP

                                        )
                                    `)
                                    .run(

                                        business.id,

                                        comment,

                                        reply,

                                        source,

                                        ruleName,

                                        confidence,

                                        processingTime,

                                        estimatedCost

                                    );


                            commentId =
                                Number(
                                    commentResult
                                        .lastInsertRowid
                                );

                        }


                        /*
                        ============================================
                        SAVE REPLY HISTORY
                        ============================================
                        */

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


                        return {

                            commentId,

                            replyId:
                                Number(
                                    replyResult
                                        .lastInsertRowid
                                )

                        };

                    }
                )();


            /*
            ====================================================
            RESPONSE
            ====================================================
            */

            res.json({

                commentId:
                    saveResult.commentId,

                replyId:
                    saveResult.replyId,

                organizationId,

                businessId:
                    business.id,

                business:
                    business.name,

                emoji:
                    business.emoji ||
                    "🏢",

                detectedAutomatically,

                source,

                rule:
                    ruleName,

                confidence,

                processingTime,

                estimatedCost,

                status:
                    "replied",

                reply

            });

        }
        catch (error) {

            const processingTime =
                Date.now() -
                startedAt;


            console.error(
                "Reply generation error:",
                error
            );


            res
                .status(
                    error.statusCode ||
                    500
                )
                .json({

                    error:
                        error.message ||
                        "Unable to generate reply.",

                    processingTime

                });

        }

    }
);


/*
====================================================
GET TENANT COMMENT
====================================================

Returns a comment only when its business belongs
to the current organization.
====================================================
*/

function getTenantCommentById(
    commentId,
    organizationId
) {

    return database
        .prepare(`
            SELECT

                comments.id,

                comments.business_id,

                comments.content,

                comments.status,

                businesses.organization_id

            FROM comments

            INNER JOIN businesses

                ON businesses.id =
                    comments.business_id

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
EXPORT
====================================================
*/

module.exports =
    router;