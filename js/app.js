document.addEventListener("DOMContentLoaded", function () {

    const API_URL =
        "https://jjce2az1hl.execute-api.eu-north-1.amazonaws.com/items";

    const reportForm = document.getElementById("report-form");
    const reportType = document.getElementById("type");
    const reportTitle = document.getElementById("report-title");
    const formMessage = document.getElementById("form-message");

    // Only run report-page code if we are on report.html
    if (reportForm && reportType) {

        // Read ?type=lost or ?type=found from the URL
        const params = new URLSearchParams(window.location.search);
        const typeFromUrl = params.get("type");

        if (typeFromUrl === "lost") {
            reportType.value = "lost";

            if (reportTitle) {
                reportTitle.textContent = "Report a Lost Item";
            }
        }

        if (typeFromUrl === "found") {
            reportType.value = "found";

            if (reportTitle) {
                reportTitle.textContent = "Report a Found Item";
            }
        }

        // Change heading if the user manually changes report type
        reportType.addEventListener("change", function () {

            if (reportType.value === "lost") {
                reportTitle.textContent = "Report a Lost Item";
            } else if (reportType.value === "found") {
                reportTitle.textContent = "Report a Found Item";
            } else {
                reportTitle.textContent = "Report an Item";
            }
        });

        // Send report to AWS when the form is submitted
        reportForm.addEventListener("submit", async function (event) {

            event.preventDefault();

            const itemName =
                document.getElementById("item-name").value;

            const category =
                document.getElementById("category").value;

            const description =
                document.getElementById("description").value;

            const location =
                document.getElementById("location").value;

            const date =
                document.getElementById("date").value;

            const reportData = {
                type: reportType.value,
                itemName: itemName,
                category: category,
                description: description,
                location: location,
                date: date,
                status: "OPEN"
            };

            console.log("CloudLost Report:", reportData);

            if (formMessage) {
                formMessage.textContent = "Submitting report...";
            }

            try {

                const response = await fetch(API_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(reportData)
                });

                if (!response.ok) {
                    throw new Error("Unable to submit report");
                }

                const result = await response.json();

                console.log("AWS Response:", result);

                if (formMessage) {
                    formMessage.textContent =
                        "Item reported successfully!";
                }

            } catch (error) {

                console.error(
                    "Error submitting report:",
                    error
                );

                if (formMessage) {
                    formMessage.textContent =
                        "Unable to submit report. Please try again.";
                }
            }
        });
    }
});