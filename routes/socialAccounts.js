const express =
    require("express");

const router =
    express.Router();

const database =
    require("../database/database");


/*
====================================================
MASTER CONTROL
Social Accounts
====================================================

All social-account operations are restricted
to the organization supplied by:

middleware/organization.js

This prevents one SaaS customer from accessing
another customer's social accounts.
====================================================
*/


/*
====================================================
GET /api/social-accounts
====================================================
*/

router.get(
    "/social-accounts",
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


            /*
            ============================================
            Validate Optional Business ID
            ============================================
            */

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


            let accounts;


            /*
            ============================================
            Accounts For One Business
            ============================================
            */

            if (
                businessId !== null
            ) {

                accounts =
                    database
                        .prepare(`
                            SELECT

                                social_accounts.id,

                                social_accounts.business_id,

                                businesses.organization_id,

                                businesses.name
                                    AS business_name,

                                businesses.emoji
                                    AS business_emoji,

                                social_accounts.platform,

                                social_accounts.account_name,

                                social_accounts.external_account_id,

                                social_accounts.connected,

                                social_accounts.created_at,

                                social_accounts.updated_at


                            FROM social_accounts


                            INNER JOIN businesses

                                ON businesses.id =
                                    social_accounts.business_id


                            WHERE

                                social_accounts.business_id = ?

                                AND businesses.organization_id = ?


                            ORDER BY

                                CASE social_accounts.platform

                                    WHEN 'facebook'
                                        THEN 1

                                    WHEN 'instagram'
                                        THEN 2

                                    WHEN 'youtube'
                                        THEN 3

                                    WHEN 'tiktok'
                                        THEN 4

                                    ELSE 5

                                END
                        `)
                        .all(

                            businessId,

                            organizationId

                        );

            }


            /*
            ============================================
            All Accounts For Organization
            ============================================
            */

            else {

                accounts =
                    database
                        .prepare(`
                            SELECT

                                social_accounts.id,

                                social_accounts.business_id,

                                businesses.organization_id,

                                businesses.name
                                    AS business_name,

                                businesses.emoji
                                    AS business_emoji,

                                social_accounts.platform,

                                social_accounts.account_name,

                                social_accounts.external_account_id,

                                social_accounts.connected,

                                social_accounts.created_at,

                                social_accounts.updated_at


                            FROM social_accounts


                            INNER JOIN businesses

                                ON businesses.id =
                                    social_accounts.business_id


                            WHERE
                                businesses.organization_id = ?


                            ORDER BY

                                businesses.name ASC,

                                CASE social_accounts.platform

                                    WHEN 'facebook'
                                        THEN 1

                                    WHEN 'instagram'
                                        THEN 2

                                    WHEN 'youtube'
                                        THEN 3

                                    WHEN 'tiktok'
                                        THEN 4

                                    ELSE 5

                                END
                        `)
                        .all(
                            organizationId
                        );

            }


            res.json(
                accounts
            );

        }
        catch (error) {

            console.error(
                "Social account loading error:",
                error
            );


            res
                .status(500)
                .json({
                    error:
                        "Unable to load social accounts.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
GET /api/social-accounts/:id
====================================================
*/

router.get(
    "/social-accounts/:id",
    (req, res) => {

        try {

            const organizationId =
                getCurrentOrganizationId(
                    req
                );


            const accountId =
                Number(
                    req.params.id
                );


            /*
            ============================================
            Validate Account ID
            ============================================
            */

            if (
                !Number.isInteger(
                    accountId
                )
                ||
                accountId <= 0
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "A valid social account ID is required."
                    });

            }


            /*
            ============================================
            Find Account Inside Organization
            ============================================
            */

            const account =
                getSocialAccountById(

                    accountId,

                    organizationId

                );


            if (
                !account
            ) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Social account not found."
                    });

            }


            res.json(
                account
            );

        }
        catch (error) {

            console.error(
                "Social account loading error:",
                error
            );


            res
                .status(500)
                .json({
                    error:
                        "Unable to load social account.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
PUT /api/social-accounts/:id
====================================================
*/

router.put(
    "/social-accounts/:id",
    (req, res) => {

        try {

            const organizationId =
                getCurrentOrganizationId(
                    req
                );


            const accountId =
                Number(
                    req.params.id
                );


            /*
            ============================================
            Validate Account ID
            ============================================
            */

            if (
                !Number.isInteger(
                    accountId
                )
                ||
                accountId <= 0
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "A valid social account ID is required."
                    });

            }


            /*
            ============================================
            Verify Tenant Ownership
            ============================================
            */

            const existing =
                database
                    .prepare(`
                        SELECT

                            social_accounts.id,

                            social_accounts.business_id,

                            social_accounts.platform,

                            social_accounts.account_name,

                            social_accounts.external_account_id,

                            social_accounts.connected


                        FROM social_accounts


                        INNER JOIN businesses

                            ON businesses.id =
                                social_accounts.business_id


                        WHERE

                            social_accounts.id = ?

                            AND businesses.organization_id = ?
                    `)
                    .get(

                        accountId,

                        organizationId

                    );


            if (
                !existing
            ) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Social account not found."
                    });

            }


            /*
            ============================================
            Normalize Values
            ============================================
            */

            const accountName =
                req.body.accountName !==
                undefined

                    ? String(
                        req.body.accountName
                    ).trim()

                    : existing.account_name;


            const externalAccountId =
                req.body.externalAccountId !==
                undefined

                    ? String(
                        req.body.externalAccountId
                    ).trim()

                    : existing.external_account_id;


            let connected =
                existing.connected;


            if (
                req.body.connected !==
                undefined
            ) {

                connected =
                    normalizeConnectedValue(
                        req.body.connected
                    );

            }


            /*
            ============================================
            Update Account
            ============================================

            The EXISTS clause protects the UPDATE
            itself, even though ownership was already
            checked above.
            ============================================
            */

            const result =
                database
                    .prepare(`
                        UPDATE social_accounts

                        SET

                            account_name = ?,

                            external_account_id = ?,

                            connected = ?,

                            updated_at =
                                CURRENT_TIMESTAMP


                        WHERE

                            id = ?

                            AND EXISTS (

                                SELECT 1

                                FROM businesses

                                WHERE

                                    businesses.id =
                                        social_accounts.business_id

                                    AND businesses.organization_id = ?

                            )
                    `)
                    .run(

                        accountName,

                        externalAccountId,

                        connected,

                        accountId,

                        organizationId

                    );


            if (
                result.changes === 0
            ) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Social account not found."
                    });

            }


            /*
            ============================================
            Return Updated Account
            ============================================
            */

            const account =
                getSocialAccountById(

                    accountId,

                    organizationId

                );


            res.json(
                account
            );

        }
        catch (error) {

            console.error(
                "Social account update error:",
                error
            );


            res
                .status(500)
                .json({
                    error:
                        "Unable to update social account.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
GET SOCIAL ACCOUNT BY ID
====================================================
*/

function getSocialAccountById(
    accountId,
    organizationId
) {

    return database
        .prepare(`
            SELECT

                social_accounts.id,

                social_accounts.business_id,

                businesses.organization_id,

                businesses.name
                    AS business_name,

                businesses.emoji
                    AS business_emoji,

                social_accounts.platform,

                social_accounts.account_name,

                social_accounts.external_account_id,

                social_accounts.connected,

                social_accounts.created_at,

                social_accounts.updated_at


            FROM social_accounts


            INNER JOIN businesses

                ON businesses.id =
                    social_accounts.business_id


            WHERE

                social_accounts.id = ?

                AND businesses.organization_id = ?
        `)
        .get(

            Number(
                accountId
            ),

            Number(
                organizationId
            )

        );

}


/*
====================================================
NORMALIZE CONNECTED VALUE
====================================================

Accepts:

true
false
1
0
"1"
"0"
"true"
"false"

====================================================
*/

function normalizeConnectedValue(
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


    if (
        value === false
        ||
        value === 0
        ||
        value === "0"
        ||
        value === "false"
    ) {

        return 0;

    }


    throw new Error(
        "Invalid connected value."
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