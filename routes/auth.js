const express =
    require("express");

const router =
    express.Router();

const bcrypt =
    require("bcryptjs");

const jwt =
    require("jsonwebtoken");

const database =
    require("../database/database");

const authMiddleware =
    require("../middleware/auth");


/*
====================================================
POST /api/auth/register
====================================================
*/

router.post(
    "/auth/register",
    async (req, res) => {

        try {

            const email =
                normalizeEmail(
                    req.body.email
                );


            const displayName =
                typeof req.body.displayName ===
                    "string"

                    ? req.body.displayName.trim()

                    : "";


            const password =
                typeof req.body.password ===
                    "string"

                    ? req.body.password

                    : "";


            const organizationName =
                typeof req.body.organizationName ===
                    "string"

                    ? req.body.organizationName.trim()

                    : "";


            if (!email) {

                return res.status(400).json({
                    error:
                        "Email is required."
                });

            }


            if (
                !password ||
                password.length < 8
            ) {

                return res.status(400).json({
                    error:
                        "Password must be at least 8 characters."
                });

            }


            if (!organizationName) {

                return res.status(400).json({
                    error:
                        "Organization name is required."
                });

            }


            const existingUser =
                database
                    .prepare(`
                        SELECT id

                        FROM users

                        WHERE email = ?
                    `)
                    .get(email);


            if (existingUser) {

                return res.status(409).json({
                    error:
                        "An account with this email already exists."
                });

            }


            const passwordHash =
                await bcrypt.hash(
                    password,
                    12
                );


            const baseSlug =
                createOrganizationSlug(
                    organizationName
                );


            const createAccount =
                database.transaction(
                    () => {

                        const userResult =
                            database
                                .prepare(`
                                    INSERT INTO users (
                                        email,
                                        display_name,
                                        password_hash
                                    )

                                    VALUES (?, ?, ?)
                                `)
                                .run(
                                    email,
                                    displayName,
                                    passwordHash
                                );


                        const userId =
                            Number(
                                userResult.lastInsertRowid
                            );


                        const uniqueSlug =
                            getUniqueOrganizationSlug(
                                baseSlug
                            );


                        const organizationResult =
                            database
                                .prepare(`
                                    INSERT INTO organizations (
                                        name,
                                        slug,
                                        owner_user_id
                                    )

                                    VALUES (?, ?, ?)
                                `)
                                .run(
                                    organizationName,
                                    uniqueSlug,
                                    userId
                                );


                        const organizationId =
                            Number(
                                organizationResult.lastInsertRowid
                            );


                        database
                            .prepare(`
                                INSERT INTO organization_members (
                                    organization_id,
                                    user_id,
                                    role
                                )

                                VALUES (?, ?, 'owner')
                            `)
                            .run(
                                organizationId,
                                userId
                            );


                        return {
                            userId,
                            organizationId,
                            organizationSlug:
                                uniqueSlug
                        };

                    }
                );


            const account =
                createAccount();


            const token =
                createToken({
                    userId:
                        account.userId,

                    email,

                    organizationId:
                        account.organizationId,

                    role:
                        "owner"
                });


            res.status(201).json({

                token,

                user: {
                    id:
                        account.userId,

                    email,

                    displayName
                },

                organization: {
                    id:
                        account.organizationId,

                    name:
                        organizationName,

                    slug:
                        account.organizationSlug,

                    role:
                        "owner"
                }

            });

        }
        catch (error) {

            console.error(
                "Registration error:",
                error
            );


            res.status(500).json({
                error:
                    "Unable to create account.",

                details:
                    error.message
            });

        }

    }
);


/*
====================================================
POST /api/auth/login
====================================================
*/

router.post(
    "/auth/login",
    async (req, res) => {

        try {

            const email =
                normalizeEmail(
                    req.body.email
                );


            const password =
                typeof req.body.password ===
                    "string"

                    ? req.body.password

                    : "";


            if (
                !email ||
                !password
            ) {

                return res.status(400).json({
                    error:
                        "Email and password are required."
                });

            }


            const user =
                database
                    .prepare(`
                        SELECT
                            id,
                            email,
                            display_name,
                            password_hash

                        FROM users

                        WHERE email = ?
                    `)
                    .get(email);


            if (
                !user ||
                !user.password_hash
            ) {

                return res.status(401).json({
                    error:
                        "Invalid email or password."
                });

            }


            const passwordMatches =
                await bcrypt.compare(
                    password,
                    user.password_hash
                );


            if (!passwordMatches) {

                return res.status(401).json({
                    error:
                        "Invalid email or password."
                });

            }


            const membership =
                database
                    .prepare(`
                        SELECT
                            organizations.id
                                AS organization_id,

                            organizations.name
                                AS organization_name,

                            organizations.slug
                                AS organization_slug,

                            organization_members.role

                        FROM organization_members

                        INNER JOIN organizations

                            ON organizations.id =
                                organization_members.organization_id

                        WHERE
                            organization_members.user_id = ?

                        ORDER BY
                            CASE
                                WHEN organization_members.role = 'owner'
                                THEN 1
                                ELSE 2
                            END,

                            organizations.id ASC

                        LIMIT 1
                    `)
                    .get(user.id);


            if (!membership) {

                return res.status(403).json({
                    error:
                        "No organization membership found for this account."
                });

            }


            const token =
                createToken({
                    userId:
                        user.id,

                    email:
                        user.email,

                    organizationId:
                        membership.organization_id,

                    role:
                        membership.role
                });


            res.json({

                token,

                user: {
                    id:
                        user.id,

                    email:
                        user.email,

                    displayName:
                        user.display_name
                },

                organization: {
                    id:
                        membership.organization_id,

                    name:
                        membership.organization_name,

                    slug:
                        membership.organization_slug,

                    role:
                        membership.role
                }

            });

        }
        catch (error) {

            console.error(
                "Login error:",
                error
            );


            res.status(500).json({
                error:
                    "Unable to sign in.",

                details:
                    error.message
            });

        }

    }
);


/*
====================================================
GET /api/auth/me
====================================================
*/

router.get(
    "/auth/me",
    authMiddleware,
    (req, res) => {

        try {

            const user =
                database
                    .prepare(`
                        SELECT
                            id,
                            email,
                            display_name,
                            created_at

                        FROM users

                        WHERE id = ?
                    `)
                    .get(
                        req.user.id
                    );


            if (!user) {

                return res.status(404).json({
                    error:
                        "User not found."
                });

            }


            const organization =
                database
                    .prepare(`
                        SELECT
                            organizations.id,
                            organizations.name,
                            organizations.slug,
                            organization_members.role

                        FROM organizations

                        INNER JOIN organization_members

                            ON organization_members.organization_id =
                                organizations.id

                        WHERE
                            organizations.id = ?

                            AND organization_members.user_id = ?
                    `)
                    .get(
                        req.organizationId,
                        req.user.id
                    );


            if (!organization) {

                return res.status(403).json({
                    error:
                        "Organization access denied."
                });

            }


            res.json({

                user: {
                    id:
                        user.id,

                    email:
                        user.email,

                    displayName:
                        user.display_name,

                    createdAt:
                        user.created_at
                },

                organization: {
                    id:
                        organization.id,

                    name:
                        organization.name,

                    slug:
                        organization.slug,

                    role:
                        organization.role
                }

            });

        }
        catch (error) {

            console.error(
                "Auth profile error:",
                error
            );


            res.status(500).json({
                error:
                    "Unable to load account.",

                details:
                    error.message
            });

        }

    }
);


/*
====================================================
CREATE JWT
====================================================
*/

function createToken({
    userId,
    email,
    organizationId,
    role
}) {

    const secret =
        process.env.JWT_SECRET;


    if (!secret) {

        throw new Error(
            "JWT_SECRET is not configured."
        );

    }


    return jwt.sign(
        {
            userId,
            email,
            organizationId,
            role
        },
        secret,
        {
            expiresIn:
                "7d"
        }
    );

}


/*
====================================================
NORMALIZE EMAIL
====================================================
*/

function normalizeEmail(value) {

    return typeof value ===
        "string"

        ? value
            .trim()
            .toLowerCase()

        : "";

}


/*
====================================================
CREATE ORGANIZATION SLUG
====================================================
*/

function createOrganizationSlug(
    name
) {

    const slug =
        String(
            name || ""
        )
            .toLowerCase()
            .trim()
            .replace(
                /[^a-z0-9]+/g,
                "-"
            )
            .replace(
                /^-+|-+$/g,
                ""
            );


    return slug ||
        "organization";

}


/*
====================================================
UNIQUE ORGANIZATION SLUG
====================================================
*/

function getUniqueOrganizationSlug(
    baseSlug
) {

    let slug =
        baseSlug;


    let counter =
        2;


    while (
        database
            .prepare(`
                SELECT id

                FROM organizations

                WHERE slug = ?
            `)
            .get(slug)
    ) {

        slug =
            `${baseSlug}-${counter}`;


        counter += 1;

    }


    return slug;

}


/*
====================================================
EXPORT
====================================================
*/

module.exports =
    router;