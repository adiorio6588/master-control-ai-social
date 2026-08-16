const crypto =
    require("crypto");


/*
====================================================
MASTER CONTROL
Token Encryption
====================================================

Uses AES-256-GCM.

Encrypted values are stored as:

iv.authTag.ciphertext

All values are hex encoded.
====================================================
*/

function getEncryptionKey() {

    const keyHex =
        process.env
            .SOCIAL_TOKEN_ENCRYPTION_KEY;


    if (!keyHex) {

        throw new Error(
            "SOCIAL_TOKEN_ENCRYPTION_KEY is not configured."
        );

    }


    if (
        !/^[a-fA-F0-9]{64}$/.test(
            keyHex
        )
    ) {

        throw new Error(
            "SOCIAL_TOKEN_ENCRYPTION_KEY must be a 64-character hex string."
        );

    }


    return Buffer.from(
        keyHex,
        "hex"
    );

}


/*
====================================================
ENCRYPT
====================================================
*/

function encryptToken(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "";

    }


    const key =
        getEncryptionKey();


    const iv =
        crypto.randomBytes(
            12
        );


    const cipher =
        crypto.createCipheriv(
            "aes-256-gcm",
            key,
            iv
        );


    const encrypted =
        Buffer.concat([
            cipher.update(
                String(value),
                "utf8"
            ),

            cipher.final()
        ]);


    const authTag =
        cipher.getAuthTag();


    return [
        iv.toString("hex"),
        authTag.toString("hex"),
        encrypted.toString("hex")
    ].join(".");

}


/*
====================================================
DECRYPT
====================================================
*/

function decryptToken(
    encryptedValue
) {

    if (
        !encryptedValue
    ) {

        return "";

    }


    const parts =
        String(
            encryptedValue
        ).split(".");


    if (
        parts.length !== 3
    ) {

        throw new Error(
            "Encrypted token format is invalid."
        );

    }


    const [
        ivHex,
        authTagHex,
        ciphertextHex
    ] = parts;


    const key =
        getEncryptionKey();


    const iv =
        Buffer.from(
            ivHex,
            "hex"
        );


    const authTag =
        Buffer.from(
            authTagHex,
            "hex"
        );


    const ciphertext =
        Buffer.from(
            ciphertextHex,
            "hex"
        );


    const decipher =
        crypto.createDecipheriv(
            "aes-256-gcm",
            key,
            iv
        );


    decipher.setAuthTag(
        authTag
    );


    const decrypted =
        Buffer.concat([
            decipher.update(
                ciphertext
            ),

            decipher.final()
        ]);


    return decrypted.toString(
        "utf8"
    );

}


/*
====================================================
EXPORT
====================================================
*/

module.exports = {

    encryptToken,

    decryptToken

};