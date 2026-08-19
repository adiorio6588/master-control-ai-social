const settingsUser =
    document.getElementById(
        "settings-user"
    );

const settingsOrganization =
    document.getElementById(
        "settings-organization"
    );

const socialAccountsContainer =
    document.getElementById(
        "settings-social-accounts"
    );

const compactInbox =
    document.getElementById(
        "compact-inbox"
    );

const confirmDelete =
    document.getElementById(
        "confirm-delete"
    );

const showApiMetrics =
    document.getElementById(
        "show-api-metrics"
    );

const saveSettingsButton =
    document.getElementById(
        "save-settings"
    );


/*
====================================================
LOAD ACCOUNT INFO
====================================================
*/

function loadAccountInfo() {

    const userRaw =
        localStorage.getItem(
            "masterControlUser"
        );

    const organizationRaw =
        localStorage.getItem(
            "masterControlOrganization"
        );


    let user = null;
    let organization = null;


    try {

        user =
            userRaw
                ? JSON.parse(userRaw)
                : null;

    }
    catch {

        user = null;

    }


    try {

        organization =
            organizationRaw
                ? JSON.parse(
                    organizationRaw
                )
                : null;

    }
    catch {

        organization = null;

    }


    settingsUser.textContent =
        user?.display_name ||
        user?.email ||
        "Signed In";


    settingsOrganization.textContent =
        organization?.name ||
        "Master Control";

}


/*
====================================================
LOAD SYSTEM PREFERENCES
====================================================
*/

function loadSystemPreferences() {

    compactInbox.checked =
        localStorage.getItem(
            "masterControlCompactInbox"
        ) === "true";


    confirmDelete.checked =
        localStorage.getItem(
            "masterControlConfirmDelete"
        ) !== "false";


    showApiMetrics.checked =
        localStorage.getItem(
            "masterControlShowApiMetrics"
        ) !== "false";

}


/*
====================================================
LOAD SOCIAL ACCOUNTS
====================================================
*/

async function loadSocialAccounts() {

    try {

        const accounts =
            await MasterControlAPI
                .getSocialAccounts();


        if (!accounts.length) {

            socialAccountsContainer.innerHTML = `
                <div class="settings-empty">
                    No social accounts found.
                </div>
            `;

            return;

        }


        socialAccountsContainer.innerHTML =
            accounts
                .map(
                    (account) => {

                        const connected =
                            Number(
                                account.connected
                            ) === 1;


                        return `
                            <article class="settings-social-item">

                                <div class="settings-social-info">

                                    <strong>
                                        ${escapeHtml(
                                            account.business_emoji ||
                                            "🏢"
                                        )}
                                        ${escapeHtml(
                                            account.business_name ||
                                            "Business"
                                        )}
                                    </strong>

                                    <small>
                                        ${escapeHtml(
                                            formatPlatform(
                                                account.platform
                                            )
                                        )}
                                    </small>

                                    ${
                                        account.account_name
                                            ? `
                                                <p class="social-account-name">
                                                    ${escapeHtml(
                                                        account.account_name
                                                    )}
                                                </p>
                                            `
                                            : ""
                                    }

                                </div>


                                <div class="settings-social-actions">

                                    <span
                                        class="connection-status ${
                                            connected
                                                ? "connected"
                                                : ""
                                        }"
                                    >
                                        ${
                                            connected
                                                ? "Connected"
                                                : "Not Connected"
                                        }
                                    </span>


                                    ${
                                        connected
                                            ? `
                                                <button
                                                    type="button"
                                                    class="social-control-button disconnect"
                                                    data-account-id="${account.id}"
                                                >
                                                    Disconnect
                                                </button>
                                            `
                                            : `
                                                <button
                                                    type="button"
                                                    class="social-control-button connect"
                                                    data-account-id="${account.id}"
                                                >
                                                    Connect
                                                </button>
                                            `
                                    }

                                </div>

                            </article>
                        `;

                    }
                )
                .join("");


        attachSocialAccountEvents();

    }
    catch (error) {

        console.error(
            "Settings social account error:",
            error
        );


        socialAccountsContainer.innerHTML = `
            <div class="settings-empty">
                Unable to load social accounts.
            </div>
        `;

    }

}


/*
====================================================
SOCIAL ACCOUNT EVENTS
====================================================
*/

function attachSocialAccountEvents() {

    const connectButtons =
        document.querySelectorAll(
            ".social-control-button.connect"
        );


    const disconnectButtons =
        document.querySelectorAll(
            ".social-control-button.disconnect"
        );


    connectButtons.forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    const accountId =
                        Number(
                            button.dataset.accountId
                        );


                    connectSocialAccount(
                        accountId
                    );

                }
            );

        }
    );


    disconnectButtons.forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    const accountId =
                        Number(
                            button.dataset.accountId
                        );


                    disconnectSocialAccount(
                        accountId
                    );

                }
            );

        }
    );

}


/*
====================================================
CONNECT SOCIAL ACCOUNT
====================================================
*/

async function connectSocialAccount(
    accountId
) {

    if (!accountId) {
        return;
    }


    try {

        const account =
            await MasterControlAPI
                .getSocialAccount(
                    accountId
                );


        const platform =
            String(
                account.platform || ""
            )
                .trim()
                .toLowerCase();


        /*
        ================================================
        META: FACEBOOK / INSTAGRAM
        ================================================
        */

        if (
            platform === "facebook" ||
            platform === "instagram"
        ) {

            const result =
                await MasterControlAPI
                    .startMetaConnection(
                        account.business_id,
                        platform
                    );


            if (
                !result.authorizationUrl
            ) {

                throw new Error(
                    "Meta connection URL was not returned."
                );

            }


            window.location.href =
                result.authorizationUrl;


            return;

        }


        /*
        ================================================
        OTHER PLATFORMS
        ================================================
        */

        alert(
            `${formatPlatform(
                platform
            )} connection is not available yet.`
        );

    }
    catch (error) {

        console.error(
            "Connect social account error:",
            error
        );


        alert(
            error.message
        );

    }

}


/*
====================================================
DISCONNECT SOCIAL ACCOUNT
====================================================
*/

async function disconnectSocialAccount(
    accountId
) {

    if (!accountId) {
        return;
    }


    const confirmed =
        window.confirm(
            "Disconnect this social account?"
        );


    if (!confirmed) {
        return;
    }


    try {

        await MasterControlAPI
            .updateSocialAccount(
                accountId,
                {
                    connected:
                        false
                }
            );


        await loadSocialAccounts();

    }
    catch (error) {

        console.error(
            "Disconnect social account error:",
            error
        );


        alert(
            error.message
        );

    }

}


/*
====================================================
SAVE SETTINGS
====================================================
*/

function saveSettings() {

    localStorage.setItem(
        "masterControlCompactInbox",
        String(
            compactInbox.checked
        )
    );


    localStorage.setItem(
        "masterControlConfirmDelete",
        String(
            confirmDelete.checked
        )
    );


    localStorage.setItem(
        "masterControlShowApiMetrics",
        String(
            showApiMetrics.checked
        )
    );


    saveSettingsButton.textContent =
        "Saved";


    setTimeout(
        () => {

            saveSettingsButton.textContent =
                "Save Settings";

        },
        1200
    );

}


/*
====================================================
HELPERS
====================================================
*/

function formatPlatform(
    platform = ""
) {

    const value =
        String(platform)
            .trim()
            .toLowerCase();


    return (
        value.charAt(0).toUpperCase() +
        value.slice(1)
    );

}


function escapeHtml(
    value = ""
) {

    return String(value)
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
EVENTS
====================================================
*/

saveSettingsButton.addEventListener(
    "click",
    saveSettings
);


/*
====================================================
START
====================================================
*/

loadAccountInfo();

loadSystemPreferences();

loadSocialAccounts();