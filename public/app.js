// app.js
const generateButton = document.getElementById("generate");

generateButton.addEventListener("click", async () => {

    const comment = document.getElementById("comment").value;

    if (!comment.trim()) {
        alert("Please enter a comment.");
        return;
    }

    document.getElementById("reply").value = "Generating...";

    try {

        const response = await fetch("/api/reply", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                comment
            })
        });

        const data = await response.json();

        document.getElementById("reply").value = data.reply;

    } catch (error) {

        document.getElementById("reply").value =
            "Error connecting to the AI.";

    }

});