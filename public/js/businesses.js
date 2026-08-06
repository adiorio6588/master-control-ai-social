const businessList =
    document.getElementById("business-list");

const businessForm =
    document.getElementById("business-form");

const businessIdInput =
    document.getElementById("business-id");

const businessNameInput =
    document.getElementById("business-name");

const businessEmojiInput =
    document.getElementById("business-emoji");

const businessPromptInput =
    document.getElementById("business-prompt");

const formTitle =
    document.getElementById("business-form-title");

const formStatus =
    document.getElementById("business-form-status");

const addBusinessButton =
    document.getElementById("add-business");

const cancelBusinessButton =
    document.getElementById("cancel-business");

const refreshBusinessesButton =
    document.getElementById("refresh-businesses");

let businesses = [];

async function loadBusinesses() {
    renderLoadingState();
    setRefreshState(true);

    try {
        businesses =
            await MasterControlAPI.getBusinesses();

        if (!Array.isArray(businesses)) {
            businesses = [];
        }

        renderBusinesses();
    } catch (error) {
        console.error(
            "Business loading error:",
            error
        );

        businessList.innerHTML = `
            <div class="mc-empty">
                ${escapeHtml(
                    error.message ||
                    "Unable to load businesses."
                )}
            </div>
        `;
    } finally {
        setRefreshState(false);
    }
}

function renderLoadingState() {
    businessList.innerHTML = `
        <div class="mc-empty">
            Loading businesses...
        </div>
    `;
}

function renderBusinesses() {
    businessList.innerHTML = "";

    if (!businesses.length) {
        businessList.innerHTML = `
            <div class="mc-empty">
                No businesses have been added.
            </div>
        `;

        return;
    }

    businesses.forEach((business) => {
        const card =
            document.createElement("article");

        card.className =
            "business-profile-card";

        const promptPreview =
            getPromptPreview(
                business.prompt
            );

        card.innerHTML = `
            <div class="business-card-header">

                <div class="business-card-identity">

                    <div class="business-card-emoji">
                        ${escapeHtml(
                            business.emoji || "🏢"
                        )}
                    </div>

                    <div>

                        <span class="business-card-id">
                            BUSINESS ID // ${Number(
                                business.id
                            )}
                        </span>

                        <h3>
                            ${escapeHtml(
                                business.name ||
                                "Unnamed Business"
                            )}
                        </h3>

                    </div>

                </div>

                <span class="mc-badge approved">
                    Active
                </span>

            </div>

            <div class="business-card-section">

                <span class="business-card-label">
                    AI Personality
                </span>

                <p class="business-card-prompt">
                    ${escapeHtml(promptPreview)}
                </p>

            </div>

            <div class="business-card-metrics">

                <div class="business-card-metric">
                    <span>Comments</span>
                    <strong>
                        ${formatMetric(
                            business.total_comments
                        )}
                    </strong>
                </div>

                <div class="business-card-metric">
                    <span>Rules</span>
                    <strong>
                        ${formatMetric(
                            business.total_rules
                        )}
                    </strong>
                </div>

                <div class="business-card-metric">
                    <span>AI Replies</span>
                    <strong>
                        ${formatMetric(
                            business.total_replies
                        )}
                    </strong>
                </div>

            </div>

            <div class="business-card-actions">

                <button
                    class="mc-button edit-business"
                    type="button"
                    data-id="${Number(business.id)}"
                >
                    Edit
                </button>

                <button
                    class="mc-button danger delete-business"
                    type="button"
                    data-id="${Number(business.id)}"
                >
                    Delete
                </button>

            </div>
        `;

        businessList.appendChild(card);
    });

    attachBusinessCardEvents();
}

function attachBusinessCardEvents() {
    document
        .querySelectorAll(".edit-business")
        .forEach((button) => {
            button.addEventListener(
                "click",
                () => {
                    editBusiness(
                        Number(
                            button.dataset.id
                        )
                    );
                }
            );
        });

    document
        .querySelectorAll(".delete-business")
        .forEach((button) => {
            button.addEventListener(
                "click",
                () => {
                    deleteBusiness(
                        Number(
                            button.dataset.id
                        )
                    );
                }
            );
        });
}

function editBusiness(id) {
    const business =
        businesses.find(
            (item) =>
                Number(item.id) ===
                Number(id)
        );

    if (!business) {
        return;
    }

    businessIdInput.value =
        business.id;

    businessNameInput.value =
        business.name || "";

    businessEmojiInput.value =
        business.emoji || "";

    businessPromptInput.value =
        business.prompt || "";

    formTitle.textContent =
        "Edit Business";

    formStatus.textContent =
        `EDITING PROFILE // ${business.name}`;

    businessNameInput.focus();

    document
        .getElementById(
            "business-form-panel"
        )
        ?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
}

function resetBusinessForm() {
    businessForm.reset();

    businessIdInput.value = "";

    formTitle.textContent =
        "Add Business";

    formStatus.textContent = "";
}

businessForm.addEventListener(
    "submit",
    async (event) => {
        event.preventDefault();

        const businessId =
            Number(
                businessIdInput.value
            ) || null;

        const payload = {
            name:
                businessNameInput
                    .value
                    .trim(),

            emoji:
                businessEmojiInput
                    .value
                    .trim(),

            prompt:
                businessPromptInput
                    .value
                    .trim()
        };

        if (
            !payload.name ||
            !payload.prompt
        ) {
            formStatus.textContent =
                "SYSTEM ERROR // NAME AND PROMPT REQUIRED";

            return;
        }

        setFormState(true);

        formStatus.textContent =
            "SAVING BUSINESS PROFILE...";

        try {
            if (businessId) {
                await MasterControlAPI
                    .updateBusiness(
                        businessId,
                        payload
                    );
            } else {
                await MasterControlAPI
                    .createBusiness(
                        payload
                    );
            }

            formStatus.textContent =
                "BUSINESS PROFILE SAVED";

            await loadBusinesses();

            window.setTimeout(
                () => {
                    resetBusinessForm();
                },
                700
            );
        } catch (error) {
            console.error(
                "Business save error:",
                error
            );

            formStatus.textContent =
                `SYSTEM ERROR // ${error.message}`;
        } finally {
            setFormState(false);
        }
    }
);

async function deleteBusiness(id) {
    const business =
        businesses.find(
            (item) =>
                Number(item.id) ===
                Number(id)
        );

    if (!business) {
        return;
    }

    const confirmed =
        window.confirm(
            `Delete ${business.name}? This cannot be undone.`
        );

    if (!confirmed) {
        return;
    }

    try {
        await MasterControlAPI
            .deleteBusiness(id);

        resetBusinessForm();
        await loadBusinesses();
    } catch (error) {
        console.error(
            "Business deletion error:",
            error
        );

        window.alert(error.message);
    }
}

addBusinessButton.addEventListener(
    "click",
    () => {
        resetBusinessForm();
        businessNameInput.focus();

        document
            .getElementById(
                "business-form-panel"
            )
            ?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
    }
);

cancelBusinessButton.addEventListener(
    "click",
    () => {
        resetBusinessForm();
    }
);

refreshBusinessesButton.addEventListener(
    "click",
    loadBusinesses
);

function setRefreshState(isLoading) {
    refreshBusinessesButton.disabled =
        isLoading;

    refreshBusinessesButton.textContent =
        isLoading
            ? "Loading..."
            : "Refresh";
}

function setFormState(isSaving) {
    const saveButton =
        document.getElementById(
            "save-business"
        );

    saveButton.disabled = isSaving;

    saveButton.textContent =
        isSaving
            ? "Saving..."
            : "Save Business";
}

function getPromptPreview(prompt = "") {
    const cleaned =
        String(prompt)
            .replace(/\s+/g, " ")
            .trim();

    if (!cleaned) {
        return "No AI personality prompt has been added.";
    }

    if (cleaned.length <= 180) {
        return cleaned;
    }

    return `${cleaned.slice(0, 177)}...`;
}

function formatMetric(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "—";
    }

    return Number(value).toLocaleString();
}

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

loadBusinesses();