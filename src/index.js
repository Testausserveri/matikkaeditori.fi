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
            shared: {},
            api: Workers.api
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
    //let e = console.log
    //console["log"] = (s) => {
    //    e(s, "e")
    //} 
    // Redefine all the functions
    for(let func of window.internal.console.list){
        window.internal.console.cache[func] = console[func]
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
                window.internal.console.cache[func](args0+"%s", "color: limegreen;", ...args)
            }else {
                // Execute the actual function from cache
                window.internal.console.cache[func](...args)
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
        Workers.default();
        (async () => {
            // UI is now visible
            // Load FS
            let load_fs = async () => {
                if(localStorage.getItem("fs_type") == null){
                    // No FS present
                    console.log("[ Filesystem ] No previous save found. Creating one...")
                    localStorage.setItem("fs_type", "0")
                    await Workers.api("filesystem", "set", {name: "id", value: window.id})
                    Workers.api("filesystem", "init", "0").then(async id => {
                        // TODO: UI stuff, such as render
                        Workers.api("filesystem", "index", id).then(index => {
                            console.log(index)
                        })
                    }).catch((e) => {
                        error(e)
                    })
                }else {
                    // Load FS that's present
                    console.log("[ Filesystem ] Previous save found. Loading it...")
                    await Workers.api("filesystem", "set", {name: "id", value: window.id})
                    await Workers.api("filesystem", "init", localStorage.getItem("fs_type")).then(async id => {
                        // TODO: UI stuff, such as render
                        Workers.api("filesystem", "index", id).then(index => {
                            console.log(index)
                        })
                    }).catch((e) => {
                        error(e)
                    })
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