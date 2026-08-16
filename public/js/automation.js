const automationBusiness =
    document.getElementById(
        "automation-business"
    );

const automationPlatform =
    document.getElementById(
        "automation-platform"
    );

const autoGenerate =
    document.getElementById(
        "auto-generate"
    );

const requireApproval =
    document.getElementById(
        "require-approval"
    );

const autoRules =
    document.getElementById(
        "auto-rules"
    );

const autoPost =
    document.getElementById(
        "auto-post"
    );

const saveAutomationButton =
    document.getElementById(
        "save-automation"
    );


/*
====================================================
LOAD BUSINESSES
====================================================
*/

async function loadBusinesses() {

    try {

        const businesses =
            await MasterControlAPI.getBusinesses();


        automationBusiness.innerHTML = `
            <option value="">
                Select Business
            </option>
        `;


        businesses.forEach(
            (business) => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    business.id;


                option.textContent =
                    `${business.emoji || "🏢"} ${business.name}`;


                automationBusiness.appendChild(
                    option
                );

            }
        );

    }
    catch (error) {

        console.error(
            "Automation business load error:",
            error
        );


        alert(
            error.message
        );

    }

}


/*
====================================================
LOAD SETTINGS
====================================================
*/

async function loadAutomationSettings() {

    const businessId =
        Number(
            automationBusiness.value
        );


    const platform =
        automationPlatform.value ||
        "all";


    if (!businessId) {

        autoGenerate.checked =
            false;

        requireApproval.checked =
            true;

        autoRules.checked =
            false;

        autoPost.checked =
            false;

        return;

    }


    try {

        const settings =
            await MasterControlAPI
                .getAutomationSettings(
                    businessId,
                    platform
                );


        autoGenerate.checked =
            Boolean(
                settings.autoGenerate
            );


        requireApproval.checked =
            settings.requireApproval !==
            false;


        autoRules.checked =
            Boolean(
                settings.autoRules
            );


        autoPost.checked =
            Boolean(
                settings.autoPost
            );

    }
    catch (error) {

        console.error(
            "Automation settings load error:",
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

async function saveAutomationSettings() {

    const businessId =
        Number(
            automationBusiness.value
        );


    if (!businessId) {

        alert(
            "Select a business."
        );

        return;

    }


    const payload = {

        businessId,

        platform:
            automationPlatform.value ||
            "all",

        autoGenerate:
            autoGenerate.checked,

        requireApproval:
            requireApproval.checked,

        autoRules:
            autoRules.checked,

        autoPost:
            autoPost.checked

    };


    saveAutomationButton.disabled =
        true;


    saveAutomationButton.textContent =
        "Saving...";


    try {

        await MasterControlAPI
            .saveAutomationSettings(
                payload
            );


        saveAutomationButton.textContent =
            "Saved";


        setTimeout(
            () => {

                saveAutomationButton.textContent =
                    "Save Automation Settings";

            },
            1200
        );

    }
    catch (error) {

        console.error(
            "Automation settings save error:",
            error
        );


        alert(
            error.message
        );


        saveAutomationButton.textContent =
            "Save Automation Settings";

    }
    finally {

        saveAutomationButton.disabled =
            false;

    }

}


/*
====================================================
EVENTS
====================================================
*/

automationBusiness.addEventListener(
    "change",
    loadAutomationSettings
);


automationPlatform.addEventListener(
    "change",
    loadAutomationSettings
);


saveAutomationButton.addEventListener(
    "click",
    saveAutomationSettings
);


/*
====================================================
START
====================================================
*/

loadBusinesses();