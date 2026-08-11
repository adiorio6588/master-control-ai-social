const express =
    require("express");

const router =
    express.Router();

const database =
    require(
        "../database/database"
    );


/*
====================================================
GET /api/businesses
====================================================

Return ONLY businesses belonging to the
current organization.
====================================================
*/

router.get(
    "/businesses",
    (req, res) => {

        try {

            const organizationId =
                getCurrentOrganizationId(
                    req
                );


            const businesses =
                database
                    .prepare(`
                        SELECT

                            businesses.id,

                            businesses.organization_id,

                            businesses.name,

                            businesses.emoji,

                            businesses.prompt,

                            businesses.created_at,

                            businesses.updated_at,


                            COUNT(
                                DISTINCT comments.id
                            ) AS total_comments,


                            COUNT(
                                DISTINCT reply_rules.id
                            ) AS total_rules,


                            COUNT(
                                DISTINCT CASE

                                    WHEN
                                        comments.reply IS NOT NULL

                                        AND TRIM(
                                            comments.reply
                                        ) != ''

                                    THEN comments.id

                                END
                            ) AS total_replies,


                            COUNT(
                                DISTINCT CASE

                                    WHEN
                                        comments.source = 'RULE'

                                    THEN comments.id

                                END
                            ) AS rule_replies,


                            COUNT(
                                DISTINCT CASE

                                    WHEN
                                        comments.source = 'GPT'

                                    THEN comments.id

                                END
                            ) AS gpt_replies,


                            MAX(
                                COALESCE(
                                    comments.updated_at,
                                    comments.created_at
                                )
                            ) AS last_activity


                        FROM businesses


                        LEFT JOIN comments

                            ON comments.business_id =
                                businesses.id


                        LEFT JOIN reply_rules

                            ON reply_rules.business_id =
                                businesses.id


                        WHERE
                            businesses.organization_id = ?


                        GROUP BY

                            businesses.id,

                            businesses.organization_id,

                            businesses.name,

                            businesses.emoji,

                            businesses.prompt,

                            businesses.created_at,

                            businesses.updated_at


                        ORDER BY
                            businesses.name ASC
                    `)
                    .all(
                        organizationId
                    );


            res.json(
                businesses
            );

        }
        catch (error) {

            console.error(
                "Business loading error:",
                error
            );


            res
                .status(500)
                .json({
                    error:
                        "Unable to load businesses.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
GET /api/businesses/:id
====================================================
*/

router.get(
    "/businesses/:id",
    (req, res) => {

        try {

            const businessId =
                Number(
                    req.params.id
                );


            const organizationId =
                getCurrentOrganizationId(
                    req
                );


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
                            "Invalid business ID."
                    });

            }


            const business =
                getBusinessById(
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


            res.json(
                business
            );

        }
        catch (error) {

            console.error(
                "Business loading error:",
                error
            );


            res
                .status(500)
                .json({
                    error:
                        "Unable to load business.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
POST /api/businesses
====================================================
*/

router.post(
    "/businesses",
    (req, res) => {

        try {

            const organizationId =
                getCurrentOrganizationId(
                    req
                );


            const {
                name,
                emoji = "",
                prompt
            } =
                req.body;


            const normalizedName =
                typeof name ===
                "string"
                    ? name.trim()
                    : "";


            const normalizedEmoji =
                typeof emoji ===
                "string"
                    ? emoji.trim()
                    : "";


            const normalizedPrompt =
                typeof prompt ===
                "string"
                    ? prompt.trim()
                    : "";


            /*
            ============================================
            VALIDATION
            ============================================
            */

            if (
                !normalizedName
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Business name is required."
                    });

            }


            if (
                !normalizedPrompt
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Business prompt is required."
                    });

            }


            /*
            ============================================
            VERIFY ORGANIZATION
            ============================================
            */

            const organization =
                database
                    .prepare(`
                        SELECT
                            id,
                            name

                        FROM organizations

                        WHERE id = ?
                    `)
                    .get(
                        organizationId
                    );


            if (
                !organization
            ) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Organization not found."
                    });

            }


            /*
            ============================================
            CREATE BUSINESS
            ============================================
            */

            const createBusiness =
                database.transaction(
                    () => {

                        const result =
                            database
                                .prepare(`
                                    INSERT INTO businesses (

                                        organization_id,

                                        name,

                                        emoji,

                                        prompt

                                    )

                                    VALUES (?, ?, ?, ?)
                                `)
                                .run(

                                    organizationId,

                                    normalizedName,

                                    normalizedEmoji,

                                    normalizedPrompt

                                );


                        const businessId =
                            Number(
                                result.lastInsertRowid
                            );


                        createSocialAccountPlaceholders(
                            businessId
                        );


                        return businessId;

                    }
                );


            const businessId =
                createBusiness();


            const business =
                getBusinessById(
                    businessId,
                    organizationId
                );


            res
                .status(201)
                .json(
                    business
                );

        }
        catch (error) {

            console.error(
                "Business creation error:",
                error
            );


            if (
                error.message.includes(
                    "UNIQUE constraint failed"
                )
            ) {

                return res
                    .status(409)
                    .json({
                        error:
                            "A business with that name already exists."
                    });

            }


            res
                .status(500)
                .json({
                    error:
                        "Unable to create business.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
PUT /api/businesses/:id
====================================================
*/

router.put(
    "/businesses/:id",
    (req, res) => {

        try {

            const businessId =
                Number(
                    req.params.id
                );


            const organizationId =
                getCurrentOrganizationId(
                    req
                );


            const {
                name,
                emoji = "",
                prompt
            } =
                req.body;


            const normalizedName =
                typeof name ===
                "string"
                    ? name.trim()
                    : "";


            const normalizedEmoji =
                typeof emoji ===
                "string"
                    ? emoji.trim()
                    : "";


            const normalizedPrompt =
                typeof prompt ===
                "string"
                    ? prompt.trim()
                    : "";


            /*
            ============================================
            VALIDATION
            ============================================
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
                            "Invalid business ID."
                    });

            }


            if (
                !normalizedName
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Business name is required."
                    });

            }


            if (
                !normalizedPrompt
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Business prompt is required."
                    });

            }


            /*
            ============================================
            UPDATE TENANT BUSINESS
            ============================================
            */

            const result =
                database
                    .prepare(`
                        UPDATE businesses

                        SET

                            name = ?,

                            emoji = ?,

                            prompt = ?,

                            updated_at =
                                CURRENT_TIMESTAMP

                        WHERE

                            id = ?

                            AND organization_id = ?
                    `)
                    .run(

                        normalizedName,

                        normalizedEmoji,

                        normalizedPrompt,

                        businessId,

                        organizationId

                    );


            if (
                result.changes === 0
            ) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Business not found."
                    });

            }


            const business =
                getBusinessById(
                    businessId,
                    organizationId
                );


            res.json(
                business
            );

        }
        catch (error) {

            console.error(
                "Business update error:",
                error
            );


            if (
                error.message.includes(
                    "UNIQUE constraint failed"
                )
            ) {

                return res
                    .status(409)
                    .json({
                        error:
                            "A business with that name already exists."
                    });

            }


            res
                .status(500)
                .json({
                    error:
                        "Unable to update business.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
DELETE /api/businesses/:id
====================================================
*/

router.delete(
    "/businesses/:id",
    (req, res) => {

        try {

            const businessId =
                Number(
                    req.params.id
                );


            const organizationId =
                getCurrentOrganizationId(
                    req
                );


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
                            "Invalid business ID."
                    });

            }


            /*
            ============================================
            VERIFY TENANT OWNERSHIP
            ============================================
            */

            const business =
                database
                    .prepare(`
                        SELECT

                            id,

                            name,

                            organization_id

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
            ============================================
            DELETE BUSINESS DATA
            ============================================
            */

            const deleteBusiness =
                database.transaction(
                    () => {

                        /*
                        ====================================
                        REPLIES
                        ====================================
                        */

                        database
                            .prepare(`
                                DELETE FROM replies

                                WHERE comment_id IN (

                                    SELECT id

                                    FROM comments

                                    WHERE business_id = ?

                                )
                            `)
                            .run(
                                businessId
                            );


                        /*
                        ====================================
                        COMMENTS
                        ====================================
                        */

                        database
                            .prepare(`
                                DELETE FROM comments

                                WHERE business_id = ?
                            `)
                            .run(
                                businessId
                            );


                        /*
                        ====================================
                        RULES
                        ====================================
                        */

                        database
                            .prepare(`
                                DELETE FROM reply_rules

                                WHERE business_id = ?
                            `)
                            .run(
                                businessId
                            );


                        /*
                        ====================================
                        SOCIAL ACCOUNTS
                        ====================================
                        */

                        database
                            .prepare(`
                                DELETE FROM social_accounts

                                WHERE business_id = ?
                            `)
                            .run(
                                businessId
                            );


                        /*
                        ====================================
                        BUSINESS
                        ====================================
                        */

                        const result =
                            database
                                .prepare(`
                                    DELETE FROM businesses

                                    WHERE

                                        id = ?

                                        AND organization_id = ?
                                `)
                                .run(

                                    businessId,

                                    organizationId

                                );


                        if (
                            result.changes !== 1
                        ) {

                            throw new Error(
                                "Business deletion failed."
                            );

                        }

                    }
                );


            deleteBusiness();


            res.json({

                success:
                    true,

                message:
                    `${business.name} was deleted.`

            });

        }
        catch (error) {

            console.error(
                "Business deletion error:",
                error
            );


            res
                .status(500)
                .json({
                    error:
                        "Unable to delete business.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
GET BUSINESS BY ID
====================================================
*/

function getBusinessById(
    businessId,
    organizationId
) {

    return database
        .prepare(`
            SELECT

                businesses.id,

                businesses.organization_id,

                businesses.name,

                businesses.emoji,

                businesses.prompt,

                businesses.created_at,

                businesses.updated_at,


                COUNT(
                    DISTINCT comments.id
                ) AS total_comments,


                COUNT(
                    DISTINCT reply_rules.id
                ) AS total_rules,


                COUNT(
                    DISTINCT CASE

                        WHEN
                            comments.reply IS NOT NULL

                            AND TRIM(
                                comments.reply
                            ) != ''

                        THEN comments.id

                    END
                ) AS total_replies,


                COUNT(
                    DISTINCT CASE

                        WHEN
                            comments.source = 'RULE'

                        THEN comments.id

                    END
                ) AS rule_replies,


                COUNT(
                    DISTINCT CASE

                        WHEN
                            comments.source = 'GPT'

                        THEN comments.id

                    END
                ) AS gpt_replies,


                MAX(
                    COALESCE(
                        comments.updated_at,
                        comments.created_at
                    )
                ) AS last_activity


            FROM businesses


            LEFT JOIN comments

                ON comments.business_id =
                    businesses.id


            LEFT JOIN reply_rules

                ON reply_rules.business_id =
                    businesses.id


            WHERE

                businesses.id = ?

                AND businesses.organization_id = ?


            GROUP BY

                businesses.id,

                businesses.organization_id,

                businesses.name,

                businesses.emoji,

                businesses.prompt,

                businesses.created_at,

                businesses.updated_at
        `)
        .get(

            Number(
                businessId
            ),

            Number(
                organizationId
            )

        );

}


/*
====================================================
CREATE SOCIAL ACCOUNT PLACEHOLDERS
====================================================
*/

function createSocialAccountPlaceholders(
    businessId
) {

    const platforms = [

        "facebook",

        "instagram",

        "youtube",

        "tiktok"

    ];


    const insertAccount =
        database.prepare(`
            INSERT OR IGNORE INTO social_accounts (

                business_id,

                platform,

                account_name,

                external_account_id,

                connected

            )

            VALUES (?, ?, '', '', 0)
        `);


    for (
        const platform
        of platforms
    ) {

        insertAccount.run(

            businessId,

            platform

        );

    }

}


/*
====================================================
CURRENT ORGANIZATION
====================================================

The organization now comes from:

middleware/organization.js

For development:

No X-Organization-ID
    -> organization 1

Later:

Authenticated user/session
    -> organization automatically
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