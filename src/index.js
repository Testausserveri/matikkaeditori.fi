// React libs
import React from "react"
import ReactDOM from "react-dom"
import "./css/index.css"
import App from "./App"

// Import static components
import * as c from "./js/worker-components/compatibility.js"
import error from "./js/error.js"
import upgrade from "./js/upgrade.js"
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
            handlers: {},
            shared: {},
            api: Workers.api
        },
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
            logs: [],
            color: {
                "warn": "yellow",
                "error": "red",
                "log": "limegreen",
                "default": "limegreen"
            }
        },
        time_at_live: new Date().getTime(), // Time since code first started to run
        /**
         * --------------------------------------------------
         * Very important version field!
         * CHANGE TO HANDLE BREAKING CHANGES VIA "upgrade.js"
         * --------------------------------------------------
         */
        version: "beta"
    }

    // Promise for UI to wait before doing anything
    window.internal.workers.essentials = new Promise((resolve) => {
        window.internal.workers.essentialsResolve = resolve
    })

    // User ID
    let id = localStorage.getItem("id")
    if(id == null){
        id = uuid.v4()
    }
    localStorage.setItem("id", id)
    window.id = id // This is used to salt all filesystem verity hashes. When cloud saves are implemented, this needs to be exported in to the cloud save location.

    // Handle version upgrades
    const current_version = localStorage.getItem("version")
    if(current_version !== null){
        if(current_version !== window.internal.version){
            upgrade[current_version]().then(() => {
                console.log("Upgraded to " + window.internal.version)
                // Run the console component here
                C()
                return
            }).catch(e => {
                error("Index", "Failed to upgrade: " + e.stack)
            }) 
        }else {
            console.log("No upgrades to be done.")
            C()
            return
        }
    }else {
        // Version is null
        if(localStorage.length > 1){
            error("Index", "Version is null!")
        }else {
            localStorage.setItem("version", window.internal.version)
            C()
            return
        }
    }
}

/**
 * Console wrapper to collect logs to an internal variable.
 * By: @Esinko (11.02.2021)
 */
function C(){
    // Redefine all the functions
    for(let func of window.internal.console.list){
        window.internal.console.cache[func] = console[func]
        const color = window.internal.console.color // I feel lazy
        console[func] = (...args) => {
            // Apply colors
            if(args[0] != undefined && typeof args[0].startsWith == "function" && args[0].startsWith("[") && args[0].includes("]")){
                let args0 = args[0].split("]")[0] + "]"
                args[0] = args[0].split("]")[1]
                args0 = "%c" + args0
                if(args[0] != ""){
                    args[0] = args[0].trimLeft()
                    args.splice(0,0,"")
                }
                //window.internal.console.cache[func](args, args.length)
                window.internal.console.cache[func](args0+"%s", "color: " + color[func] ?? color.default + ";", ...args)
            }else {
                // Execute the actual function from cache
                let args0 = "%c[ ❓ ] " // Unknown or prefix not specified
                window.internal.console.cache[func](args0, "color: " + color[func] ?? color.default + ";", ...args)
            }
            // Write the data to the cache
            // TODO: Parse css (style) code from the args?
            window.internal.console.logs.push("[ " + (new Date().getTime() - window.internal.time_at_live) + "s - " + func.toUpperCase() + " ]", ...args)
        }
    }
}

// Debug stuff
/* eslint-disable no-unused-vars */
window.reset = async function () {
    // This deletes everything
    localStorage.clear()
    sessionStorage.clear()
    let cookies = document.cookie
    for (let i = 0; i < cookies.split(";").length; ++i){
        let myCookie = cookies[i]
        let pos = myCookie.indexOf("=")
        let name = pos > -1 ? myCookie.substr(0, pos) : myCookie
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }
    window.indexedDB.databases().then((r) => {
        for (var i = 0; i < r.length; i++) window.indexedDB.deleteDatabase(r[i].name)
    }).then(() => {
        window.location.reload()
    })
}
/* eslint-enable no-unused-vars */

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
        Workers.default()

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