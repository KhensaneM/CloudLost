document.addEventListener("DOMContentLoaded", function () {

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


        // Handle form submission
        reportForm.addEventListener("submit", function (event) {

            // Prevent normal HTML form submission
            event.preventDefault();

            const itemName = document.getElementById("item-name").value;
            const category = document.getElementById("category").value;
            const description = document.getElementById("description").value;
            const location = document.getElementById("location").value;
            const date = document.getElementById("date").value;

            const reportData = {
                type: reportType.value,
                itemName: itemName,
                category: category,
                description: description,
                location: location,
                date: date,
                status: "OPEN"
            };

            // For now, display the data in the browser console.
            // Later this will be sent to AWS API Gateway.
            console.log("CloudLost Report:", reportData);

            if (formMessage) {
                formMessage.textContent =
                    "Report ready! AWS connection will be added next.";
            }

            // Do not clear the form yet.
            // This makes testing easier while developing.
        });
    }

});