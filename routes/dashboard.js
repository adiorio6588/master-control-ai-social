const express = require("express");
const router = express.Router();

const database = require("../database/database");


/*
====================================================
GET /api/dashboard
====================================================

Returns dashboard statistics ONLY for the
current organization.
====================================================
*/

router.get("/dashboard", (req, res) => {

    try {

        const organizationId =
            getCurrentOrganizationId(req);


        // TOTAL BUSINESSES
        const businesses = database
            .prepare(`
                SELECT COUNT(*) AS total
                FROM businesses
                WHERE organization_id = ?
            `)
            .get(organizationId)
            .total;


        // TOTAL COMMENTS
        const totalComments = database
            .prepare(`
                SELECT COUNT(*) AS total

                FROM comments

                INNER JOIN businesses
                    ON businesses.id = comments.business_id

                WHERE businesses.organization_id = ?
            `)
            .get(organizationId)
            .total;


        // COMMENTS TODAY
        const commentsToday = database
            .prepare(`
                SELECT COUNT(*) AS total

                FROM comments

                INNER JOIN businesses
                    ON businesses.id = comments.business_id

                WHERE businesses.organization_id = ?

                AND DATE(
                    comments.created_at,
                    'localtime'
                ) = DATE(
                    'now',
                    'localtime'
                )
            `)
            .get(organizationId)
            .total;


        // STATUS COUNTS
        const pending =
            getStatusCount(
                "pending",
                organizationId
            );

        const replied =
            getStatusCount(
                "replied",
                organizationId
            );

        const approved =
            getStatusCount(
                "approved",
                organizationId
            );

        const posted =
            getStatusCount(
                "posted",
                organizationId
            );

        const ignored =
            getStatusCount(
                "ignored",
                organizationId
            );


        // RULE REPLIES
        const ruleReplies = database
            .prepare(`
                SELECT COUNT(*) AS total

                FROM comments

                INNER JOIN businesses
                    ON businesses.id = comments.business_id

                WHERE businesses.organization_id = ?

                AND comments.source = 'RULE'
            `)
            .get(organizationId)
            .total;


        // GPT REPLIES
        const gptReplies = database
            .prepare(`
                SELECT COUNT(*) AS total

                FROM comments

                INNER JOIN businesses
                    ON businesses.id = comments.business_id

                WHERE businesses.organization_id = ?

                AND comments.source = 'GPT'
            `)
            .get(organizationId)
            .total;


        // REPLIES TODAY
        const repliesToday = database
            .prepare(`
                SELECT COUNT(*) AS total

                FROM comments

                INNER JOIN businesses
                    ON businesses.id = comments.business_id

                WHERE businesses.organization_id = ?

                AND comments.reply IS NOT NULL

                AND TRIM(comments.reply) != ''

                AND DATE(
                    COALESCE(
                        comments.updated_at,
                        comments.created_at
                    ),
                    'localtime'
                ) = DATE(
                    'now',
                    'localtime'
                )
            `)
            .get(organizationId)
            .total;


        // AVERAGE PROCESSING TIME
        const averageProcessingResult = database
            .prepare(`
                SELECT
                    ROUND(
                        AVG(comments.processing_time),
                        2
                    ) AS average

                FROM comments

                INNER JOIN businesses
                    ON businesses.id = comments.business_id

                WHERE businesses.organization_id = ?

                AND comments.processing_time IS NOT NULL
            `)
            .get(organizationId);


        const averageProcessingTime =
            averageProcessingResult.average || 0;


        // ESTIMATED COST
        const estimatedCostResult = database
            .prepare(`
                SELECT
                    ROUND(
                        COALESCE(
                            SUM(comments.estimated_cost),
                            0
                        ),
                        4
                    ) AS total

                FROM comments

                INNER JOIN businesses
                    ON businesses.id = comments.business_id

                WHERE businesses.organization_id = ?
            `)
            .get(organizationId);


        const estimatedCost =
            estimatedCostResult.total || 0;


        // ACTIVITY TODAY
        const activityToday = database
            .prepare(`
                SELECT COUNT(*) AS total

                FROM comments

                INNER JOIN businesses
                    ON businesses.id = comments.business_id

                WHERE businesses.organization_id = ?

                AND DATE(
                    COALESCE(
                        comments.updated_at,
                        comments.created_at
                    ),
                    'localtime'
                ) = DATE(
                    'now',
                    'localtime'
                )
            `)
            .get(organizationId)
            .total;


        // BUSINESS ACTIVITY
        const businessActivity = database
            .prepare(`
                SELECT
                    businesses.id,
                    businesses.organization_id,
                    businesses.name,
                    businesses.emoji,

                    COUNT(
                        comments.id
                    ) AS total_comments,

                    SUM(
                        CASE
                            WHEN comments.status = 'pending'
                            THEN 1
                            ELSE 0
                        END
                    ) AS pending_comments,

                    SUM(
                        CASE
                            WHEN comments.status = 'replied'
                            THEN 1
                            ELSE 0
                        END
                    ) AS replied_comments,

                    SUM(
                        CASE
                            WHEN comments.status = 'approved'
                            THEN 1
                            ELSE 0
                        END
                    ) AS approved_comments,

                    SUM(
                        CASE
                            WHEN comments.status = 'posted'
                            THEN 1
                            ELSE 0
                        END
                    ) AS posted_comments,

                    SUM(
                        CASE
                            WHEN comments.status = 'ignored'
                            THEN 1
                            ELSE 0
                        END
                    ) AS ignored_comments,

                    SUM(
                        CASE
                            WHEN comments.source = 'RULE'
                            THEN 1
                            ELSE 0
                        END
                    ) AS rule_replies,

                    SUM(
                        CASE
                            WHEN comments.source = 'GPT'
                            THEN 1
                            ELSE 0
                        END
                    ) AS gpt_replies

                FROM businesses

                LEFT JOIN comments
                    ON comments.business_id = businesses.id

                WHERE businesses.organization_id = ?

                GROUP BY
                    businesses.id,
                    businesses.organization_id,
                    businesses.name,
                    businesses.emoji

                ORDER BY
                    pending_comments DESC,
                    total_comments DESC,
                    businesses.name ASC
            `)
            .all(organizationId);


        // RECENT ACTIVITY
        const recentActivity = database
            .prepare(`
                SELECT
                    comments.id,
                    comments.business_id,

                    businesses.organization_id,

                    businesses.name AS business_name,
                    businesses.emoji AS business_emoji,

                    comments.platform,
                    comments.author,
                    comments.content,
                    comments.status,
                    comments.source,
                    comments.rule,
                    comments.created_at,
                    comments.updated_at

                FROM comments

                INNER JOIN businesses
                    ON businesses.id = comments.business_id

                WHERE businesses.organization_id = ?

                ORDER BY
                    COALESCE(
                        comments.updated_at,
                        comments.created_at
                    ) DESC,

                    comments.id DESC

                LIMIT 10
            `)
            .all(organizationId);


        // RESPONSE
        res.json({

            systemStatus: "online",

            organizationId,

            businesses,

            totalComments,

            commentsToday,

            repliesToday,

            activityToday,

            statuses: {
                pending,
                replied,
                approved,
                posted,
                ignored
            },

            ruleReplies,

            gptReplies,

            averageProcessingTime,

            estimatedCost,

            businessActivity,

            recentActivity

        });

    } catch (error) {

        console.error(
            "Dashboard route error:",
            error
        );

        res.status(500).json({

            error:
                "Unable to load dashboard statistics.",

            details:
                error.message

        });

    }

});


/*
====================================================
GET STATUS COUNT
====================================================
*/

function getStatusCount(
    status,
    organizationId
) {

    const result = database
        .prepare(`
            SELECT COUNT(*) AS total

            FROM comments

            INNER JOIN businesses
                ON businesses.id = comments.business_id

            WHERE businesses.organization_id = ?

            AND comments.status = ?
        `)
        .get(
            organizationId,
            status
        );


    return result.total || 0;

}


/*
====================================================
CURRENT ORGANIZATION
====================================================
*/

function getCurrentOrganizationId(req) {

    const organizationId =
        Number(req.organizationId);


    if (
        !Number.isInteger(organizationId)
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

module.exports = router;