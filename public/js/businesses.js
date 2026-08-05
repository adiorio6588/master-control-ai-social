const businessList = document.getElementById("business-list");
const businessForm = document.getElementById("business-form");

const businessIdInput = document.getElementById("business-id");
const businessNameInput = document.getElementById("business-name");
const businessEmojiInput = document.getElementById("business-emoji");
const businessPromptInput = document.getElementById("business-prompt");

const formTitle = document.getElementById("business-form-title");
const formStatus = document.getElementById("business-form-status");

const addBusinessButton = document.getElementById("add-business");
const cancelBusinessButton =
    document.getElementById("cancel-business");
const refreshBusinessesButton =
    document.getElementById("refresh-businesses");

let businesses = [];

async function loadBusinesses() {
    businessList.innerHTML = `
        <div class="history-empty">
            Loading businesses...
        </div>
    `;

    try {
        const response = await fetch("/api/businesses");

        if (!response.ok) {
            throw new Error("Unable to load businesses.");
        }

        businesses = await response.json();

        renderBusinesses();
    } catch (error) {
        console.error("Business loading error:", error);

        businessList.innerHTML = `
            <div class="history-empty history-error">
                Unable to load businesses.
            </div>
        `;
    }
}

function renderBusinesses() {
    businessList.innerHTML = "";

    if (!businesses.length) {
        businessList.innerHTML = `
            <div class="history-empty">
                No businesses have been added.
            </div>
        `;

        return;
    }

    businesses.forEach((business) => {
        const item = document.createElement("article");

        item.className = "business-manager-item";

        item.innerHTML = `
            <div class="business-manager-info">

                <span class="business-manager-emoji">
                    ${escapeHtml(business.emoji || "🏢")}
                </span>

                <div>
                    <strong>
                        ${escapeHtml(business.name)}
                    </strong>

                    <small>
                        Business ID // ${business.id}
                    </small>
                </div>

            </div>

            <div class="business-manager-actions">

                <button
                    class="control-button edit-business"
                    type="button"
                    data-id="${business.id}"
                >
                    Edit
                </button>

                <button
                    class="control-button danger-button delete-business"
                    type="button"
                    data-id="${business.id}"
                >
                    Delete
                </button>

            </div>
        `;

        businessList.appendChild(item);
    });

    document
        .querySelectorAll(".edit-business")
        .forEach((button) => {
            button.addEventListener("click", () => {
                editBusiness(Number(button.dataset.id));
            });
        });

    document
        .querySelectorAll(".delete-business")
        .forEach((button) => {
            button.addEventListener("click", () => {
                deleteBusiness(Number(button.dataset.id));
            });
        });
}

function editBusiness(id) {
    const business = businesses.find((item) => item.id === id);

    if (!business) {
        return;
    }

    businessIdInput.value = business.id;
    businessNameInput.value = business.name;
    businessEmojiInput.value = business.emoji || "";
    businessPromptInput.value = business.prompt || "";

    formTitle.textContent = "Edit Business";
    formStatus.textContent =
        `EDITING PROFILE // ${business.name}`;

    businessNameInput.focus();
}

function resetBusinessForm() {
    businessForm.reset();

    businessIdInput.value = "";
    formTitle.textContent = "Add Business";
    formStatus.textContent = "";
}

businessForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = businessIdInput.value;

    const payload = {
        name: businessNameInput.value.trim(),
        emoji: businessEmojiInput.value.trim(),
        prompt: businessPromptInput.value.trim()
    };

    if (!payload.name || !payload.prompt) {
        formStatus.textContent =
            "SYSTEM ERROR // NAME AND PROMPT REQUIRED";

        return;
    }

    const endpoint = id
        ? `/api/businesses/${id}`
        : "/api/businesses";

    const method = id ? "PUT" : "POST";

    formStatus.textContent = "SAVING BUSINESS PROFILE...";

    try {
        const response = await fetch(endpoint, {
            method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Unable to save business."
            );
        }

        formStatus.textContent = "BUSINESS PROFILE SAVED";

        await loadBusinesses();

        window.setTimeout(() => {
            resetBusinessForm();
        }, 700);
    } catch (error) {
        console.error("Business save error:", error);

        formStatus.textContent =
            `SYSTEM ERROR // ${error.message}`;
    }
});

async function deleteBusiness(id) {
    const business = businesses.find((item) => item.id === id);

    if (!business) {
        return;
    }

    const confirmed = window.confirm(
        `Delete ${business.name}? This cannot be undone.`
    );

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`/api/businesses/${id}`, {
            method: "DELETE"
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Unable to delete business."
            );
        }

        resetBusinessForm();
        await loadBusinesses();
    } catch (error) {
        console.error("Business deletion error:", error);

        window.alert(error.message);
    }
}

addBusinessButton.addEventListener("click", () => {
    resetBusinessForm();
    businessNameInput.focus();
});

cancelBusinessButton.addEventListener("click", () => {
    resetBusinessForm();
});

refreshBusinessesButton.addEventListener("click", async () => {
    refreshBusinessesButton.disabled = true;
    refreshBusinessesButton.textContent = "Loading...";

    await loadBusinesses();

    refreshBusinessesButton.disabled = false;
    refreshBusinessesButton.textContent = "Refresh";
});

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

loadBusinesses();