// Configure runtime environment globals
// This runs pre-react render

import * as uuid from "./service-workers/components/uuid"
import upgrade from "./upgrade"
import * as Workers from "./service-workers/manager"
import consoleComponent, { consoleConfig } from "./utils/console"

export default () => new Promise((resolve) => {
    // Declare globals
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
        timeAtLive: new Date().getTime(), // Time since code first started to run
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
                window.internal.versionHash = res.split(": ").pop()
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
                console.log(`--- Upgraded to ${window.internal.version} ---`)
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
        consoleComponent(window)
        resolve(window)
    }
})
