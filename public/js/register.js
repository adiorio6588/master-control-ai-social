/*
====================================================
MASTER CONTROL
Account Registration
====================================================
*/

const registerForm =
    document.getElementById(
        "register-form"
    );

const registerName =
    document.getElementById(
        "register-name"
    );

const registerEmail =
    document.getElementById(
        "register-email"
    );

const registerOrganization =
    document.getElementById(
        "register-organization"
    );

const registerPassword =
    document.getElementById(
        "register-password"
    );

const registerButton =
    document.getElementById(
        "register-button"
    );

const registerMessage =
    document.getElementById(
        "register-message"
    );


/*
====================================================
REGISTER
====================================================
*/

registerForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        clearMessage();

        const displayName =
            registerName.value.trim();

        const email =
            registerEmail.value.trim();

        const organizationName =
            registerOrganization.value.trim();

        const password =
            registerPassword.value;


        /*
        ============================================
        BASIC VALIDATION
        ============================================
        */

        if (
            !displayName ||
            !email ||
            !organizationName ||
            !password
        ) {

            showError(
                "Please complete all fields."
            );

            return;
        }


        if (
            password.length < 8
        ) {

            showError(
                "Password must be at least 8 characters."
            );

            return;
        }


        /*
        ============================================
        SUBMIT
        ============================================
        */

        setLoading(true);

        try {

            const response =
                await fetch(
                    "/api/auth/register",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                displayName,
                                email,
                                organizationName,
                                password
                            })
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Unable to create account."
                );

            }


            /*
            ========================================
            SAVE AUTH SESSION
            ========================================
            */

            localStorage.setItem(
                "masterControlToken",
                data.token
            );


            localStorage.setItem(
                "masterControlUser",
                JSON.stringify(
                    data.user
                )
            );


            localStorage.setItem(
                "masterControlOrganization",
                JSON.stringify(
                    data.organization
                )
            );


            /*
            ========================================
            SUCCESS
            ========================================
            */

            registerMessage.textContent =
                "Account created. Opening Master Control...";


            registerMessage.classList.remove(
                "error"
            );


            window.location.href =
                "/dashboard";

        }
        catch (error) {

            console.error(
                "Registration error:",
                error
            );


            showError(
                error.message ||
                "Unable to create account."
            );

        }
        finally {

            setLoading(false);

        }

    }
);


/*
====================================================
HELPERS
====================================================
*/

function setLoading(
    loading
) {

    registerButton.disabled =
        loading;


    registerButton.textContent =
        loading
            ? "Creating Account..."
            : "Create Account";

}


function showError(
    message
) {

    registerMessage.textContent =
        message;


    registerMessage.classList.add(
        "error"
    );

}


function clearMessage() {

    registerMessage.textContent =
        "";


    registerMessage.classList.remove(
        "error"
    );

}