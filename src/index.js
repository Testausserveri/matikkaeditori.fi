// React libs
import React from "react"
import ReactDOM from "react-dom"
import "./css/index.css"
import App from "./App"

// Import static components
import * as c from "./js/worker-components/compatibility.js"
import error from "./js/error.js"
import * as Workers from "./js/workers.js"
// eslint-disable-next-line no-unused-vars
import * as uuid from "./js/worker-components/uuid.js" // This is used globally, not here though

// Global handler
function G(){
    // Declare globals
    // eslint-disable-next-line no-unused-vars
    window.internal = {
        workers: {
            list: {},
            components: [
                // List of files loadable by workers in src/js/worker-components
                "compress.js",
                "export.js",
                "google-drive.js",
                "hash.js",
                "onedrive.js",
                "uuid.js"
            ],
            handlers: {},
            shared: {}
        },
        ui: {},
        console: {
            list: [
                // These values will be put behind a wrapper for log collection
                "log",
                "error",
                "info",
                "trace",
                "warn"
            ],
            cache: {},
            logs: []
        },
        time_at_live: new Date().getTime(), // Time since code first started to run
        bundle: null
    }
    // Public libs
    window.public = {
        uuid: uuid,
        Workers: Workers
    }
    // User ID
    let id = localStorage.getItem("id")
    if(id == null){
        id = uuid.v4()
    }
    localStorage.setItem("id", id)
    window.id = id // This is used to salt all filesystem verity hashes. When cloud saves are implemented, this needs to be exported in to the cloud save location.
    // Run the console component here
    C()
}

/**
 * Console wrapper to collect logs to an internal variable.
 * By: @Esinko (11.02.2021)
 */
function C(){
    // Get the values from the internal memory
    let cache = window.internal.console
    let functions = Object.keys(cache)
    for(let i = 0; i < functions.length; i++){
        let f = functions[i]
        window.internal.console.cache[f] = console[f] // Cache the real function
        console[f] = (...args) => {
            // Apply colors
            alert(args[0])
            if(args[0].startsWith("[") && args[0].includes("]")){
                args.push("color: limegreen;")
                args[0] = "%c" + args[0]
                let at0 = args.split("]")[0] + "]"
                let at1 = args.split("]")[1]
                args[0] = at0
                args.splice(1, 0, at1)
            }
            // Execute the actual function from cache
            window.internal.console.cache[f](...args)
            // Write the data to the cache
            // TODO: Parse css (style) code from the args?
            window.internal.console.logs.push("[ " + (new Date().getTime() - window.internal.time_at_live) + "s - " + f.toUpperCase() + " ]", ...args)
        }
    }
}

try {
    // Render
    ReactDOM.render(
        <React.StrictMode>
            <App></App>
        </React.StrictMode>,
        document.getElementById("root")
    )

    // Declare globals
    G()

    // Check browser compatibility
    if(c.c()){
        console.log("Browser compatibility checks passed!")
        // --- This is where the actual application code begins ---
        // Handle workers
        Workers.default();
        (async () => {
            // UI is now visible
            // Load FS
            let load_fs = async () => {
                if(localStorage.getItem("fs_type") == null){
                    // No FS present
                    console.log("[ Filesystem ] No previous save found.")
                    localStorage.setItem("fs_type", "0")
                    Workers.api("filesystem", "set", {name: "id", value: window.id})
                    Workers.api("filesystem", "init", 0).then(() => {
                        // TODO: UI stuff, such as render
                    }).catch((e) => {
                        error(e)
                    })
                }else {
                    // Load FS that's present
                    console.log("[ Filesystem ] Previous save found.")
                    Workers.api("filesystem", "init", parseInt(localStorage.getItem("fs_type")))
                }
            }
            // Trigger load_fs when the Filesystem worker is ready
            let e = setInterval(async () => {
                if(window.fs_ready == true){
                    clearInterval(e)
                    load_fs()
                }
            }, 50)
        })()
    }else {
        console.log("Incompatible browser!")
        ReactDOM.render(
            <React.StrictMode>
                <p>Incompatible browser!</p>
            </React.StrictMode>,
            document.getElementById("root")
        )
    }
}
catch(err){
    error("Index", err)
}