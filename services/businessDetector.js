const database = require("../database/database");

function detectBusiness(comment) {

    const text = comment.toLowerCase();

    const businesses = database
        .prepare(`
            SELECT *
            FROM businesses
        `)
        .all();

    for (const business of businesses) {

        const prompt = business.prompt.toLowerCase();

        const words = prompt
            .split(/\W+/)
            .filter(word => word.length > 4);

        const matched = words.some(word =>
            text.includes(word)
        );

        if (matched) {

            return {

                detected: true,

                businessId: business.id,

                businessName: business.name,

                emoji: business.emoji

            };

        }

    }

    return {

        detected: false

    };

}

module.exports = {

    detectBusiness

};