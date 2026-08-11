const database =
    require("../database/database");


/*
====================================================
MASTER CONTROL
Business Detector
====================================================

Tenant-safe automatic business detection.

Only searches businesses belonging to the
current organization.
====================================================
*/

function detectBusiness(
    comment,
    organizationId
) {

    const text =
        normalizeText(
            comment
        );


    const numericOrganizationId =
        Number(
            organizationId
        );


    if (!text) {

        return {
            detected: false
        };

    }


    if (
        !Number.isInteger(
            numericOrganizationId
        )
        ||
        numericOrganizationId <= 0
    ) {

        throw new Error(
            "A valid organization ID is required for business detection."
        );

    }


    /*
    ====================================================
    Load Organization Businesses
    ====================================================
    */

    const businesses =
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
                    organization_id = ?

                ORDER BY
                    id ASC
            `)
            .all(
                numericOrganizationId
            );


    /*
    ====================================================
    Score Businesses
    ====================================================
    */

    const results =
        businesses.map(
            (business) => {

                const score =
                    calculateBusinessScore(
                        business,
                        text
                    );


                return {

                    business,

                    score

                };

            }
        );


    results.sort(
        (a, b) =>
            b.score - a.score
    );


    const bestMatch =
        results[0];


    /*
    ====================================================
    No Reliable Match
    ====================================================
    */

    if (
        !bestMatch
        ||
        bestMatch.score <= 0
    ) {

        return {
            detected: false
        };

    }


    /*
    ====================================================
    Return Match
    ====================================================
    */

    return {

        detected:
            true,

        businessId:
            bestMatch.business.id,

        businessName:
            bestMatch.business.name,

        emoji:
            bestMatch.business.emoji,

        organizationId:
            bestMatch.business
                .organization_id,

        score:
            bestMatch.score

    };

}


/*
====================================================
Calculate Business Score
====================================================
*/

function calculateBusinessScore(
    business,
    text
) {

    let score = 0;


    const businessName =
        normalizeText(
            business.name
        );


    const prompt =
        normalizeText(
            business.prompt
        );


    /*
    ====================================================
    Business Name Match
    ====================================================
    */

    if (
        businessName
        &&
        text.includes(
            businessName
        )
    ) {

        score += 100;

    }


    /*
    ====================================================
    Business-Specific Keywords
    ====================================================
    */

    const keywords =
        getBusinessKeywords(
            business
        );


    for (
        const keyword
        of keywords
    ) {

        if (
            text.includes(
                keyword
            )
        ) {

            score += 10;

        }

    }


    /*
    ====================================================
    Prompt Word Matching
    ====================================================
    */

    const promptWords =
        prompt
            .split(
                /[^a-z0-9áéíóúüñ]+/i
            )
            .filter(
                (word) =>
                    word.length >= 5
            );


    for (
        const word
        of promptWords
    ) {

        /*
         * Exact match.
         */

        if (
            text.includes(
                word
            )
        ) {

            score += 2;

            continue;

        }


        /*
         * Simple word-stem matching.
         *
         * Example:
         *
         * deliver
         * delivery
         * delivering
         */

        const stem =
            getSimpleStem(
                word
            );


        if (
            stem.length >= 4
            &&
            text.includes(
                stem
            )
        ) {

            score += 1;

        }

    }


    return score;

}


/*
====================================================
Business Keywords
====================================================

Temporary keyword hints.

Eventually these should live in the database
instead of being hard-coded here.
====================================================
*/

function getBusinessKeywords(
    business
) {

    const name =
        String(
            business.name || ""
        )
            .toLowerCase();


    /*
    ====================================================
    Benditas Foods
    ====================================================
    */

    if (
        name.includes(
            "benditas"
        )
    ) {

        return [

            "arepa",
            "arepas",

            "empanada",
            "empanadas",

            "colombian food",
            "colombian",

            "delivery",
            "deliver",

            "order",
            "food"

        ];

    }


    /*
    ====================================================
    Chicago Tony's
    ====================================================
    */

    if (
        name.includes(
            "chicago tony"
        )
    ) {

        return [

            "pizza",
            "deep dish",
            "chicago pizza",
            "tavern",

            "pepperoni",
            "sausage",

            "delivery",
            "deliver",

            "pickup"

        ];

    }


    /*
    ====================================================
    Lucky Pet
    ====================================================
    */

    if (
        name.includes(
            "lucky pet"
        )
    ) {

        return [

            "dog",
            "dogs",

            "dog treat",
            "dog treats",

            "treat",
            "treats",

            "pet",
            "pets"

        ];

    }


    /*
    ====================================================
    Master Control
    ====================================================
    */

    if (
        name.includes(
            "master control"
        )
    ) {

        return [

            "website",
            "web development",

            "logo",
            "branding",

            "graphic design",
            "graphics",

            "advertisement",
            "advertising",

            "design"

        ];

    }


    /*
    ====================================================
    Mensajes del Colibrí
    ====================================================
    */

    if (
        name.includes(
            "colibr"
        )
    ) {

        return [

            "tarot",

            "lectura",
            "lecturas",

            "reading",
            "readings",

            "membresía",
            "membresia",
            "membership",

            "ángel",
            "angeles",
            "ángeles",

            "espiritual",
            "spiritual"

        ];

    }


    return [];

}


/*
====================================================
Simple Stem
====================================================
*/

function getSimpleStem(
    word
) {

    let stem =
        String(
            word || ""
        )
            .toLowerCase();


    const endings = [

        "ing",
        "ies",
        "ied",
        "ly",
        "ed",
        "es",
        "s"

    ];


    for (
        const ending
        of endings
    ) {

        if (
            stem.endsWith(
                ending
            )
            &&
            stem.length >
                ending.length + 3
        ) {

            stem =
                stem.slice(
                    0,
                    -ending.length
                );

            break;

        }

    }


    return stem;

}


/*
====================================================
Normalize Text
====================================================
*/

function normalizeText(
    value
) {

    return String(
        value || ""
    )
        .toLowerCase()
        .trim();

}


/*
====================================================
EXPORT
====================================================
*/

module.exports = {

    detectBusiness

};