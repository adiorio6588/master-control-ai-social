const OpenAI = require("openai");

// ==========================================
// Development Mode
// true  = Fake AI replies (FREE)
// false = Real OpenAI API
// ==========================================
const USE_MOCK_AI = false;

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function generateReply(prompt, comment) {

    if (USE_MOCK_AI) {
        return generateMockReply(prompt, comment);
    }

    const response = await client.responses.create({
        model: "gpt-5-mini",
        instructions: prompt,
        input: comment
    });

    return response.output_text;
}

function generateMockReply(prompt, comment) {
    const lowerPrompt = prompt.toLowerCase();

    console.log("MOCK PROMPT:", lowerPrompt);

    if (lowerPrompt.includes("pizza")) {
        return `🍕 Thanks for reaching out! We appreciate your question about "${comment}". Please send us a direct message and we'll be happy to help!`;
    }

    if (lowerPrompt.includes("colombian")) {
        return `🇨🇴 Thanks so much! We'd love to help with "${comment}". Send us a DM and we'll gladly answer your questions.`;
    }

    if (lowerPrompt.includes("dog")) {
        return `🐶 Thanks for asking! We'd be happy to help with "${comment}". Please send us a message for more information.`;
    }

    if (lowerPrompt.includes("graphics")) {
        return `💻 Thanks for your interest! We'd love to discuss "${comment}". Send us a DM and let's create something awesome together.`;
    }

    return `Thank you for your message about "${comment}". We'll be happy to help!`;
}

module.exports = {
    generateReply
};