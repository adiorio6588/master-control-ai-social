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
SUPPORTED SOCIAL PLATFORMS
====================================================
*/

const socialPlatforms = [

    {
        key:
            "facebook",

        label:
            "Facebook",

        icon:
            "f"
    },

    {
        key:
            "instagram",

        label:
            "Instagram",

        icon:
            "◎"
    },

    {
        key:
            "youtube",

        label:
            "YouTube",

        icon:
            "▶"
    },

    {
        key:
            "tiktok",

        label:
            "TikTok",

        icon:
            "♪"
    }

];


/*
====================================================
VALIDATE REQUIRED ELEMENTS
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
                ([id]) =>
                    id
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
LOAD BUSINESSES + SOCIAL ACCOUNTS
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
LOADING STATE
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
RENDER BUSINESS CARDS
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
RENDER SOCIAL PLATFORMS
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


                        <div
                            class="business-social-controls"
                        >

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

                                data-account-id="${
                                    account?.id ||
                                    ""
                                }"

                                data-business-id="${
                                    account?.business_id ||
                                    ""
                                }"

                                data-platform="${
                                    platform.key
                                }"
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
GET SOCIAL ACCOUNTS FOR BUSINESS
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
CARD EVENTS
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
                                    button.dataset
                                        .accountId
                                ),

                            businessId:
                                Number(
                                    button.dataset
                                        .businessId
                                ),

                            platform:
                                button.dataset
                                    .platform

                        });

                    }
                );

            }
        );

}


/*
====================================================
OPEN SOCIAL ACCOUNT MODAL
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


    const account =
        socialAccounts.find(
            (item) =>
                Number(
                    item.id
                ) ===
                Number(
                    accountId
                )
        );


    const connected =
        Boolean(
            Number(
                account?.connected
            )
        );


    const platformNames = {

        facebook:
            "Facebook",

        instagram:
            "Instagram",

        youtube:
            "YouTube",

        tiktok:
            "TikTok"

    };


    const platformName =
        platformNames[
            platform
        ] ||
        platform;


    const content =
        document.createElement(
            "div"
        );


    content.className =
        "social-connect-modal";


    content.innerHTML = `

        <div
            class="social-connect-heading"
        >

            <span
                class="system-label"
            >
                SOCIAL ACCOUNT CONNECTION
            </span>

            <h3>
                ${escapeHtml(
                    platformName
                )}
            </h3>

            <p>
                ${
                    connected
                        ? "Manage"
                        : "Connect"
                }

                <strong>
                    ${escapeHtml(
                        business.name
                    )}
                </strong>

                on

                ${escapeHtml(
                    platformName
                )}.
            </p>

        </div>


        <div
            class="social-connect-info"
        >

            <div>

                <span>
                    BUSINESS
                </span>

                <strong>
                    ${escapeHtml(
                        business.name
                    )}
                </strong>

            </div>


            <div>

                <span>
                    PLATFORM
                </span>

                <strong>
                    ${escapeHtml(
                        platformName
                    )}
                </strong>

            </div>


            <div>

                <span>
                    STATUS
                </span>

                <strong
                    class="${
                        connected
                            ? "connection-online"
                            : "connection-offline"
                    }"
                >
                    ${
                        connected
                            ? "CONNECTED"
                            : "NOT CONNECTED"
                    }
                </strong>

            </div>

        </div>


        ${
            connected &&
            account?.account_name
                ? `
                    <div
                        class="social-connect-info"
                    >

                        <div>

                            <span>
                                ACCOUNT
                            </span>

                            <strong>
                                ${escapeHtml(
                                    account
                                        .account_name
                                )}
                            </strong>

                        </div>

                    </div>
                `
                : ""
        }


        <p
            class="social-connect-message"
        >

            ${
                connected
                    ? "This social account is already connected to Master Control."
                    : "Master Control is ready to connect this account."
            }

        </p>

    `;


    const footer =
        document.createElement(
            "div"
        );


    footer.className =
        "social-connect-actions";


    const cancelButton =
        document.createElement(
            "button"
        );


    cancelButton.type =
        "button";


    cancelButton.className =
        "mc-button";


    cancelButton.textContent =
        "Close";


    cancelButton.addEventListener(
        "click",
        () => {

            MasterModal.close();

        }
    );


    footer.appendChild(
        cancelButton
    );


    /*
    ====================================================
    CONNECT BUTTON
    ====================================================
    */

    if (!connected) {

        const continueButton =
            document.createElement(
                "button"
            );


        continueButton.type =
            "button";


        continueButton.className =
            "mc-button primary";


        continueButton.textContent =
            `Connect ${platformName}`;


        continueButton.addEventListener(
            "click",
            async () => {

                if (
                    platform !==
                        "facebook"
                    &&
                    platform !==
                        "instagram"
                ) {

                    window.alert(
                        `${platformName} connection is not available yet.`
                    );

                    return;

                }


                continueButton.disabled =
                    true;


                continueButton.textContent =
                    "Connecting...";


                try {

                    const response =
                        await MasterControlAPI
                            .startMetaConnection(
                                businessId,
                                platform
                            );


                    if (
                        !response ||
                        !response
                            .authorizationUrl
                    ) {

                        throw new Error(
                            "Meta authorization URL was not returned."
                        );

                    }


                    sessionStorage
                        .setItem(
                            "masterControlMetaConnection",
                            JSON.stringify({
                                accountId,
                                businessId,
                                platform
                            })
                        );


                    window.location.href =
                        response
                            .authorizationUrl;

                }
                catch (error) {

                    console.error(
                        "Meta connection error:",
                        error
                    );


                    continueButton.disabled =
                        false;


                    continueButton.textContent =
                        `Connect ${platformName}`;


                    window.alert(
                        error.message ||
                        "Unable to start the Meta connection."
                    );

                }

            }
        );


        footer.appendChild(
            continueButton
        );

    }


    MasterModal.open({

        title:
            `${connected ? "Manage" : "Connect"} ${platformName}`,

        content,

        footer

    });

}


/*
====================================================
HANDLE META OAUTH RETURN
====================================================
*/

async function handleMetaReturn() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const metaStatus =
        params.get(
            "meta"
        );


    if (
        metaStatus !==
        "connected"
    ) {

        return;

    }


    const businessId =
        Number(
            params.get(
                "businessId"
            )
        );


    const platform =
        String(
            params.get(
                "platform"
            ) ||
            "facebook"
        )
            .trim()
            .toLowerCase();


    if (
        !Number.isInteger(
            businessId
        )
        ||
        businessId <= 0
    ) {

        console.error(
            "Meta return missing business ID."
        );

        return;

    }


    /*
    ====================================================
    FACEBOOK PAGE ASSIGNMENT
    ====================================================
    */

    if (
        platform ===
        "facebook"
    ) {

        await openMetaPageAssignment(
            businessId
        );

        return;

    }


    /*
    ====================================================
    INSTAGRAM
    ====================================================
    */

   if (
        platform ===
        "instagram"
    ) {

        await openMetaInstagramAssignment(
            businessId
        );

        return;

    }

}


/*
====================================================
OPEN META PAGE ASSIGNMENT
====================================================
*/

async function openMetaPageAssignment(
    businessId
) {

    const business =
        businesses.find(
            (item) =>
                Number(
                    item.id
                ) ===
                Number(
                    businessId
                )
        );


    if (!business) {

        window.alert(
            "The business could not be found."
        );

        cleanMetaUrl();

        return;

    }


    const content =
        document.createElement(
            "div"
        );


    content.className =
        "social-connect-modal";


    content.innerHTML = `

        <div
            class="social-connect-heading"
        >

            <span
                class="system-label"
            >
                META CONNECTION
            </span>

            <h3>
                Select Facebook Page
            </h3>

            <p>
                Loading Facebook Pages for

                <strong>
                    ${escapeHtml(
                        business.name
                    )}
                </strong>.
            </p>

        </div>


        <div
            class="mc-empty"
        >
            Loading Meta assets...
        </div>

    `;


    MasterModal.open({

        title:
            "Facebook Page",

        content

    });


    try {

        const result =
            await MasterControlAPI
                .getMetaAssets();


        const pages =
            Array.isArray(
                result.pages
            )
                ? result.pages
                : [];


        if (
            !pages.length
        ) {

            content.innerHTML = `

                <div
                    class="social-connect-heading"
                >

                    <span
                        class="system-label"
                    >
                        META CONNECTION
                    </span>

                    <h3>
                        No Pages Found
                    </h3>

                    <p>
                        Meta connected successfully,
                        but no Facebook Pages were returned.
                    </p>

                </div>

            `;

            return;

        }


        renderMetaPageSelector({

            business,

            pages,

            content

        });

    }
    catch (error) {

        console.error(
            "Meta asset loading error:",
            error
        );


        content.innerHTML = `

            <div
                class="social-connect-heading"
            >

                <span
                    class="system-label"
                >
                    META CONNECTION ERROR
                </span>

                <h3>
                    Unable to Load Pages
                </h3>

                <p>
                    ${escapeHtml(
                        error.message ||
                        "Unable to load Meta Pages."
                    )}
                </p>

            </div>

        `;

    }

}

async function openMetaInstagramAssignment(
    businessId
) {

    const business =
        businesses.find(
            (item) =>
                Number(
                    item.id
                ) ===
                Number(
                    businessId
                )
        );


    if (!business) {

        window.alert(
            "The business could not be found."
        );

        cleanMetaUrl();

        return;

    }


    try {

        const result =
            await MasterControlAPI
                .getMetaAssets();


        const pages =
            Array.isArray(
                result.pages
            )
                ? result.pages
                : [];


        const instagramAccounts =
            pages
                .filter(
                    (page) =>
                        page.instagram
                        &&
                        page.instagram.id
                )
                .map(
                    (page) => ({
                        id:
                            page.instagram.id,

                        username:
                            page.instagram.username ||
                            "",

                        pageName:
                            page.name ||
                            ""
                    })
                );


        if (!instagramAccounts.length) {

            window.alert(
                "Meta connected successfully, but no Instagram professional account was found."
            );

            cleanMetaUrl();

            return;

        }


        const instagram =
            instagramAccounts[0];


        await MasterControlAPI
            .assignMetaInstagram(
                business.id,
                instagram.id,
                instagram.username
            );


        sessionStorage
            .removeItem(
                "masterControlMetaConnection"
            );


        await loadBusinesses();


        cleanMetaUrl();

    }
    catch (error) {

        console.error(
            "Instagram assignment error:",
            error
        );


        window.alert(
            error.message ||
            "Unable to connect Instagram account."
        );

    }

}

/*
====================================================
RENDER META PAGE SELECTOR
====================================================
*/

function renderMetaPageSelector({
    business,
    pages,
    content
}) {

    content.innerHTML = `

        <div
            class="social-connect-heading"
        >

            <span
                class="system-label"
            >
                META CONNECTION
            </span>

            <h3>
                Select Facebook Page
            </h3>

            <p>
                Choose the Facebook Page that belongs to

                <strong>
                    ${escapeHtml(
                        business.name
                    )}
                </strong>.
            </p>

        </div>


        <div
            class="social-connect-info"
        >

            <div>

                <span>
                    BUSINESS
                </span>

                <strong>
                    ${escapeHtml(
                        business.name
                    )}
                </strong>

            </div>

        </div>


        <label
            for="meta-page-select"
        >
            Facebook Page
        </label>


        <select
            id="meta-page-select"
            class="control-input"
        >

            <option value="">
                Select Facebook Page
            </option>

            ${pages
                .map(
                    (page) => `

                        <option
                            value="${escapeHtml(
                                page.id
                            )}"
                            data-page-name="${escapeHtml(
                                page.name
                            )}"
                        >
                            ${escapeHtml(
                                page.name
                            )}
                        </option>

                    `
                )
                .join("")
            }

        </select>


        <p
            id="meta-page-status"
            class="reply-status"
        ></p>


        <div
            class="social-connect-actions"
            style="margin-top:20px;"
        >

            <button
                id="cancel-meta-page"
                type="button"
                class="mc-button"
            >
                Cancel
            </button>


            <button
                id="save-meta-page"
                type="button"
                class="mc-button primary"
            >
                Connect Page
            </button>

        </div>

    `;


    const select =
        document.getElementById(
            "meta-page-select"
        );


    const saveButton =
        document.getElementById(
            "save-meta-page"
        );


    const cancelButton =
        document.getElementById(
            "cancel-meta-page"
        );


    const status =
        document.getElementById(
            "meta-page-status"
        );


    cancelButton.addEventListener(
        "click",
        () => {

            MasterModal.close();

            cleanMetaUrl();

        }
    );


    saveButton.addEventListener(
        "click",
        async () => {

            const pageId =
                select.value;


            if (!pageId) {

                status.textContent =
                    "SELECT A FACEBOOK PAGE";

                return;

            }


            const selectedOption =
                select.options[
                    select.selectedIndex
                ];


            const pageName =
                selectedOption
                    .dataset
                    .pageName ||
                selectedOption
                    .textContent
                    .trim();


            saveButton.disabled =
                true;


            saveButton.textContent =
                "Connecting...";


            status.textContent =
                "ASSIGNING FACEBOOK PAGE...";


            try {

                /*
                ============================================
                SAVE PAGE TO BUSINESS
                ============================================
                */

                await MasterControlAPI
                    .assignMetaPage(
                        business.id,
                        pageId,
                        pageName
                    );


                status.textContent =
                    "SUBSCRIBING PAGE TO WEBHOOK...";


                /*
                ============================================
                SUBSCRIBE PAGE TO META WEBHOOK
                ============================================
                */

                await MasterControlAPI
                    .subscribeMetaPage(
                        business.id,
                        pageId
                    );


                status.textContent =
                    "FACEBOOK PAGE CONNECTED";


                sessionStorage
                    .removeItem(
                        "masterControlMetaConnection"
                    );


                await loadBusinesses();


                window.setTimeout(
                    () => {

                        MasterModal.close();

                        cleanMetaUrl();

                    },
                    800
                );

            }
            catch (error) {

                console.error(
                    "Meta Page connection error:",
                    error
                );


                status.textContent =
                    `SYSTEM ERROR // ${
                        error.message ||
                        "UNABLE TO CONNECT PAGE"
                    }`;


                saveButton.disabled =
                    false;


                saveButton.textContent =
                    "Connect Page";

            }

        }
    );

}


/*
====================================================
CLEAN META RETURN URL
====================================================
*/

function cleanMetaUrl() {

    window.history
        .replaceState(
            {},
            document.title,
            "/businesses"
        );

}


/*
====================================================
OPEN BUSINESS MODAL
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
ADD BUSINESS
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
EDIT BUSINESS
====================================================
*/

function editBusiness(
    id
) {

    const business =
        businesses.find(
            (item) =>
                Number(
                    item.id
                ) ===
                Number(
                    id
                )
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
        business.name ||
        "";


    businessEmojiInput.value =
        business.emoji ||
        "";


    businessPromptInput.value =
        business.prompt ||
        "";


    formStatus.textContent =
        `EDITING PROFILE // ${business.name}`;


    openBusinessModal(
        `Edit ${business.name}`
    );

}


/*
====================================================
RESET FORM
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
CLOSE BUSINESS MODAL
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
SAVE BUSINESS
====================================================
*/

businessForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        const businessId =
            Number(
                businessIdInput.value
            ) ||
            null;


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


        setFormState(
            true
        );


        formStatus.textContent =
            businessId
                ? "UPDATING BUSINESS PROFILE..."
                : "CREATING BUSINESS PROFILE...";


        try {

            if (
                businessId
            ) {

                await MasterControlAPI
                    .updateBusiness(
                        businessId,
                        payload
                    );

            }
            else {

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
DELETE BUSINESS
====================================================
*/

async function deleteBusiness(
    id
) {

    const business =
        businesses.find(
            (item) =>
                Number(
                    item.id
                ) ===
                Number(
                    id
                )
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


    cancelButton.addEventListener(
        "click",
        () => {

            MasterModal.close();

        }
    );


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
BUTTON EVENTS
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
REFRESH BUTTON STATE
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
SAVE BUTTON STATE
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
PROMPT PREVIEW
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

        return (
            "No AI personality prompt has been added."
        );

    }


    if (
        cleaned.length <=
        180
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
ESCAPE HTML
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
START BUSINESS MANAGER
====================================================
*/

async function startBusinessManager() {

    if (
        !validatePageElements()
    ) {

        return;

    }


    await loadBusinesses();


    await handleMetaReturn();

}


startBusinessManager();