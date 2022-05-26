// React libs
import React from "react"
import ReactDOM from "react-dom"
import "./css/index.css"
import App from "./App"

// Import static components
import c from "./service-workers/components/compatibility"
import error from "./utils/error"
import * as Workers from "./service-workers/manager"
import configure from "./configure"

// Debug utilities
import "./utils/debug"

// Page close listener
window.addEventListener("beforeunload", (e) => {
    if (!window.internal.ui.saved) {
        // Not saved yet!
        const confirmationMessage = "Jotain on vielä tallentamatta\nÄlä sulje vielä sivua!";
        (e || window.event).returnValue = confirmationMessage
        return confirmationMessage
    }
    return null
});

// Main
(async () => {
    try {
        // Check browser compatibility
        if (c()) {
            console.log("Browser compatibility checks passed!")
            // Declare globals & Handle low-level setup (upgrades etc.)
            await configure()

            // --- This is where the actual application code execution begins ---
            // Handle workers
            Workers.default()

            // Render
            ReactDOM.render(<React.StrictMode>
                <App></App>
            </React.StrictMode>,
            document.getElementById("root"))
        } else {
            console.log("Incompatible browser!")
            ReactDOM.render(<React.StrictMode>
                <p>Incompatible browser!</p>
            </React.StrictMode>,
            document.getElementById("root"))
        }
    } catch (err) {
        error("Index", err)
    }
})()
