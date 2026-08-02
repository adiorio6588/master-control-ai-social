const database = require("../database/database");

function findMatchingRule(businessId, comment) {

    const rules = database
        .prepare(`
            SELECT *
            FROM reply_rules
            WHERE business_id = ?
            AND enabled = 1
        `)
        .all(businessId);

    const text = comment.toLowerCase();

    for (const rule of rules) {

        const keywords = rule.keywords
            .split(",")
            .map(k => k.trim().toLowerCase());

        const matched = keywords.some(keyword =>
            text.includes(keyword)
        );

        if (matched) {

            return {
                matched: true,
                source: "RULE",
                ruleName: rule.name,
                reply: rule.reply
            };

        }

    }

    return {
        matched: false
    };

}

module.exports = {
    findMatchingRule
};