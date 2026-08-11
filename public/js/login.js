/*
====================================================
MASTER CONTROL
Login
====================================================
*/

const loginForm =
    document.getElementById(
        "login-form"
    );

const emailInput =
    document.getElementById(
        "login-email"
    );

const passwordInput =
    document.getElementById(
        "login-password"
    );

const loginButton =
    document.getElementById(
        "login-button"
    );

const loginMessage =
    document.getElementById(
        "login-message"
    );


/*
====================================================
CHECK EXISTING LOGIN
====================================================
*/

checkExistingLogin();


async function checkExistingLogin() {

    const token =
        localStorage.getItem(
            "masterControlToken"
        );


    if (!token) {
        return;
    }


    try {

        const response =
            await fetch(
                "/api/auth/me",
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );


        if (response.ok) {

            window.location.href =
                "/dashboard";

            return;
        }


        /*
         * Stored token is no longer valid.
         */

        localStorage.removeItem(
            "masterControlToken"
        );

        localStorage.removeItem(
            "masterControlUser"
        );

        localStorage.removeItem(
            "masterControlOrganization"
        );

    }
    catch (error) {

        console.error(
            "Existing login check failed:",
            error
        );

    }

}


/*
====================================================
LOGIN FORM
====================================================
*/

loginForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        const email =
            emailInput.value.trim();

        const password =
            passwordInput.value;


        if (
            !email ||
            !password
        ) {

            showMessage(
                "Please enter your email and password.",
                true
            );

            return;
        }


        setLoading(
            true
        );


        showMessage(
            "Signing in...",
            false
        );


        try {

            const response =
                await fetch(
                    "/api/auth/login",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                email,
                                password
                            })
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Unable to sign in."
                );

            }


            if (!data.token) {

                throw new Error(
                    "Authentication token was not returned."
                );

            }


            /*
            ====================================================
            SAVE LOGIN
            ====================================================
            */

            localStorage.setItem(
                "masterControlToken",
                data.token
            );


            localStorage.setItem(
                "masterControlUser",
                JSON.stringify(
                    data.user || {}
                )
            );


            localStorage.setItem(
                "masterControlOrganization",
                JSON.stringify(
                    data.organization || {}
                )
            );


            showMessage(
                "Login successful. Opening Master Control...",
                false
            );


            /*
            ====================================================
            OPEN DASHBOARD
            ====================================================
            */

            window.location.href =
                "/dashboard";

        }
        catch (error) {

            console.error(
                "Login error:",
                error
            );


            showMessage(
                error.message ||
                "Unable to sign in.",
                true
            );


            setLoading(
                false
            );

        }

    }
);


/*
====================================================
LOADING STATE
====================================================
*/

function setLoading(
    loading
) {

    loginButton.disabled =
        loading;


    emailInput.disabled =
        loading;


    passwordInput.disabled =
        loading;


    loginButton.textContent =
        loading
            ? "Signing In..."
            : "Sign In";

}


/*
====================================================
MESSAGE
====================================================
*/

function showMessage(
    message,
    isError
) {

    loginMessage.textContent =
        message;


    loginMessage.classList.toggle(
        "error",
        Boolean(
            isError
        )
    );

}