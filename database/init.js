const database = require("./database");

function initializeDatabase() {
    database.exec(`
        CREATE TABLE IF NOT EXISTS businesses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            emoji TEXT DEFAULT '',
            prompt TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        /*
         * Social accounts connected to each business.
         *
         * We intentionally do NOT store access tokens here.
         * Credentials will be handled separately when
         * platform connectors are implemented.
         */
        CREATE TABLE IF NOT EXISTS social_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            business_id INTEGER NOT NULL,

            platform TEXT NOT NULL,

            account_name TEXT DEFAULT '',

            external_account_id TEXT DEFAULT '',

            connected INTEGER NOT NULL DEFAULT 0,

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (business_id)
                REFERENCES businesses(id)
                ON DELETE CASCADE,

            UNIQUE (
                business_id,
                platform
            )
        );

        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            business_id INTEGER,
            platform TEXT NOT NULL DEFAULT 'manual',
            author TEXT DEFAULT 'Customer',
            content TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (business_id)
                REFERENCES businesses(id)
                ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS replies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            comment_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            approved INTEGER NOT NULL DEFAULT 0,
            posted INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (comment_id)
                REFERENCES comments(id)
                ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS reply_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            business_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            keywords TEXT NOT NULL,
            reply TEXT NOT NULL,
            enabled INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (business_id)
                REFERENCES businesses(id)
                ON DELETE CASCADE,

            UNIQUE (
                business_id,
                name
            )
        );
    `);

    upgradeCommentsTable();

    createIndexes();

    seedBusinesses();

    seedSocialAccounts();

    seedReplyRules();

    console.log(
        "Database initialized successfully."
    );
}


/*
====================================================
COMMENTS MIGRATION
====================================================
*/

function upgradeCommentsTable() {
    const columns = database
        .prepare(`
            PRAGMA table_info(comments)
        `)
        .all();

    const existingColumns =
        columns.map(
            (column) =>
                column.name
        );

    addColumnIfMissing(
        existingColumns,
        "reply",
        "reply TEXT"
    );

    addColumnIfMissing(
        existingColumns,
        "source",
        "source TEXT"
    );

    addColumnIfMissing(
        existingColumns,
        "rule",
        "rule TEXT"
    );

    addColumnIfMissing(
        existingColumns,
        "confidence",
        "confidence INTEGER"
    );

    addColumnIfMissing(
        existingColumns,
        "processing_time",
        "processing_time INTEGER"
    );

    addColumnIfMissing(
        existingColumns,
        "estimated_cost",
        "estimated_cost REAL"
    );

    addColumnIfMissing(
        existingColumns,
        "updated_at",
        "updated_at TEXT"
    );
}


/*
====================================================
ADD DATABASE COLUMN IF MISSING
====================================================
*/

function addColumnIfMissing(
    existingColumns,
    columnName,
    columnDefinition
) {
    if (
        existingColumns.includes(
            columnName
        )
    ) {
        return;
    }

    console.log(
        `Adding comments.${columnName}`
    );

    database.exec(`
        ALTER TABLE comments
        ADD COLUMN ${columnDefinition}
    `);
}


/*
====================================================
DATABASE INDEXES
====================================================
*/

function createIndexes() {
    database.exec(`
        CREATE INDEX IF NOT EXISTS
            idx_comments_business_id
        ON comments(business_id);

        CREATE INDEX IF NOT EXISTS
            idx_comments_status
        ON comments(status);

        CREATE INDEX IF NOT EXISTS
            idx_comments_platform
        ON comments(platform);

        CREATE INDEX IF NOT EXISTS
            idx_replies_comment_id
        ON replies(comment_id);

        CREATE INDEX IF NOT EXISTS
            idx_reply_rules_business_id
        ON reply_rules(business_id);

        CREATE INDEX IF NOT EXISTS
            idx_social_accounts_business_id
        ON social_accounts(business_id);

        CREATE INDEX IF NOT EXISTS
            idx_social_accounts_platform
        ON social_accounts(platform);

        CREATE INDEX IF NOT EXISTS
            idx_social_accounts_connected
        ON social_accounts(connected);
    `);
}


/*
====================================================
SEED BUSINESSES
====================================================
*/

function seedBusinesses() {
    const insertBusiness =
        database.prepare(`
            INSERT OR IGNORE INTO businesses (
                name,
                emoji,
                prompt
            )
            VALUES (?, ?, ?)
        `);

    const businesses = [
        {
            name:
                "Chicago Tony's Co.",

            emoji:
                "🍕",

            prompt: `
You represent Chicago Tony's Co., a Chicago-style pizza business.

Reply in a warm, casual, helpful tone.

Keep replies concise and natural.

Never invent delivery areas, prices, availability, or shipping details.

Invite the customer to send a direct message when more information is needed.

Never mention artificial intelligence.
            `.trim()
        },

        {
            name:
                "Benditas Foods",

            emoji:
                "🇨🇴",

            prompt: `
You represent Benditas Foods, a homemade Colombian food business serving California's Central Valley.

Reply warmly and naturally.

Use a welcoming, family-oriented tone.

Mention arepas or empanadas only when relevant.

Never invent prices, ingredients, delivery areas, or availability.

Invite the customer to send a direct message to order when appropriate.

Never mention artificial intelligence.
            `.trim()
        },

        {
            name:
                "Lucky Pet 777",

            emoji:
                "🐶",

            prompt: `
You represent Lucky Pet 777, a homemade dog treat business.

Reply in a friendly, caring, helpful tone.

Keep replies short and easy to understand.

Do not make medical or veterinary claims.

Never invent ingredients, prices, or availability.

Invite the customer to send a direct message when appropriate.

Never mention artificial intelligence.
            `.trim()
        },

        {
            name:
                "Master Control",

            emoji:
                "💻",

            prompt: `
You represent Master Control Computer Graphics.

Reply professionally while remaining approachable.

Be helpful about branding, graphics, advertisements, prompt engineering, and social media content.

Never invent prices, turnaround times, guarantees, or availability.

Invite the customer to send a direct message to discuss the project.

Never mention artificial intelligence.
            `.trim()
        },

        {
            name:
                "Mensajes del Colibrí",

            emoji:
                "🕊️",

            prompt: `
You represent Mensajes del Colibrí, a warm and compassionate spiritual guidance and tarot reading brand.

Reply in Spanish unless the customer writes in English.

Use a kind, reassuring, spiritual, and respectful tone.

Help customers understand the available tarot reading options, the reading process, memberships, and how to place an order.

Do not guarantee future outcomes.

Do not make medical, legal, financial, or mental health claims.

Do not use fear-based language.

Do not claim that tarot replaces professional advice.

Keep replies concise, natural, and welcoming.

Invite the customer to send a direct message when personal information or more details are needed.

Never mention artificial intelligence.
            `.trim()
        }
    ];

    const insertMany =
        database.transaction(
            (rows) => {
                for (
                    const business
                    of rows
                ) {
                    insertBusiness.run(
                        business.name,
                        business.emoji,
                        business.prompt
                    );
                }
            }
        );

    insertMany(
        businesses
    );
}


/*
====================================================
SEED SOCIAL ACCOUNT PLACEHOLDERS
====================================================
*/

function seedSocialAccounts() {
    const businesses =
        database
            .prepare(`
                SELECT
                    id,
                    name
                FROM businesses
            `)
            .all();

    const insertAccount =
        database.prepare(`
            INSERT OR IGNORE INTO social_accounts (
                business_id,
                platform,
                account_name,
                external_account_id,
                connected
            )
            VALUES (?, ?, ?, ?, ?)
        `);

    const platforms = [
        "facebook",
        "instagram",
        "youtube",
        "tiktok"
    ];

    const insertMany =
        database.transaction(
            (businessRows) => {
                for (
                    const business
                    of businessRows
                ) {
                    for (
                        const platform
                        of platforms
                    ) {
                        insertAccount.run(
                            business.id,
                            platform,
                            "",
                            "",
                            0
                        );
                    }
                }
            }
        );

    insertMany(
        businesses
    );
}


/*
====================================================
SEED REPLY RULES
====================================================
*/

function seedReplyRules() {
    const findBusiness =
        database.prepare(`
            SELECT id
            FROM businesses
            WHERE name = ?
        `);

    const insertRule =
        database.prepare(`
            INSERT OR IGNORE INTO reply_rules (
                business_id,
                name,
                keywords,
                reply,
                enabled
            )
            VALUES (?, ?, ?, ?, ?)
        `);

    const rules = [
        {
            business:
                "Benditas Foods",

            name:
                "Pricing",

            keywords:
                "price,cost,how much,pricing,precio,precios,cuanto,cuánto",

            reply:
                "Thanks for asking! Please send us a DM and we'll gladly share our current menu and pricing."
        },

        {
            business:
                "Benditas Foods",

            name:
                "Delivery",

            keywords:
                "deliver,delivery,do you deliver,entrega,domicilio,modesto,lodi",

            reply:
                "We'd love to help! Please send us a DM with your location and we'll let you know if delivery is available."
        },

        {
            business:
                "Benditas Foods",

            name:
                "Ordering",

            keywords:
                "order,purchase,buy,place an order,comprar,pedido,ordenar",

            reply:
                "We'd love to prepare your order! Please send us a DM with the items and quantity you'd like."
        },

        {
            business:
                "Chicago Tony's Co.",

            name:
                "Pizza Pricing",

            keywords:
                "price,cost,how much,pricing,precio,cuanto,cuánto",

            reply:
                "Thanks for reaching out! Please send us a DM and we'll gladly share our current pizza menu and pricing."
        },

        {
            business:
                "Chicago Tony's Co.",

            name:
                "Delivery",

            keywords:
                "deliver,delivery,do you deliver,ship,shipping",

            reply:
                "Please send us a DM with your location and we'll let you know our current pickup and delivery options."
        },

        {
            business:
                "Lucky Pet 777",

            name:
                "Ingredients",

            keywords:
                "ingredients,ingredient,contains,what is in,what's in",

            reply:
                "Thanks for asking! We'd be happy to share the current ingredients. Please send us a DM."
        },

        {
            business:
                "Master Control",

            name:
                "Projects",

            keywords:
                "logo,branding,website,graphics,design,project,advertisement,ad",

            reply:
                "Thanks for reaching out! We'd love to discuss your project. Send us a DM and let's create something awesome together."
        },

        {
            business:
                "Mensajes del Colibrí",

            name:
                "Reading Interest",

            keywords:
                "lectura,lecturas,reading,tarot,consulta,consultation,información,informacion",

            reply:
                "Hola, gracias por comunicarte con Mensajes del Colibrí 🕊️ ¿Estás interesada en una lectura general o en una lectura por preguntas? Envíanos un mensaje privado y con gusto te explicamos las opciones."
        },

        {
            business:
                "Mensajes del Colibrí",

            name:
                "Pricing",

            keywords:
                "precio,precios,costo,cuánto,cuanto,how much,price,cost",

            reply:
                "Gracias por tu interés 🕊️ Contamos con diferentes opciones de lecturas. Envíanos un mensaje privado y con gusto te compartimos los precios y el proceso."
        },

        {
            business:
                "Mensajes del Colibrí",

            name:
                "Membership",

            keywords:
                "membresía,membresia,membership,suscripción,suscripcion",

            reply:
                "Gracias por tu interés en nuestra membresía 🕊️ Incluye acompañamiento espiritual y lecturas durante el mes. Envíanos un mensaje privado y con gusto te compartimos todos los detalles."
        },

        {
            business:
                "Mensajes del Colibrí",

            name:
                "How It Works",

            keywords:
                "cómo funciona,como funciona,proceso,how does it work,how it works",

            reply:
                "El proceso es muy sencillo 🕊️ Eliges el tipo de lectura, realizas el pago y nos envías tu información o preguntas. Después recibirás tu lectura en el formato seleccionado."
        }
    ];

    const insertMany =
        database.transaction(
            (rows) => {
                for (
                    const rule
                    of rows
                ) {
                    const business =
                        findBusiness.get(
                            rule.business
                        );

                    if (
                        !business
                    ) {
                        console.warn(
                            `Skipping rule "${rule.name}": business not found.`
                        );

                        continue;
                    }

                    insertRule.run(
                        business.id,
                        rule.name,
                        rule.keywords,
                        rule.reply,
                        1
                    );
                }
            }
        );

    insertMany(
        rules
    );
}


module.exports =
    initializeDatabase;