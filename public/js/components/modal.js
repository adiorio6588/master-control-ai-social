window.MasterModal = (() => {
    let overlay = null;
    let modalBody = null;
    let modalTitle = null;
    let modalFooter = null;

    function initialize() {
        const existingOverlay =
            document.getElementById(
                "mc-modal-overlay"
            );

        if (existingOverlay) {
            overlay = existingOverlay;

            modalTitle =
                document.getElementById(
                    "mc-modal-title"
                );

            modalBody =
                document.getElementById(
                    "mc-modal-body"
                );

            modalFooter =
                document.getElementById(
                    "mc-modal-footer"
                );

            return;
        }

        overlay =
            document.createElement("div");

        overlay.id =
            "mc-modal-overlay";

        overlay.className =
            "mc-modal-overlay";

        overlay.setAttribute(
            "aria-hidden",
            "true"
        );

        overlay.innerHTML = `
            <div
                class="mc-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="mc-modal-title"
            >
                <div class="mc-modal-header">

                    <h2
                        id="mc-modal-title"
                        class="mc-modal-title"
                    ></h2>

                    <button
                        id="mc-modal-close"
                        class="mc-modal-close"
                        type="button"
                        aria-label="Close modal"
                    >
                        ×
                    </button>

                </div>

                <div
                    id="mc-modal-body"
                    class="mc-modal-body"
                ></div>

                <div
                    id="mc-modal-footer"
                    class="mc-modal-footer"
                ></div>

            </div>
        `;

        document.body.appendChild(
            overlay
        );

        modalTitle =
            document.getElementById(
                "mc-modal-title"
            );

        modalBody =
            document.getElementById(
                "mc-modal-body"
            );

        modalFooter =
            document.getElementById(
                "mc-modal-footer"
            );

        const closeButton =
            document.getElementById(
                "mc-modal-close"
            );

        closeButton.addEventListener(
            "click",
            close
        );

        overlay.addEventListener(
            "click",
            (event) => {
                if (
                    event.target === overlay
                ) {
                    close();
                }
            }
        );

        document.addEventListener(
            "keydown",
            (event) => {
                if (
                    event.key === "Escape" &&
                    isOpen()
                ) {
                    close();
                }
            }
        );
    }

    function open({
        title = "",
        content = "",
        footer = "",
        onOpen = null
    } = {}) {
        initialize();

        modalTitle.textContent =
            String(title);

        clearElement(modalBody);
        clearElement(modalFooter);

        insertContent(
            modalBody,
            content
        );

        insertContent(
            modalFooter,
            footer
        );

        /*
         * Hide the footer when no content
         * was provided for it.
         */
        modalFooter.style.display =
            hasContent(footer)
                ? "flex"
                : "none";

        overlay.classList.add(
            "active"
        );

        overlay.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow =
            "hidden";

        if (
            typeof onOpen === "function"
        ) {
            onOpen({
                overlay,
                body: modalBody,
                footer: modalFooter
            });
        }
    }

    function close() {
        if (!overlay) {
            return;
        }

        overlay.classList.remove(
            "active"
        );

        overlay.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.style.overflow = "";
    }

    function isOpen() {
        return Boolean(
            overlay &&
            overlay.classList.contains(
                "active"
            )
        );
    }

    function getBody() {
        initialize();

        return modalBody;
    }

    function getFooter() {
        initialize();

        return modalFooter;
    }

    function setTitle(title = "") {
        initialize();

        modalTitle.textContent =
            String(title);
    }

    function setContent(content = "") {
        initialize();

        clearElement(modalBody);

        insertContent(
            modalBody,
            content
        );
    }

    function setFooter(footer = "") {
        initialize();

        clearElement(modalFooter);

        insertContent(
            modalFooter,
            footer
        );

        modalFooter.style.display =
            hasContent(footer)
                ? "flex"
                : "none";
    }

    function insertContent(
        target,
        content
    ) {
        if (
            content instanceof Node
        ) {
            target.appendChild(
                content
            );

            return;
        }

        if (
            Array.isArray(content)
        ) {
            content.forEach((item) => {
                insertContent(
                    target,
                    item
                );
            });

            return;
        }

        target.innerHTML =
            content === null ||
            content === undefined
                ? ""
                : String(content);
    }

    function clearElement(element) {
        while (element.firstChild) {
            element.removeChild(
                element.firstChild
            );
        }
    }

    function hasContent(content) {
        if (
            content instanceof Node
        ) {
            return true;
        }

        if (
            Array.isArray(content)
        ) {
            return content.length > 0;
        }

        return Boolean(
            String(
                content ?? ""
            ).trim()
        );
    }

    return {
        initialize,
        open,
        close,
        isOpen,
        getBody,
        getFooter,
        setTitle,
        setContent,
        setFooter
    };
})();