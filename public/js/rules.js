const businessFilter =
    document.getElementById("business-filter");

const ruleBusiness =
    document.getElementById("rule-business");

const rulesList =
    document.getElementById("rules-list");

const ruleCount =
    document.getElementById("rule-count");

const enabledCount =
    document.getElementById("enabled-count");

const messageBox =
    document.getElementById("message-box");

const modal =
    document.getElementById("rule-modal");

const modalTitle =
    document.getElementById("modal-title");

const ruleForm =
    document.getElementById("rule-form");

const ruleIdInput =
    document.getElementById("rule-id");

const ruleNameInput =
    document.getElementById("rule-name");

const ruleKeywordsInput =
    document.getElementById("rule-keywords");

const ruleReplyInput =
    document.getElementById("rule-reply");

const ruleEnabledInput =
    document.getElementById("rule-enabled");

const newRuleButton =
    document.getElementById("new-rule-button");

const closeModalButton =
    document.getElementById("close-modal-button");

const cancelButton =
    document.getElementById("cancel-button");

const modalBackdrop =
    document.getElementById("modal-backdrop");

let businesses = [];
let rules = [];
let allRules = [];


async function loadBusinesses() {

    businesses =
        await MasterControlAPI.getBusinesses();

    businessFilter.innerHTML = `
        <option value="">All businesses</option>
    `;

    ruleBusiness.innerHTML = `
        <option value="">Select a business</option>
    `;

    businesses.forEach((business) => {

        const label =
            `${business.emoji || "🏢"} ${business.name}`;

        const filterOption =
            document.createElement("option");

        filterOption.value =
            business.id;

        filterOption.textContent =
            label;

        businessFilter.appendChild(
            filterOption
        );


        const formOption =
            document.createElement("option");

        formOption.value =
            business.id;

        formOption.textContent =
            label;

        ruleBusiness.appendChild(
            formOption
        );

    });

}


async function loadRules() {

    rulesList.innerHTML = `
        <div class="empty-state">
            Loading automatic reply rules...
        </div>
    `;

    try {

        allRules =
            await MasterControlAPI.getRules();

        const businessId =
            Number(
                businessFilter.value
            );

        rules =
            businessId
                ? allRules.filter(
                    (rule) =>
                        Number(
                            rule.business_id
                        ) ===
                        businessId
                )
                : allRules;

        renderRules();

    }
    catch (error) {

        console.error(error);

        rulesList.innerHTML = `
            <div class="empty-state error">
                ${escapeHtml(error.message)}
            </div>
        `;

    }

}


function renderRules() {

    rulesList.innerHTML = "";

    ruleCount.textContent =
        rules.length;

    enabledCount.textContent =
        rules.filter(
            (rule) =>
                rule.enabled
        ).length;


    if (!rules.length) {

        rulesList.innerHTML = `
            <div class="empty-state">
                No rules exist for this business yet.
            </div>
        `;

        return;

    }


    rules.forEach((rule, index) => {

        const card =
            document.createElement(
                "article"
            );

        card.className =
            `rule-card ${
                rule.enabled
                    ? ""
                    : "disabled-rule"
            }`;

        const number =
            String(index + 1)
                .padStart(2, "0");

        card.innerHTML = `
            <div class="rule-header">

                <div class="rule-number">
                    ${number}
                </div>

                <div class="rule-title">
                    <p>
                        ${escapeHtml(
                            `${rule.business_emoji || "🏢"} ${rule.business_name}`
                        )}
                    </p>

                    <h3>
                        ${escapeHtml(rule.name)}
                    </h3>
                </div>

                <span class="status-badge">
                    ${rule.enabled
                        ? "Enabled"
                        : "Disabled"}
                </span>

            </div>

            <div class="rule-section">

                <span>
                    Keywords
                </span>

                <div class="keyword-list">
                    ${renderKeywords(
                        rule.keywords
                    )}
                </div>

            </div>

            <div class="rule-section">

                <span>
                    Automatic Reply
                </span>

                <p class="reply-preview">
                    ${escapeHtml(
                        rule.reply
                    )}
                </p>

            </div>

            <div class="rule-actions">

                <button
                    class="action-button edit-button"
                    data-rule-id="${rule.id}"
                >
                    Edit
                </button>

                <button
                    class="action-button toggle-button"
                    data-rule-id="${rule.id}"
                >
                    ${rule.enabled
                        ? "Disable"
                        : "Enable"}
                </button>

                <button
                    class="action-button delete-button"
                    data-rule-id="${rule.id}"
                >
                    Delete
                </button>

            </div>
        `;

        rulesList.appendChild(
            card
        );

    });

    attachRuleEvents();

}


function renderKeywords(
    keywordString = ""
) {

    return String(keywordString)
        .split(",")
        .map(
            (keyword) =>
                keyword.trim()
        )
        .filter(Boolean)
        .map(
            (keyword) => `
                <span class="keyword">
                    ${escapeHtml(keyword)}
                </span>
            `
        )
        .join("");

}


function attachRuleEvents() {

    document
        .querySelectorAll(
            ".edit-button"
        )
        .forEach((button) => {

            button.addEventListener(
                "click",
                () => {

                    openEditModal(
                        Number(
                            button.dataset.ruleId
                        )
                    );

                }
            );

        });


    document
        .querySelectorAll(
            ".toggle-button"
        )
        .forEach((button) => {

            button.addEventListener(
                "click",
                async () => {

                    await toggleRule(
                        Number(
                            button.dataset.ruleId
                        )
                    );

                }
            );

        });


    document
        .querySelectorAll(
            ".delete-button"
        )
        .forEach((button) => {

            button.addEventListener(
                "click",
                async () => {

                    await deleteRule(
                        Number(
                            button.dataset.ruleId
                        )
                    );

                }
            );

        });

}


function openCreateModal() {

    ruleForm.reset();

    ruleIdInput.value = "";

    modalTitle.textContent =
        "Create Rule";

    ruleEnabledInput.checked =
        true;

    if (businessFilter.value) {

        ruleBusiness.value =
            businessFilter.value;

    }

    openModal();

}


function openEditModal(
    ruleId
) {

    const rule =
        allRules.find(
            (item) =>
                Number(item.id) ===
                Number(ruleId)
        );

    if (!rule) {
        return;
    }

    ruleIdInput.value =
        rule.id;

    ruleBusiness.value =
        rule.business_id;

    ruleNameInput.value =
        rule.name;

    ruleKeywordsInput.value =
        rule.keywords;

    ruleReplyInput.value =
        rule.reply;

    ruleEnabledInput.checked =
        Boolean(rule.enabled);

    modalTitle.textContent =
        "Edit Rule";

    openModal();

}


function openModal() {

    modal.classList.remove(
        "hidden"
    );

    document.body.classList.add(
        "modal-open"
    );

}


function closeModal() {

    modal.classList.add(
        "hidden"
    );

    document.body.classList.remove(
        "modal-open"
    );

}


ruleForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        const ruleId =
            Number(
                ruleIdInput.value
            );

        const payload = {

            businessId:
                Number(
                    ruleBusiness.value
                ),

            name:
                ruleNameInput.value.trim(),

            keywords:
                ruleKeywordsInput.value.trim(),

            reply:
                ruleReplyInput.value.trim(),

            enabled:
                ruleEnabledInput.checked

        };


        try {

            if (ruleId) {

                await MasterControlAPI
                    .updateRule(
                        ruleId,
                        payload
                    );

            }
            else {

                await MasterControlAPI
                    .createRule(
                        payload
                    );

            }


            closeModal();

            showMessage(
                ruleId
                    ? "Rule updated successfully."
                    : "Rule created successfully.",
                "success"
            );

            await loadRules();

        }
        catch (error) {

            showMessage(
                error.message,
                "error"
            );

        }

    }
);


async function toggleRule(
    ruleId
) {

    const rule =
        allRules.find(
            (item) =>
                Number(item.id) ===
                Number(ruleId)
        );

    if (!rule) {
        return;
    }


    try {

        await MasterControlAPI.updateRule(
            ruleId,
            {
                businessId:
                    Number(
                        rule.business_id
                    ),

                name:
                    rule.name,

                keywords:
                    rule.keywords,

                reply:
                    rule.reply,

                enabled:
                    !Boolean(
                        rule.enabled
                    )
            }
        );

        showMessage(
            rule.enabled
                ? "Rule disabled."
                : "Rule enabled.",
            "success"
        );

        await loadRules();

    }
    catch (error) {

        showMessage(
            error.message,
            "error"
        );

    }

}


async function deleteRule(
    ruleId
) {

    const rule =
        allRules.find(
            (item) =>
                Number(item.id) ===
                Number(ruleId)
        );

    const confirmed =
        window.confirm(
            `Delete the rule "${
                rule?.name ||
                ruleId
            }"?`
        );

    if (!confirmed) {
        return;
    }


    try {

        const result =
            await MasterControlAPI
                .deleteRule(
                    ruleId
                );

        showMessage(
            result.message ||
                "Rule deleted.",
            "success"
        );

        await loadRules();

    }
    catch (error) {

        showMessage(
            error.message,
            "error"
        );

    }

}


function showMessage(
    message,
    type
) {

    messageBox.textContent =
        message;

    messageBox.className =
        `message-box ${type}`;

    setTimeout(
        () => {

            messageBox.className =
                "message-box hidden";

        },
        3500
    );

}


function escapeHtml(
    value = ""
) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


businessFilter.addEventListener(
    "change",
    loadRules
);

newRuleButton.addEventListener(
    "click",
    openCreateModal
);

closeModalButton.addEventListener(
    "click",
    closeModal
);

cancelButton.addEventListener(
    "click",
    closeModal
);

modalBackdrop.addEventListener(
    "click",
    closeModal
);


async function initializeRulesManager() {

    try {

        await loadBusinesses();

        await loadRules();

    }
    catch (error) {

        console.error(error);

        showMessage(
            error.message,
            "error"
        );

    }

}


initializeRulesManager();