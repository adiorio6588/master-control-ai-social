const express =
    require("express");


const crypto =
    require("crypto");


const jwt =
    require("jsonwebtoken");


const database =
    require("../database/database");


const authMiddleware =
    require("../middleware/auth");


const {
    encryptToken,
    decryptToken
} = require(
    "../services/tokenEncryption"
);


const router =
    express.Router();


/*
====================================================
MASTER CONTROL
META OAUTH
====================================================
*/


/*
====================================================
GET /api/meta/connect
====================================================

Starts Facebook Login for Business.

This endpoint requires the user to already be
logged into Master Control.

The organization, user, business, and platform
are stored inside a signed OAuth state token.
====================================================
*/

router.get(
    "/meta/connect",
    authMiddleware,
    async (req, res) => {

        try {

            /*
            ============================================
            ENVIRONMENT
            ============================================
            */

            const appId =
                process.env.META_APP_ID;


            const configId =
                process.env.META_CONFIG_ID;


            const redirectUri =
                process.env.META_REDIRECT_URI;


            const jwtSecret =
                process.env.JWT_SECRET;


            if (
                !appId ||
                !configId ||
                !redirectUri ||
                !jwtSecret
            ) {

                return res
                    .status(500)
                    .json({
                        error:
                            "Meta connection is not configured."
                    });

            }


            /*
            ============================================
            MASTER CONTROL AUTH
            ============================================
            */

            const organizationId =
                Number(
                    req.organizationId
                );


            const userId =
                Number(
                    req.user?.id
                );


            if (
                !Number.isInteger(
                    organizationId
                )
                ||
                organizationId <= 0
                ||
                !Number.isInteger(
                    userId
                )
                ||
                userId <= 0
            ) {

                return res
                    .status(401)
                    .json({
                        error:
                            "Authentication required."
                    });

            }


            /*
            ============================================
            CONNECTION TARGET
            ============================================
            */

            const businessId =
                req.query.businessId
                    ? Number(
                        req.query.businessId
                    )
                    : null;


            const platform =
                typeof req.query.platform ===
                    "string"

                    ? req.query.platform
                        .trim()
                        .toLowerCase()

                    : null;


            /*
            ============================================
            VALIDATE BUSINESS
            ============================================
            */

            if (
                businessId !== null
            ) {

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
                    database
                        .prepare(`
                            SELECT
                                id,
                                organization_id,
                                name

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

            }


            /*
            ============================================
            VALIDATE PLATFORM
            ============================================
            */

            if (
                platform !== null
                &&
                platform !== "facebook"
                &&
                platform !== "instagram"
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Unsupported Meta platform."
                    });

            }


            /*
            ============================================
            SIGNED OAUTH STATE
            ============================================

            This preserves the correct Master Control
            tenant while the user leaves the app and
            authenticates with Meta.
            ============================================
            */

            const state =
                jwt.sign(
                    {

                        purpose:
                            "meta_oauth",

                        userId,

                        organizationId,

                        businessId,

                        platform,

                        nonce:
                            crypto
                                .randomBytes(16)
                                .toString("hex")

                    },
                    jwtSecret,
                    {
                        expiresIn:
                            "10m"
                    }
                );


            /*
            ============================================
            META AUTHORIZATION URL
            ============================================
            */

            const authorizationUrl =
                new URL(
                    "https://www.facebook.com/dialog/oauth"
                );


            authorizationUrl
                .searchParams
                .set(
                    "client_id",
                    appId
                );


            authorizationUrl
                .searchParams
                .set(
                    "redirect_uri",
                    redirectUri
                );


            authorizationUrl
                .searchParams
                .set(
                    "response_type",
                    "code"
                );


            authorizationUrl
                .searchParams
                .set(
                    "config_id",
                    configId
                );


            authorizationUrl
                .searchParams
                .set(
                    "state",
                    state
                );


            /*
            ============================================
            RESPONSE
            ============================================
            */

            return res.json({

                provider:
                    "meta",

                organizationId,

                businessId,

                platform,

                authorizationUrl:
                    authorizationUrl
                        .toString()

            });

        }
        catch (error) {

            console.error(
                "Meta connect error:",
                error
            );


            return res
                .status(500)
                .json({

                    error:
                        "Unable to start Meta connection.",

                    details:
                        error.message

                });

        }

    }
);


/*
====================================================
GET /api/meta/callback
====================================================

Meta redirects directly to this endpoint.

This endpoint must NOT require the normal
Master Control Authorization header.

Security comes from the signed OAuth state.
====================================================
*/

router.get(
    "/meta/callback",
    async (req, res) => {

        try {

            /*
            ============================================
            ENVIRONMENT
            ============================================
            */

            const appId =
                process.env.META_APP_ID;


            const appSecret =
                process.env.META_APP_SECRET;


            const redirectUri =
                process.env.META_REDIRECT_URI;


            const jwtSecret =
                process.env.JWT_SECRET;


            if (
                !appId ||
                !appSecret ||
                !redirectUri ||
                !jwtSecret
            ) {

                return res
                    .status(500)
                    .json({
                        error:
                            "Meta connection is not configured."
                    });

            }


            /*
            ============================================
            META CANCEL / ERROR
            ============================================
            */

            if (
                req.query.error
            ) {

                console.error(
                    "Meta OAuth returned an error:",
                    {
                        error:
                            req.query.error,

                        reason:
                            req.query.error_reason,

                        description:
                            req.query.error_description
                    }
                );


                return res.redirect(
                    "/businesses?meta=cancelled"
                );

            }


            /*
            ============================================
            AUTHORIZATION CODE + STATE
            ============================================
            */

            const code =
                typeof req.query.code ===
                    "string"

                    ? req.query.code

                    : "";


            const state =
                typeof req.query.state ===
                    "string"

                    ? req.query.state

                    : "";


            if (
                !code ||
                !state
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Meta authorization code or state is missing."
                    });

            }


            /*
            ============================================
            VERIFY STATE
            ============================================
            */

            let statePayload;


            try {

                statePayload =
                    jwt.verify(
                        state,
                        jwtSecret
                    );

            }
            catch (error) {

                console.error(
                    "Invalid Meta OAuth state:",
                    error
                );


                return res
                    .status(400)
                    .json({
                        error:
                            "Meta authorization state is invalid or expired."
                    });

            }


            if (
                statePayload.purpose !==
                    "meta_oauth"
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Invalid Meta authorization state."
                    });

            }


            const organizationId =
                Number(
                    statePayload.organizationId
                );


            const userId =
                Number(
                    statePayload.userId
                );


            const businessId =
                statePayload.businessId
                    ? Number(
                        statePayload.businessId
                    )
                    : null;


            const platform =
                statePayload.platform ||
                null;


            if (
                !Number.isInteger(
                    organizationId
                )
                ||
                organizationId <= 0
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Invalid Master Control organization."
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
                            "Master Control organization not found."
                    });

            }


            /*
            ============================================
            VERIFY BUSINESS
            ============================================
            */

            if (
                businessId
            ) {

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

            }


            /*
            ============================================
            EXCHANGE CODE FOR TOKEN
            ============================================
            */

            const tokenUrl =
                new URL(
                    "https://graph.facebook.com/oauth/access_token"
                );


            tokenUrl
                .searchParams
                .set(
                    "client_id",
                    appId
                );


            tokenUrl
                .searchParams
                .set(
                    "client_secret",
                    appSecret
                );


            tokenUrl
                .searchParams
                .set(
                    "redirect_uri",
                    redirectUri
                );


            tokenUrl
                .searchParams
                .set(
                    "code",
                    code
                );


            const tokenResponse =
                await fetch(
                    tokenUrl,
                    {
                        method:
                            "GET",

                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );


            const tokenData =
                await tokenResponse
                    .json();


            if (
                !tokenResponse.ok
                ||
                !tokenData.access_token
            ) {

                console.error(
                    "Meta token exchange failed:",
                    tokenData
                );


                return res
                    .status(502)
                    .json({

                        error:
                            "Unable to exchange Meta authorization code.",

                        meta:
                            tokenData
                                ?.error
                                ?.message ||
                            "Unknown Meta token error."

                    });

            }


            /*
            ============================================
            ENCRYPT TOKEN
            ============================================
            */

            const encryptedAccessToken =
                encryptToken(
                    tokenData.access_token
                );


            /*
            ============================================
            TOKEN EXPIRATION
            ============================================
            */

            let tokenExpiresAt =
                null;


            const expiresIn =
                Number(
                    tokenData.expires_in
                );


            if (
                Number.isFinite(
                    expiresIn
                )
                &&
                expiresIn > 0
            ) {

                tokenExpiresAt =
                    new Date(
                        Date.now() +
                        expiresIn *
                        1000
                    )
                        .toISOString();

            }


            /*
            ============================================
            SAVE META OAUTH CONNECTION
            ============================================
            */

            database
                .prepare(`
                    INSERT INTO social_oauth_connections (

                        organization_id,

                        provider,

                        provider_user_id,

                        provider_user_name,

                        access_token_encrypted,

                        refresh_token_encrypted,

                        token_expires_at,

                        scopes,

                        created_at,

                        updated_at

                    )

                    VALUES (
                        ?,
                        'meta',
                        '',
                        '',
                        ?,
                        '',
                        ?,
                        '',
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    )

                    ON CONFLICT(
                        organization_id,
                        provider
                    )

                    DO UPDATE SET

                        access_token_encrypted =
                            excluded.access_token_encrypted,

                        token_expires_at =
                            excluded.token_expires_at,

                        updated_at =
                            CURRENT_TIMESTAMP
                `)
                .run(
                    organizationId,
                    encryptedAccessToken,
                    tokenExpiresAt
                );


            /*
            ============================================
            LOG SUCCESS
            ============================================
            */

            console.log(
                "✅ Meta OAuth connection saved:",
                {
                    organizationId,
                    userId,
                    businessId,
                    platform,
                    expiresAt:
                        tokenExpiresAt
                }
            );


            /*
            ============================================
            RETURN TO MASTER CONTROL
            ============================================
            */

            const params =
                new URLSearchParams();


            params.set(
                "meta",
                "connected"
            );


            if (
                businessId
            ) {

                params.set(
                    "businessId",
                    String(
                        businessId
                    )
                );

            }


            if (
                platform
            ) {

                params.set(
                    "platform",
                    platform
                );

            }


            return res.redirect(
                `/businesses?${params.toString()}`
            );

        }
        catch (error) {

            console.error(
                "Meta callback error:",
                error
            );


            return res
                .status(500)
                .json({

                    error:
                        "Unable to complete Meta connection.",

                    details:
                        error.message

                });

        }

    }
);


/*
====================================================
GET /api/meta/assets
====================================================

Loads the Facebook Pages and linked Instagram
professional accounts available through the
organization's saved Meta connection.

This endpoint requires Master Control auth.

Access tokens NEVER leave the server.
====================================================
*/

router.get(
    "/meta/assets",
    authMiddleware,
    async (req, res) => {

        try {

            /*
            ============================================
            ORGANIZATION
            ============================================
            */

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

                return res
                    .status(401)
                    .json({
                        error:
                            "Authentication required."
                    });

            }


            /*
            ============================================
            LOAD META CONNECTION
            ============================================
            */

            const connection =
                database
                    .prepare(`
                        SELECT

                            id,

                            organization_id,

                            provider,

                            access_token_encrypted,

                            token_expires_at,

                            updated_at

                        FROM social_oauth_connections

                        WHERE
                            organization_id = ?
                            AND provider = 'meta'
                    `)
                    .get(
                        organizationId
                    );


            if (
                !connection
                ||
                !connection
                    .access_token_encrypted
            ) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Meta is not connected."
                    });

            }


            /*
            ============================================
            CHECK EXPIRATION
            ============================================
            */

            if (
                connection.token_expires_at
            ) {

                const expiration =
                    new Date(
                        connection
                            .token_expires_at
                    );


                if (
                    !Number.isNaN(
                        expiration.getTime()
                    )
                    &&
                    expiration.getTime() <=
                        Date.now()
                ) {

                    return res
                        .status(401)
                        .json({
                            error:
                                "Meta connection has expired. Please reconnect."
                        });

                }

            }


            /*
            ============================================
            DECRYPT TOKEN
            ============================================
            */

            const accessToken =
                decryptToken(
                    connection
                        .access_token_encrypted
                );


            if (
                !accessToken
            ) {

                return res
                    .status(500)
                    .json({
                        error:
                            "Unable to decrypt Meta connection."
                    });

            }


            /*
            ============================================
            META GRAPH REQUEST
            ============================================
            */

            const graphUrl =
                new URL(
                    "https://graph.facebook.com/me/accounts"
                );


            graphUrl
                .searchParams
                .set(
                    "fields",
                    [
                        "id",
                        "name",
                        "instagram_business_account{id,username}"
                    ].join(",")
                );


            graphUrl
                .searchParams
                .set(
                    "access_token",
                    accessToken
                );


            const metaResponse =
                await fetch(
                    graphUrl,
                    {
                        method:
                            "GET",

                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );


            const metaData =
                await metaResponse
                    .json();


            if (
                !metaResponse.ok
            ) {

                console.error(
                    "Meta asset discovery failed:",
                    metaData
                );


                return res
                    .status(502)
                    .json({

                        error:
                            "Unable to load Meta assets.",

                        meta:
                            metaData
                                ?.error
                                ?.message ||
                            "Unknown Meta error."

                    });

            }


            /*
            ============================================
            SANITIZE META RESPONSE
            ============================================

            NEVER return access tokens to frontend.
            ============================================
            */

            const pages =
                Array.isArray(
                    metaData.data
                )

                    ? metaData.data.map(
                        (page) => {

                            const instagram =
                                page
                                    .instagram_business_account;


                            return {

                                id:
                                    String(
                                        page.id ||
                                        ""
                                    ),

                                name:
                                    page.name ||
                                    "",

                                instagram:
                                    instagram
                                        ? {

                                            id:
                                                String(
                                                    instagram.id ||
                                                    ""
                                                ),

                                            username:
                                                instagram.username ||
                                                ""

                                        }
                                        : null

                            };

                        }
                    )

                    : [];


            /*
            ============================================
            RESPONSE
            ============================================
            */

            return res.json({

                organizationId,

                connected:
                    true,

                tokenExpiresAt:
                    connection
                        .token_expires_at,

                pages

            });

        }
        catch (error) {

            console.error(
                "Meta asset discovery error:",
                error
            );


            return res
                .status(500)
                .json({

                    error:
                        "Unable to discover Meta assets.",

                    details:
                        error.message

                });

        }

    }
);


/*
====================================================
POST /api/meta/subscribe-page
====================================================

Subscribes a Facebook Page to Master Control's
Meta webhook.

Flow:

Organization Meta token
        ↓
Find Page + Page access token
        ↓
POST /PAGE_ID/subscribed_apps
        ↓
Subscribe to feed events

Page access tokens are NEVER returned to the
browser or printed to the Terminal.
====================================================
*/

router.post(
    "/meta/subscribe-page",
    authMiddleware,
    async (req, res) => {

        try {

            /*
            ============================================
            ORGANIZATION
            ============================================
            */

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

                return res
                    .status(401)
                    .json({
                        error:
                            "Authentication required."
                    });

            }


            /*
            ============================================
            INPUT
            ============================================
            */

            const pageId =
                typeof req.body?.pageId ===
                    "string"

                    ? req.body.pageId.trim()

                    : String(
                        req.body?.pageId ||
                        ""
                    ).trim();


            const businessId =
                Number(
                    req.body?.businessId
                );


            if (
                !pageId
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Facebook Page ID is required."
                    });

            }


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
                            "Business ID is required."
                    });

            }


            /*
            ============================================
            VERIFY BUSINESS BELONGS TO ORGANIZATION
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
            VERIFY FACEBOOK ACCOUNT
            ============================================
            */

            const socialAccount =
                database
                    .prepare(`
                        SELECT
                            id,
                            business_id,
                            platform,
                            account_name,
                            external_account_id,
                            connected

                        FROM social_accounts

                        WHERE
                            business_id = ?
                            AND platform = 'facebook'
                    `)
                    .get(
                        businessId
                    );


            if (
                !socialAccount
            ) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Facebook social account record not found."
                    });

            }


            /*
            ============================================
            PAGE ID MUST MATCH BUSINESS
            ============================================
            */

            if (
                socialAccount.external_account_id
                &&
                String(
                    socialAccount.external_account_id
                ) !== pageId
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Facebook Page does not match this business."
                    });

            }


            /*
            ============================================
            LOAD META CONNECTION
            ============================================
            */

            const connection =
                database
                    .prepare(`
                        SELECT
                            id,
                            access_token_encrypted,
                            token_expires_at

                        FROM social_oauth_connections

                        WHERE
                            organization_id = ?
                            AND provider = 'meta'
                    `)
                    .get(
                        organizationId
                    );


            if (
                !connection
                ||
                !connection
                    .access_token_encrypted
            ) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Meta is not connected."
                    });

            }


            /*
            ============================================
            CHECK TOKEN EXPIRATION
            ============================================
            */

            if (
                connection.token_expires_at
            ) {

                const expiration =
                    new Date(
                        connection
                            .token_expires_at
                    );


                if (
                    !Number.isNaN(
                        expiration.getTime()
                    )
                    &&
                    expiration.getTime() <=
                        Date.now()
                ) {

                    return res
                        .status(401)
                        .json({
                            error:
                                "Meta connection has expired. Please reconnect."
                        });

                }

            }


            /*
            ============================================
            DECRYPT ORGANIZATION META TOKEN
            ============================================
            */

            const organizationAccessToken =
                decryptToken(
                    connection
                        .access_token_encrypted
                );


            if (
                !organizationAccessToken
            ) {

                return res
                    .status(500)
                    .json({
                        error:
                            "Unable to decrypt Meta connection."
                    });

            }


            /*
            ============================================
            LOAD PAGE ACCESS TOKEN
            ============================================

            The Page token stays entirely server-side.
            ============================================
            */

            const accountsUrl =
                new URL(
                    "https://graph.facebook.com/v26.0/me/accounts"
                );


            accountsUrl
                .searchParams
                .set(
                    "fields",
                    "id,name,access_token"
                );


            accountsUrl
                .searchParams
                .set(
                    "access_token",
                    organizationAccessToken
                );


            const accountsResponse =
                await fetch(
                    accountsUrl,
                    {
                        method:
                            "GET",

                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );


            const accountsData =
                await accountsResponse
                    .json();


            if (
                !accountsResponse.ok
            ) {

                console.error(
                    "Meta Page lookup failed:",
                    accountsData
                );


                return res
                    .status(502)
                    .json({

                        error:
                            "Unable to load Facebook Page credentials.",

                        meta:
                            accountsData
                                ?.error
                                ?.message ||
                            "Unknown Meta error."

                    });

            }


            /*
            ============================================
            FIND REQUESTED PAGE
            ============================================
            */

            const pages =
                Array.isArray(
                    accountsData.data
                )
                    ? accountsData.data
                    : [];


            const page =
                pages.find(
                    (item) =>
                        String(
                            item.id
                        ) === pageId
                );


            if (
                !page
            ) {

                return res
                    .status(404)
                    .json({
                        error:
                            "The requested Facebook Page is not available through this Meta connection."
                    });

            }


            if (
                !page.access_token
            ) {

                return res
                    .status(502)
                    .json({
                        error:
                            "Meta did not provide a Page access token."
                    });

            }


            /*
            ============================================
            SUBSCRIBE PAGE TO APP
            ============================================
            */

            const subscribeUrl =
                new URL(
                    `https://graph.facebook.com/v26.0/${encodeURIComponent(
                        pageId
                    )}/subscribed_apps`
                );


            subscribeUrl
                .searchParams
                .set(
                    "subscribed_fields",
                    "feed"
                );


            subscribeUrl
                .searchParams
                .set(
                    "access_token",
                    page.access_token
                );


            const subscribeResponse =
                await fetch(
                    subscribeUrl,
                    {
                        method:
                            "POST",

                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );


            const subscribeData =
                await subscribeResponse
                    .json();


            if (
                !subscribeResponse.ok
                ||
                subscribeData.success !==
                    true
            ) {

                console.error(
                    "Meta Page subscription failed:",
                    subscribeData
                );


                return res
                    .status(502)
                    .json({

                        error:
                            "Unable to subscribe Facebook Page to webhooks.",

                        meta:
                            subscribeData
                                ?.error
                                ?.message ||
                            "Meta did not confirm the subscription."

                    });

            }


            /*
            ============================================
            SUCCESS
            ============================================
            */

            console.log(
                "✅ Facebook Page subscribed to Meta webhook:",
                {
                    organizationId,
                    businessId,
                    business:
                        business.name,
                    pageId,
                    pageName:
                        page.name,
                    fields: [
                        "feed"
                    ]
                }
            );


            return res.json({

                success:
                    true,

                businessId,

                business:
                    business.name,

                page: {

                    id:
                        String(
                            page.id
                        ),

                    name:
                        page.name ||
                        ""

                },

                subscribedFields: [
                    "feed"
                ]

            });

        }
        catch (error) {

            console.error(
                "Meta Page subscription error:",
                error
            );


            return res
                .status(500)
                .json({

                    error:
                        "Unable to subscribe Facebook Page.",

                    details:
                        error.message

                });

        }

    }
);


/*
====================================================
GET /api/meta/permissions
====================================================

Returns the permissions attached to the currently
saved Meta access token.

The access token itself is never returned.
====================================================
*/

router.get(
    "/meta/permissions",
    authMiddleware,
    async (req, res) => {

        try {

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

                return res
                    .status(401)
                    .json({
                        error:
                            "Authentication required."
                    });

            }


            /*
            ============================================
            LOAD SAVED META CONNECTION
            ============================================
            */

            const connection =
                database
                    .prepare(`
                        SELECT
                            access_token_encrypted

                        FROM social_oauth_connections

                        WHERE
                            organization_id = ?
                            AND provider = 'meta'
                    `)
                    .get(
                        organizationId
                    );


            if (
                !connection
                ||
                !connection.access_token_encrypted
            ) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Meta is not connected."
                    });

            }


            /*
            ============================================
            DECRYPT TOKEN SERVER-SIDE
            ============================================
            */

            const accessToken =
                decryptToken(
                    connection
                        .access_token_encrypted
                );


            /*
            ============================================
            ASK META FOR TOKEN PERMISSIONS
            ============================================
            */

            const permissionsUrl =
                new URL(
                    "https://graph.facebook.com/v26.0/me/permissions"
                );


            permissionsUrl
                .searchParams
                .set(
                    "access_token",
                    accessToken
                );


            const metaResponse =
                await fetch(
                    permissionsUrl,
                    {
                        method:
                            "GET",

                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );


            const metaData =
                await metaResponse
                    .json();


            if (
                !metaResponse.ok
            ) {

                console.error(
                    "Meta permissions lookup failed:",
                    metaData
                );


                return res
                    .status(502)
                    .json({

                        error:
                            "Unable to load Meta permissions.",

                        meta:
                            metaData
                                ?.error
                                ?.message ||
                            "Unknown Meta error."

                    });

            }


            /*
            ============================================
            SAFE RESPONSE
            ============================================
            */

            const permissions =
                Array.isArray(
                    metaData.data
                )
                    ? metaData.data.map(
                        (item) => ({

                            permission:
                                item.permission,

                            status:
                                item.status

                        })
                    )
                    : [];


            return res.json({

                organizationId,

                permissions

            });

        }
        catch (error) {

            console.error(
                "Meta permissions error:",
                error
            );


            return res
                .status(500)
                .json({

                    error:
                        "Unable to inspect Meta permissions.",

                    details:
                        error.message

                });

        }

    }
);

/*
====================================================
EXPORT
====================================================
*/

module.exports =
    router;
