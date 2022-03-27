// React libs
import React from "react"
import ReactDOM from "react-dom"
import "./css/index.css"
import App from "./App"

// Import static components
import c from "./js/worker-components/compatibility"
import error from "./js/error"
import upgrade from "./js/upgrade"
import * as Workers from "./js/workers"
// eslint-disable-next-line no-unused-vars
import * as uuid from "./js/worker-components/uuid" // This is used globally, not here though
import consoleComponent, { consoleConfig } from "./js/console"

// Global handler
async function declareGlobals() {
    return new Promise((resolve) => {
        // Declare globals
        // eslint-disable-next-line no-unused-vars
        window.internal = {
            workers: {
                list: {},
                handlers: {},
                shared: {},
                api: Workers.api
            },
            console: consoleConfig(),
            ui: {
                activeFilesystemInstance: null,
                activeLocation: null,
                editor: null,
                saved: false
            },
            time_at_live: new Date().getTime(), // Time since code first started to run
            /**
             * --------------------------------------------------
             * Very important version field!
             * CHANGE TO HANDLE BREAKING CHANGES VIA "upgrade.js"
             * --------------------------------------------------
             */
            version: "beta",
            versionHash: ""
        }

        // Promise for UI to wait before doing anything
        window.internal.workers.essentials = new Promise((resolveEssential) => {
            window.internal.workers.essentialsResolve = resolveEssential
        })

        // Fetch version hash
        fetch("/VERSION")
            .then((res) => res.text())
            .then((res) => {
                if (res.startsWith("VERSION: ")) {
                    [window.internal.versionHash] = res.split(": ").shift()
                } else {
                    window.internal.versionHash = "Development version"
                }
            }).catch((e) => {
                window.internal.versionHash = "Unknown"
                console.error("Failed to get version number", e)
            })

        // User ID
        let id = localStorage.getItem("id")
        if (id == null) {
            id = uuid.v4()
        }
        localStorage.setItem("id", id)
        window.id = id // This is used to salt all filesystem verity hashes. When cloud saves are implemented, this needs to be exported in to the cloud save location.

        // Handle version upgrades
        const currentVersion = localStorage.getItem("version")
        if (currentVersion !== null) {
            if (currentVersion !== window.internal.version) {
                if (typeof upgrade[currentVersion] !== "function") {
                    // eslint-disable-next-line no-alert
                    alert(`Upgrading to "${window.internal.version}" from "${currentVersion}" is not possible at this time.`)
                    window.location.reload()
                }
                upgrade[currentVersion]().then(() => {
                    console.log(`Upgraded to ${window.internal.version}`)
                    // Run the console component here
                    consoleComponent(window)
                    resolve()
                }).catch((e) => {
                    console.error(`[ Index ] Failed to upgrade: ${e.stack}`)
                })
            } else {
                console.log(`No upgrades to be done. (${currentVersion})`)
                consoleComponent(window)
                resolve()
            }
        } else if (localStorage.length > 1) {
            // Version is null
            console.error("[ Index ] Version is null!")
            // eslint-disable-next-line no-restricted-globals, no-alert
            if (confirm("Application version is unknown. Would you like to reset it?")) {
                localStorage.setItem("version", window.internal.version)
                consoleComponent(window)
                resolve()
            }
        } else {
            localStorage.setItem("version", window.internal.version)
            consoleComponent()
            resolve(window)
        }
    })
}

// Debug stuff
/* eslint-disable no-unused-vars */
window.reset = async () => {
    // This deletes everything
    localStorage.clear()
    sessionStorage.clear()
    document.cookie = ""
    if (typeof window.indexedDB.databases === "function") {
        // Chromium
        window.indexedDB.databases().then((r) => {
            // eslint-disable-next-line no-plusplus
            for (let i = 0; i < r.length; i++) window.indexedDB.deleteDatabase(r[i].name)
        }).then(() => {
            window.location.reload()
        })
    } else {
        // Everything else
        // eslint-disable-next-line no-alert
        alert("Please clear indexDB manually.")
    }
}

// Implement embedded worker api
window.api = async (
    worker, type, message
) => {
    const req = await window.internal.workers.api(
        worker, type, message
    )
    console.log("Response:", req)
}

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
            await declareGlobals()

            // --- This is where the actual application code begins ---
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
