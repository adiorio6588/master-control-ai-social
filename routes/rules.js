const express = require("express");
const router = express.Router();

const database =
    require("../database/database");


/*
====================================================
GET /api/rules
====================================================

Optional:

/api/rules?businessId=2
====================================================
*/

router.get(
    "/rules",
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


            let rules;


            /*
            ============================================
            RULES FOR ONE BUSINESS
            ============================================
            */

            if (
                businessId !== null
            ) {

                rules =
                    database
                        .prepare(`
                            SELECT

                                reply_rules.id,

                                reply_rules.business_id,

                                businesses.organization_id,

                                businesses.name
                                    AS business_name,

                                businesses.emoji
                                    AS business_emoji,

                                reply_rules.name,

                                reply_rules.keywords,

                                reply_rules.reply,

                                reply_rules.enabled,

                                reply_rules.created_at,

                                reply_rules.updated_at


                            FROM reply_rules


                            INNER JOIN businesses

                                ON businesses.id =
                                    reply_rules.business_id


                            WHERE

                                reply_rules.business_id = ?

                                AND businesses.organization_id = ?


                            ORDER BY
                                reply_rules.name ASC
                        `)
                        .all(
                            businessId,
                            organizationId
                        );

            }


            /*
            ============================================
            ALL RULES FOR ORGANIZATION
            ============================================
            */

            else {

                rules =
                    database
                        .prepare(`
                            SELECT

                                reply_rules.id,

                                reply_rules.business_id,

                                businesses.organization_id,

                                businesses.name
                                    AS business_name,

                                businesses.emoji
                                    AS business_emoji,

                                reply_rules.name,

                                reply_rules.keywords,

                                reply_rules.reply,

                                reply_rules.enabled,

                                reply_rules.created_at,

                                reply_rules.updated_at


                            FROM reply_rules


                            INNER JOIN businesses

                                ON businesses.id =
                                    reply_rules.business_id


                            WHERE
                                businesses.organization_id = ?


                            ORDER BY

                                businesses.name ASC,

                                reply_rules.name ASC
                        `)
                        .all(
                            organizationId
                        );

            }


            res.json(
                rules
            );

        }
        catch (error) {

            console.error(
                "Load rules error:",
                error
            );


            res
                .status(500)
                .json({
                    error:
                        "Unable to load reply rules.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
GET /api/rules/:id
====================================================
*/

router.get(
    "/rules/:id",
    (req, res) => {

        try {

            const organizationId =
                getCurrentOrganizationId(
                    req
                );


            const ruleId =
                Number(
                    req.params.id
                );


            if (
                !Number.isInteger(
                    ruleId
                )
                ||
                ruleId <= 0
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "A valid rule ID is required."
                    });

            }


            const rule =
                getRuleById(
                    ruleId,
                    organizationId
                );


            if (
                !rule
            ) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Rule not found."
                    });

            }


            res.json(
                rule
            );

        }
        catch (error) {

            console.error(
                "Load rule error:",
                error
            );


            res
                .status(500)
                .json({
                    error:
                        "Unable to load the reply rule.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
POST /api/rules
====================================================
*/

router.post(
    "/rules",
    (req, res) => {

        try {

            const organizationId =
                getCurrentOrganizationId(
                    req
                );


            const {
                businessId,
                name,
                keywords,
                reply,
                enabled = 1
            } =
                req.body;


            const numericBusinessId =
                Number(
                    businessId
                );


            const normalizedName =
                typeof name ===
                    "string"
                    ? name.trim()
                    : "";


            const normalizedKeywords =
                typeof keywords ===
                    "string"
                    ? keywords.trim()
                    : "";


            const normalizedReply =
                typeof reply ===
                    "string"
                    ? reply.trim()
                    : "";


            /*
            ============================================
            VALIDATION
            ============================================
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


            if (
                !normalizedName
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Rule name is required."
                    });

            }


            if (
                !normalizedKeywords
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "At least one keyword is required."
                    });

            }


            if (
                !normalizedReply
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Reply text is required."
                    });

            }


            /*
            ============================================
            VERIFY BUSINESS OWNERSHIP
            ============================================
            */

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
                        numericBusinessId,
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
            CREATE RULE
            ============================================
            */

            const result =
                database
                    .prepare(`
                        INSERT INTO reply_rules (

                            business_id,

                            name,

                            keywords,

                            reply,

                            enabled

                        )

                        VALUES (?, ?, ?, ?, ?)
                    `)
                    .run(

                        numericBusinessId,

                        normalizedName,

                        normalizedKeywords,

                        normalizedReply,

                        normalizeEnabledValue(
                            enabled
                        )

                    );


            const newRule =
                getRuleById(
                    result.lastInsertRowid,
                    organizationId
                );


            res
                .status(201)
                .json(
                    newRule
                );

        }
        catch (error) {

            console.error(
                "Create rule error:",
                error
            );


            if (
                error.code ===
                    "SQLITE_CONSTRAINT_UNIQUE"

                ||
                String(
                    error.message
                ).includes(
                    "UNIQUE constraint failed"
                )
            ) {

                return res
                    .status(409)
                    .json({
                        error:
                            "A rule with this name already exists for the selected business."
                    });

            }


            res
                .status(500)
                .json({
                    error:
                        "Unable to create the reply rule.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
PUT /api/rules/:id
====================================================
*/

router.put(
    "/rules/:id",
    (req, res) => {

        try {

            const organizationId =
                getCurrentOrganizationId(
                    req
                );


            const ruleId =
                Number(
                    req.params.id
                );


            if (
                !Number.isInteger(
                    ruleId
                )
                ||
                ruleId <= 0
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "A valid rule ID is required."
                    });

            }


            const existingRule =
                getRuleById(
                    ruleId,
                    organizationId
                );


            if (
                !existingRule
            ) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Rule not found."
                    });

            }


            const updatedBusinessId =
                req.body.businessId !==
                    undefined

                    ? Number(
                        req.body.businessId
                    )

                    : existingRule
                        .business_id;


            const updatedName =
                req.body.name !==
                    undefined

                    ? String(
                        req.body.name
                    ).trim()

                    : existingRule
                        .name;


            const updatedKeywords =
                req.body.keywords !==
                    undefined

                    ? String(
                        req.body.keywords
                    ).trim()

                    : existingRule
                        .keywords;


            const updatedReply =
                req.body.reply !==
                    undefined

                    ? String(
                        req.body.reply
                    ).trim()

                    : existingRule
                        .reply;


            const updatedEnabled =
                req.body.enabled !==
                    undefined

                    ? normalizeEnabledValue(
                        req.body.enabled
                    )

                    : existingRule
                        .enabled;


            /*
            ============================================
            VALIDATION
            ============================================
            */

            if (
                !Number.isInteger(
                    updatedBusinessId
                )
                ||
                updatedBusinessId <= 0
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Business is required."
                    });

            }


            if (
                !updatedName
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Rule name is required."
                    });

            }


            if (
                !updatedKeywords
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "At least one keyword is required."
                    });

            }


            if (
                !updatedReply
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Reply text is required."
                    });

            }


            /*
            ============================================
            VERIFY TARGET BUSINESS OWNERSHIP
            ============================================
            */

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

                        updatedBusinessId,

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
            UPDATE RULE
            ============================================
            */

            const result =
                database
                    .prepare(`
                        UPDATE reply_rules

                        SET

                            business_id = ?,

                            name = ?,

                            keywords = ?,

                            reply = ?,

                            enabled = ?,

                            updated_at =
                                CURRENT_TIMESTAMP


                        WHERE

                            id = ?

                            AND EXISTS (

                                SELECT 1

                                FROM businesses

                                WHERE

                                    businesses.id =
                                        reply_rules.business_id

                                    AND businesses.organization_id = ?

                            )
                    `)
                    .run(

                        updatedBusinessId,

                        updatedName,

                        updatedKeywords,

                        updatedReply,

                        updatedEnabled,

                        ruleId,

                        organizationId

                    );


            if (
                result.changes === 0
            ) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Rule not found."
                    });

            }


            res.json(
                getRuleById(
                    ruleId,
                    organizationId
                )
            );

        }
        catch (error) {

            console.error(
                "Update rule error:",
                error
            );


            if (
                error.code ===
                    "SQLITE_CONSTRAINT_UNIQUE"

                ||
                String(
                    error.message
                ).includes(
                    "UNIQUE constraint failed"
                )
            ) {

                return res
                    .status(409)
                    .json({
                        error:
                            "A rule with this name already exists for the selected business."
                    });

            }


            res
                .status(500)
                .json({
                    error:
                        "Unable to update the reply rule.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
PATCH /api/rules/:id/toggle
====================================================
*/

router.patch(
    "/rules/:id/toggle",
    (req, res) => {

        try {

            const organizationId =
                getCurrentOrganizationId(
                    req
                );


            const ruleId =
                Number(
                    req.params.id
                );


            if (
                !Number.isInteger(
                    ruleId
                )
                ||
                ruleId <= 0
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "A valid rule ID is required."
                    });

            }


            const rule =
                getRuleById(
                    ruleId,
                    organizationId
                );


            if (
                !rule
            ) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Rule not found."
                    });

            }


            const newEnabledValue =
                rule.enabled
                    ? 0
                    : 1;


            const result =
                database
                    .prepare(`
                        UPDATE reply_rules

                        SET

                            enabled = ?,

                            updated_at =
                                CURRENT_TIMESTAMP


                        WHERE

                            id = ?

                            AND EXISTS (

                                SELECT 1

                                FROM businesses

                                WHERE

                                    businesses.id =
                                        reply_rules.business_id

                                    AND businesses.organization_id = ?

                            )
                    `)
                    .run(

                        newEnabledValue,

                        ruleId,

                        organizationId

                    );


            if (
                result.changes === 0
            ) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Rule not found."
                    });

            }


            res.json(
                getRuleById(
                    ruleId,
                    organizationId
                )
            );

        }
        catch (error) {

            console.error(
                "Toggle rule error:",
                error
            );


            res
                .status(500)
                .json({
                    error:
                        "Unable to change the rule status.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
DELETE /api/rules/:id
====================================================
*/

router.delete(
    "/rules/:id",
    (req, res) => {

        try {

            const organizationId =
                getCurrentOrganizationId(
                    req
                );


            const ruleId =
                Number(
                    req.params.id
                );


            if (
                !Number.isInteger(
                    ruleId
                )
                ||
                ruleId <= 0
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "A valid rule ID is required."
                    });

            }


            const rule =
                getRuleById(
                    ruleId,
                    organizationId
                );


            if (
                !rule
            ) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Rule not found."
                    });

            }


            const result =
                database
                    .prepare(`
                        DELETE FROM reply_rules

                        WHERE

                            id = ?

                            AND EXISTS (

                                SELECT 1

                                FROM businesses

                                WHERE

                                    businesses.id =
                                        reply_rules.business_id

                                    AND businesses.organization_id = ?

                            )
                    `)
                    .run(

                        ruleId,

                        organizationId

                    );


            if (
                result.changes === 0
            ) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Rule not found."
                    });

            }


            res.json({

                success:
                    true,

                message:
                    `Rule "${rule.name}" was deleted.`

            });

        }
        catch (error) {

            console.error(
                "Delete rule error:",
                error
            );


            res
                .status(500)
                .json({
                    error:
                        "Unable to delete the reply rule.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
GET RULE BY ID
====================================================
*/

function getRuleById(
    ruleId,
    organizationId
) {

    return database
        .prepare(`
            SELECT

                reply_rules.id,

                reply_rules.business_id,

                businesses.organization_id,

                businesses.name
                    AS business_name,

                businesses.emoji
                    AS business_emoji,

                reply_rules.name,

                reply_rules.keywords,

                reply_rules.reply,

                reply_rules.enabled,

                reply_rules.created_at,

                reply_rules.updated_at


            FROM reply_rules


            INNER JOIN businesses

                ON businesses.id =
                    reply_rules.business_id


            WHERE

                reply_rules.id = ?

                AND businesses.organization_id = ?
        `)
        .get(

            Number(
                ruleId
            ),

            Number(
                organizationId
            )

        );

}


/*
====================================================
NORMALIZE ENABLED VALUE
====================================================
*/

function normalizeEnabledValue(
    value
) {

    if (
        value === true
        ||
        value === 1
        ||
        value === "1"
        ||
        value === "true"
    ) {

        return 1;

    }


    return 0;

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