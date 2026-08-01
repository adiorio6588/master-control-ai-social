const businessList =
    document.getElementById("business-list");

const businessTotal =
    document.getElementById("business-total");

const activeProfile =
    document.getElementById("active-profile");

const messageBox =
    document.getElementById("message-box");

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

const editorTitle =
    document.getElementById("editor-title");

const editorMode =
    document.getElementById("editor-mode");

const saveBusinessButton =
    document.getElementById("save-business");

const newBusinessButton =
    document.getElementById("new-business-button");

const refreshBusinessesButton =
    document.getElementById("refresh-businesses");

const cancelEditButton =
    document.getElementById("cancel-edit");

let businesses = [];
let selectedBusinessId = null;

async function loadBusinesses() {
    businessList.innerHTML = `
        <div class="empty-state">
            Loading businesses...
        </div>
    `;

    refreshBusinessesButton.disabled = true;
    refreshBusinessesButton.textContent = "Loading...";

    try {
        const response =
            await fetch("/api/businesses");

        if (!response.ok) {
            throw new Error(
                "Unable to load businesses."
            );
        }

        businesses = await response.json();

        businessTotal.textContent =
            businesses.length;

        renderBusinesses();

        if (selectedBusinessId) {
            const selectedBusiness =
                businesses.find(
                    (business) =>
                        business.id === selectedBusinessId
                );

            if (selectedBusiness) {
                selectBusiness(selectedBusiness.id);
            } else {
                resetEditor();
            }
        }
    } catch (error) {
        console.error(error);

        businessList.innerHTML = `
            <div class="empty-state error-state">
                ${escapeHtml(error.message)}
            </div>
        `;

        businessTotal.textContent = "ERR";
    } finally {
        refreshBusinessesButton.disabled = false;
        refreshBusinessesButton.textContent = "Refresh";
    }
}

function renderBusinesses() {
    businessList.innerHTML = "";

    if (!businesses.length) {
        businessList.innerHTML = `
            <div class="empty-state">
                No businesses have been created yet.
            </div>
        `;

        return;
    }

    businesses.forEach((business, index) => {
        const card =
            document.createElement("button");

        card.type = "button";

        card.className =
            "business-card";

        if (business.id === selectedBusinessId) {
            card.classList.add("selected");
        }

        card.dataset.businessId =
            business.id;

        const number =
            String(index + 1).padStart(2, "0");

        card.innerHTML = `
            <span class="business-number">
                ${number}
            </span>

            <span class="business-icon">
                ${escapeHtml(business.emoji || "🏢")}
            </span>

            <span class="business-details">

                <strong>
                    ${escapeHtml(business.name)}
                </strong>

                <small>
                    PROFILE ID // ${business.id}
                </small>

            </span>

            <span class="business-arrow">
                ›
            </span>
        `;

        card.addEventListener("click", () => {
            selectBusiness(business.id);
        });

        businessList.appendChild(card);
    });
}

function selectBusiness(businessId) {
    const business =
        businesses.find(
            (item) => item.id === businessId
        );

    if (!business) {
        return;
    }

    selectedBusinessId = business.id;

    businessIdInput.value =
        business.id;

    businessNameInput.value =
        business.name;

    businessEmojiInput.value =
        business.emoji || "🏢";

    businessPromptInput.value =
        business.prompt;

    editorTitle.textContent =
        business.name;

    editorMode.textContent =
        "EDIT";

    activeProfile.textContent =
        business.name.toUpperCase();

    saveBusinessButton.textContent =
        "Update Business";

    renderBusinesses();
}

function openCreateMode() {
    selectedBusinessId = null;

    businessForm.reset();

    businessIdInput.value = "";
    businessEmojiInput.value = "🏢";

    editorTitle.textContent =
        "Create New Business";

    editorMode.textContent =
        "NEW";

    activeProfile.textContent =
        "NEW PROFILE";

    saveBusinessButton.textContent =
        "Create Business";

    renderBusinesses();

    businessNameInput.focus();
}

function resetEditor() {
    selectedBusinessId = null;

    businessForm.reset();

    businessIdInput.value = "";
    businessEmojiInput.value = "";

    editorTitle.textContent =
        "Select a Business";

    editorMode.textContent =
        "VIEW";

    activeProfile.textContent =
        "NONE";

    saveBusinessButton.textContent =
        "Save Business";

    renderBusinesses();
}

businessForm.addEventListener(
    "submit",
    async (event) => {
        event.preventDefault();

        const businessId =
            businessIdInput.value;

        const payload = {
            name:
                businessNameInput.value.trim(),

            emoji:
                businessEmojiInput.value.trim() ||
                "🏢",

            prompt:
                businessPromptInput.value.trim()
        };

        if (!payload.name) {
            showMessage(
                "Business name is required.",
                "error"
            );

            return;
        }

        if (!payload.prompt) {
            showMessage(
                "AI brand instructions are required.",
                "error"
            );

            return;
        }

        const endpoint =
            businessId
                ? `/api/businesses/${businessId}`
                : "/api/businesses";

        const method =
            businessId
                ? "PUT"
                : "POST";

        setSavingState(true);

        try {
            const response =
                await fetch(endpoint, {
                    method,

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(payload)
                });

            const result =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    "Unable to save business."
                );
            }

            selectedBusinessId =
                result.id;

            showMessage(
                businessId
                    ? "Business updated successfully."
                    : "Business created successfully.",
                "success"
            );

            await loadBusinesses();
        } catch (error) {
            console.error(error);

            showMessage(
                error.message,
                "error"
            );
        } finally {
            setSavingState(false);
        }
    }
);

function setSavingState(isSaving) {
    saveBusinessButton.disabled =
        isSaving;

    businessNameInput.disabled =
        isSaving;

    businessEmojiInput.disabled =
        isSaving;

    businessPromptInput.disabled =
        isSaving;

    saveBusinessButton.textContent =
        isSaving
            ? "Saving..."
            : businessIdInput.value
                ? "Update Business"
                : "Create Business";
}

function showMessage(message, type) {
    messageBox.textContent = message;

    messageBox.className =
        `message-box ${type}`;

    window.setTimeout(() => {
        messageBox.className =
            "message-box hidden";
    }, 3500);
}

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

newBusinessButton.addEventListener(
    "click",
    openCreateMode
);

refreshBusinessesButton.addEventListener(
    "click",
    loadBusinesses
);

cancelEditButton.addEventListener(
    "click",
    resetEditor
);

loadBusinesses();