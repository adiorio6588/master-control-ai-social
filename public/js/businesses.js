/*
====================================================
MASTER CONTROL
Business Manager
====================================================
*/

const businessList =
    document.getElementById(
        "business-list"
    );

const businessFormTemplate =
    document.getElementById(
        "business-form-template"
    );

const businessForm =
    document.getElementById(
        "business-form"
    );

const businessIdInput =
    document.getElementById(
        "business-id"
    );

const businessNameInput =
    document.getElementById(
        "business-name"
    );

const businessEmojiInput =
    document.getElementById(
        "business-emoji"
    );

const businessPromptInput =
    document.getElementById(
        "business-prompt"
    );

const formStatus =
    document.getElementById(
        "business-form-status"
    );

const addBusinessButton =
    document.getElementById(
        "add-business"
    );

const cancelBusinessButton =
    document.getElementById(
        "cancel-business"
    );

const refreshBusinessesButton =
    document.getElementById(
        "refresh-businesses"
    );

const saveBusinessButton =
    document.getElementById(
        "save-business"
    );

let businesses = [];

let socialAccounts = [];


/*
====================================================
Supported Social Platforms
====================================================
*/

const socialPlatforms = [
    {
        key: "facebook",
        label: "Facebook",
        icon: "f"
    },

    {
        key: "instagram",
        label: "Instagram",
        icon: "◎"
    },

    {
        key: "youtube",
        label: "YouTube",
        icon: "▶"
    },

    {
        key: "tiktok",
        label: "TikTok",
        icon: "♪"
    }
];


/*
====================================================
Validate Required Elements
====================================================
*/

function validatePageElements() {

    const requiredElements = [

        [
            "business-list",
            businessList
        ],

        [
            "business-form-template",
            businessFormTemplate
        ],

        [
            "business-form",
            businessForm
        ],

        [
            "business-id",
            businessIdInput
        ],

        [
            "business-name",
            businessNameInput
        ],

        [
            "business-emoji",
            businessEmojiInput
        ],

        [
            "business-prompt",
            businessPromptInput
        ],

        [
            "business-form-status",
            formStatus
        ],

        [
            "add-business",
            addBusinessButton
        ],

        [
            "cancel-business",
            cancelBusinessButton
        ],

        [
            "refresh-businesses",
            refreshBusinessesButton
        ],

        [
            "save-business",
            saveBusinessButton
        ]

    ];


    const missingElements =
        requiredElements
            .filter(
                ([, element]) =>
                    !element
            )
            .map(
                ([id]) => id
            );


    if (
        missingElements.length
    ) {

        console.error(
            "Business Manager is missing HTML elements:",
            missingElements
        );

        return false;

    }


    if (
        !window.MasterControlAPI
    ) {

        console.error(
            "MasterControlAPI is not available."
        );

        return false;

    }


    if (
        !window.MasterModal
    ) {

        console.error(
            "MasterModal is not available."
        );

        return false;

    }


    return true;

}


/*
====================================================
Load Businesses + Social Accounts
====================================================
*/

async function loadBusinesses() {

    renderLoading();

    setRefreshState(
        true
    );


    try {

        const [
            businessResult,
            socialAccountResult
        ] =
            await Promise.all([
                MasterControlAPI
                    .getBusinesses(),

                MasterControlAPI
                    .getSocialAccounts()
            ]);


        businesses =
            Array.isArray(
                businessResult
            )
                ? businessResult
                : [];


        socialAccounts =
            Array.isArray(
                socialAccountResult
            )
                ? socialAccountResult
                : [];


        renderBusinesses();

    }
    catch (error) {

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

    }
    finally {

        setRefreshState(
            false
        );

    }

}


/*
====================================================
Loading State
====================================================
*/

function renderLoading() {

    businessList.innerHTML = `

        <div class="mc-empty">

            Loading businesses...

        </div>

    `;

}


/*
====================================================
Render Business Cards
====================================================
*/

function renderBusinesses() {

    businessList.innerHTML =
        "";


    if (
        !businesses.length
    ) {

        businessList.innerHTML = `

            <div class="mc-empty">

                No businesses have been added.

            </div>

        `;

        return;

    }


    businesses.forEach(
        (business) => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "business-profile-card";


            const businessAccounts =
                getBusinessSocialAccounts(
                    business.id
                );


            card.innerHTML = `

                <div
                    class="business-card-header"
                >

                    <div
                        class="business-card-identity"
                    >

                        <div
                            class="business-card-emoji"
                        >

                            ${escapeHtml(
                                business.emoji ||
                                "🏢"
                            )}

                        </div>


                        <div>

                            <span
                                class="business-card-id"
                            >
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


                    <span
                        class="mc-badge approved"
                    >
                        Active
                    </span>

                </div>


                <div
                    class="business-card-section"
                >

                    <span
                        class="business-card-label"
                    >
                        AI Personality
                    </span>


                    <p
                        class="business-card-prompt"
                    >

                        ${escapeHtml(
                            getPromptPreview(
                                business.prompt
                            )
                        )}

                    </p>

                </div>


                <div
                    class="business-card-section business-social-section"
                >

                    <span
                        class="business-card-label"
                    >
                        Connected Platforms
                    </span>


                    <div
                        class="business-social-grid"
                    >

                        ${renderSocialPlatforms(
                            businessAccounts
                        )}

                    </div>

                </div>


                <div
                    class="business-card-actions"
                >

                    <button
                        class="mc-button edit-business"
                        type="button"
                        data-id="${Number(
                            business.id
                        )}"
                    >
                        Edit
                    </button>


                    <button
                        class="mc-button danger delete-business"
                        type="button"
                        data-id="${Number(
                            business.id
                        )}"
                    >
                        Delete
                    </button>

                </div>

            `;


            businessList.appendChild(
                card
            );

        }
    );


    attachBusinessCardEvents();

}


/*
====================================================
Render Social Platforms
====================================================
*/

function renderSocialPlatforms(
    accounts
) {

    return socialPlatforms
        .map(
            (platform) => {

                const account =
                    accounts.find(
                        (item) =>
                            item.platform ===
                            platform.key
                    );


                const connected =
                    Boolean(
                        Number(
                            account?.connected
                        )
                    );


                const accountName =
                    account?.account_name
                        ? escapeHtml(
                            account.account_name
                        )
                        : "";


                return `

                    <div
                        class="business-social-row"
                    >

                        <div
                            class="business-social-platform"
                        >

                            <span
                                class="business-social-icon"
                            >
                                ${platform.icon}
                            </span>


                            <div>

                                <strong>
                                    ${platform.label}
                                </strong>

                                ${
                                    accountName
                                        ? `
                                            <small>
                                                ${accountName}
                                            </small>
                                        `
                                        : ""
                                }

                            </div>

                        </div>


                        <div class="business-social-controls">

                        <span
                            class="
                                business-social-status
                                ${
                                    connected
                                        ? "connected"
                                        : "not-connected"
                                }
                            "
                        >
                            ${
                                connected
                                    ? "Connected"
                                    : "Not Connected"
                            }
                        </span>
                    
                        <button
                            class="mc-button social-account-button"
                            type="button"
                            data-account-id="${account?.id || ""}"
                            data-business-id="${account?.business_id || ""}"
                            data-platform="${platform.key}"
                        >
                            ${
                                connected
                                    ? "Manage"
                                    : "Connect"
                            }
                        </button>
                    
                    </div>

                    </div>

                `;

            }
        )
        .join("");

}


/*
====================================================
Get Social Accounts for Business
====================================================
*/

function getBusinessSocialAccounts(
    businessId
) {

    return socialAccounts.filter(
        (account) =>
            Number(
                account.business_id
            ) ===
            Number(
                businessId
            )
    );

}


/*
====================================================
Card Events
====================================================
*/

function attachBusinessCardEvents() {

    document
        .querySelectorAll(
            ".edit-business"
        )
        .forEach(
            (button) => {

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

            }
        );


    document
        .querySelectorAll(
            ".delete-business"
        )
        .forEach(
            (button) => {

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

            }
        );

        document
    .querySelectorAll(
        ".social-account-button"
    )
    .forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    openSocialAccountModal({
                        accountId:
                            Number(
                                button.dataset.accountId
                            ),

                        businessId:
                            Number(
                                button.dataset.businessId
                            ),

                        platform:
                            button.dataset.platform
                    });

                }
            );

        }
    );

}

/*
====================================================
Open Social Account Modal
====================================================
*/

function openSocialAccountModal({
    accountId,
    businessId,
    platform
}) {

    const business =
        businesses.find(
            (item) =>
                Number(item.id) ===
                Number(businessId)
        );

    if (!business) {

        console.error(
            "Business not found:",
            businessId
        );

        return;
    }


    const platformNames = {
        facebook: "Facebook",
        instagram: "Instagram",
        youtube: "YouTube",
        tiktok: "TikTok"
    };


    const platformName =
        platformNames[platform] ||
        platform;


    const content =
        document.createElement("div");


    content.className =
        "social-connect-modal";


    content.innerHTML = `

        <div class="social-connect-heading">

            <span class="system-label">
                SOCIAL ACCOUNT CONNECTION
            </span>

            <h3>
                ${escapeHtml(platformName)}
            </h3>

            <p>
                Connect
                <strong>
                    ${escapeHtml(business.name)}
                </strong>
                to ${escapeHtml(platformName)}.
            </p>

        </div>


        <div class="social-connect-info">

            <div>
                <span>BUSINESS</span>

                <strong>
                    ${escapeHtml(business.name)}
                </strong>
            </div>

            <div>
                <span>PLATFORM</span>

                <strong>
                    ${escapeHtml(platformName)}
                </strong>
            </div>

            <div>
                <span>STATUS</span>

                <strong class="connection-offline">
                    NOT CONNECTED
                </strong>
            </div>

        </div>


        <p class="social-connect-message">

            Master Control is ready to connect this
            account. Platform authorization will be
            configured in the next step.

        </p>

    `;


    const footer =
        document.createElement("div");


    footer.className =
        "social-connect-actions";


    const cancelButton =
        document.createElement("button");


    cancelButton.type =
        "button";

    cancelButton.className =
        "mc-button";

    cancelButton.textContent =
        "Cancel";


    const continueButton =
        document.createElement("button");


    continueButton.type =
        "button";

    continueButton.className =
        "mc-button primary";

    continueButton.textContent =
        `Connect ${platformName}`;


    cancelButton.addEventListener(
        "click",
        () => {

            MasterModal.close();

        }
    );


    continueButton.addEventListener(
        "click",
        () => {

            console.log(
                "SOCIAL CONNECTION REQUEST",
                {
                    accountId,
                    businessId,
                    platform
                }
            );

            /*
             * OAuth connection will be added here.
             */

        }
    );


    footer.appendChild(
        cancelButton
    );


    footer.appendChild(
        continueButton
    );


    MasterModal.open({

        title:
            `Connect ${platformName}`,

        content,

        footer

    });

}


/*
====================================================
Open Business Modal
====================================================
*/

function openBusinessModal(
    title
) {

    businessFormTemplate.style.display =
        "block";


    MasterModal.open({

        title,

        content:
            businessFormTemplate,

        onOpen: () => {

            window.setTimeout(
                () => {

                    businessNameInput
                        .focus();

                },
                50
            );

        }

    });

}


/*
====================================================
Add Business
====================================================
*/

function openAddBusinessModal() {

    resetBusinessForm();

    openBusinessModal(
        "Add Business"
    );

}


/*
====================================================
Edit Business
====================================================
*/

function editBusiness(id) {

    const business =
        businesses.find(
            (item) =>
                Number(item.id) ===
                Number(id)
        );


    if (
        !business
    ) {

        return;

    }


    resetBusinessForm();


    businessIdInput.value =
        business.id;


    businessNameInput.value =
        business.name || "";


    businessEmojiInput.value =
        business.emoji || "";


    businessPromptInput.value =
        business.prompt || "";


    formStatus.textContent =
        `EDITING PROFILE // ${business.name}`;


    openBusinessModal(
        `Edit ${business.name}`
    );

}


/*
====================================================
Reset Form
====================================================
*/

function resetBusinessForm() {

    businessForm.reset();


    businessIdInput.value =
        "";


    formStatus.textContent =
        "";


    setFormState(
        false
    );

}


/*
====================================================
Close Business Modal
====================================================
*/

function closeBusinessModal() {

    MasterModal.close();


    window.setTimeout(
        () => {

            resetBusinessForm();

        },
        150
    );

}


/*
====================================================
Save Business
====================================================
*/

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


        /*
        ================================================
        Validation
        ================================================
        */

        if (
            !payload.name
        ) {

            formStatus.textContent =
                "SYSTEM ERROR // BUSINESS NAME REQUIRED";


            businessNameInput
                .focus();


            return;

        }


        if (
            !payload.prompt
        ) {

            formStatus.textContent =
                "SYSTEM ERROR // AI PROMPT REQUIRED";


            businessPromptInput
                .focus();


            return;

        }


        /*
        ================================================
        Saving State
        ================================================
        */

        setFormState(
            true
        );


        formStatus.textContent =
            businessId
                ? "UPDATING BUSINESS PROFILE..."
                : "CREATING BUSINESS PROFILE...";


        try {

            /*
            ============================================
            Update Existing Business
            ============================================
            */

            if (
                businessId
            ) {

                await MasterControlAPI
                    .updateBusiness(
                        businessId,
                        payload
                    );

            }


            /*
            ============================================
            Create New Business
            ============================================
            */

            else {

                await MasterControlAPI
                    .createBusiness(
                        payload
                    );

            }


            formStatus.textContent =
                "BUSINESS PROFILE SAVED";


            /*
             * Reloading also retrieves the social
             * accounts for the business cards.
             */

            await loadBusinesses();


            window.setTimeout(
                () => {

                    closeBusinessModal();

                },
                500
            );

        }
        catch (error) {

            console.error(
                "Business save error:",
                error
            );


            formStatus.textContent =
                `SYSTEM ERROR // ${
                    error.message ||
                    "UNABLE TO SAVE BUSINESS"
                }`;

        }
        finally {

            setFormState(
                false
            );

        }

    }
);


/*
====================================================
Delete Business
====================================================
*/

async function deleteBusiness(id) {

    const business =
        businesses.find(
            (item) =>
                Number(item.id) ===
                Number(id)
        );


    if (
        !business
    ) {

        return;

    }


    const confirmContent =
        document.createElement(
            "div"
        );


    confirmContent.innerHTML = `

        <div
            class="mc-delete-confirmation"
        >

            <p>

                Are you sure you want to delete

                <strong>

                    ${escapeHtml(
                        business.name
                    )}

                </strong>?

            </p>


            <p
                class="mc-muted"
            >

                This action cannot be undone.

            </p>

        </div>

    `;


    const footer =
        document.createElement(
            "div"
        );


    footer.className =
        "mc-delete-actions";


    /*
    ====================================================
    Cancel Button
    ====================================================
    */

    const cancelButton =
        document.createElement(
            "button"
        );


    cancelButton.type =
        "button";


    cancelButton.className =
        "mc-button";


    cancelButton.textContent =
        "Cancel";


    /*
    ====================================================
    Delete Button
    ====================================================
    */

    const deleteButton =
        document.createElement(
            "button"
        );


    deleteButton.type =
        "button";


    deleteButton.className =
        "mc-button danger";


    deleteButton.textContent =
        "Delete Business";


    /*
    ====================================================
    Cancel Delete
    ====================================================
    */

    cancelButton.addEventListener(
        "click",
        () => {

            MasterModal.close();

        }
    );


    /*
    ====================================================
    Confirm Delete
    ====================================================
    */

    deleteButton.addEventListener(
        "click",
        async () => {

            deleteButton.disabled =
                true;


            deleteButton.textContent =
                "Deleting...";


            try {

                await MasterControlAPI
                    .deleteBusiness(
                        id
                    );


                MasterModal.close();


                /*
                 * Reload businesses and social
                 * accounts after deletion.
                 */

                await loadBusinesses();

            }
            catch (error) {

                console.error(
                    "Business deletion error:",
                    error
                );


                deleteButton.disabled =
                    false;


                deleteButton.textContent =
                    "Delete Business";


                window.alert(
                    error.message ||
                    "Unable to delete business."
                );

            }

        }
    );


    footer.appendChild(
        cancelButton
    );


    footer.appendChild(
        deleteButton
    );


    MasterModal.open({

        title:
            "Delete Business",

        content:
            confirmContent,

        footer

    });

}


/*
====================================================
Button Events
====================================================
*/

addBusinessButton.addEventListener(
    "click",
    openAddBusinessModal
);


cancelBusinessButton.addEventListener(
    "click",
    closeBusinessModal
);


refreshBusinessesButton.addEventListener(
    "click",
    loadBusinesses
);


/*
====================================================
Refresh Button State
====================================================
*/

function setRefreshState(
    isLoading
) {

    refreshBusinessesButton.disabled =
        isLoading;


    refreshBusinessesButton.textContent =
        isLoading
            ? "Loading..."
            : "Refresh";

}


/*
====================================================
Save Button State
====================================================
*/

function setFormState(
    isSaving
) {

    saveBusinessButton.disabled =
        isSaving;


    saveBusinessButton.textContent =
        isSaving
            ? "Saving..."
            : "Save Business";

}


/*
====================================================
Prompt Preview
====================================================
*/

function getPromptPreview(
    prompt = ""
) {

    const cleaned =
        String(
            prompt
        )
            .replace(
                /\s+/g,
                " "
            )
            .trim();


    if (
        !cleaned
    ) {

        return "No AI personality prompt has been added.";

    }


    if (
        cleaned.length <= 180
    ) {

        return cleaned;

    }


    return `${cleaned.slice(
        0,
        177
    )}...`;

}


/*
====================================================
Escape HTML
====================================================
*/

function escapeHtml(
    value = ""
) {

    return String(
        value
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


/*
====================================================
Start Business Manager
====================================================
*/

if (
    validatePageElements()
) {

    loadBusinesses();

}