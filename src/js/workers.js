/**
 * Worker-handler: Register workers, handle events etc.
 */
import error from "./error.js"
import * as Comlink from "comlink"
import * as uuid from "./worker-components/uuid.js"

// Message handlers
/**
 * Handle messages from
 * @param {*} msg 
 */
function sendMessage(worker, msg){
    try {
        console.debug("[ COM - workers.js ] Main ->", worker + ":", msg)
        window.internal.workers.list[worker].postMessage(JSON.stringify(msg))
    }
    catch(err){
        console.error("[ COM - workers.js ] Failed to send message to",worker,":",err)
    }
}
/**
 * Handles received messages
 * @param {*} event The onmessage event
 * @param {*} name The worker name in the internal workers list
 */
async function onMessage(event, name){
    try {
        console.debug("[ COM - workers.js ] Main <-", name + ":", event)
        let message = JSON.parse(event.data.toString())
        // Note: Standard = { type: "any case of the switch below", content: "any data to pass", id: "task id if present"}
        switch(message.type){
        case "response":
            // The worker is responding to a command
            if(message.id != undefined){
                if(typeof window.internal.workers.handlers[message.id] == "function"){
                    // Run the response handler
                    window.internal.workers.handlers[message.id](message.content)
                }else {
                    console.warn("Worker response handler missing", message)
                }
            }else {
                console.warn("Worker response was dropped due to a missing task id:", message)
            }
            break
        case "error":
            console.warn("[ WORKERS ] The log \"error\" will soon be removed!")
            // The worker wants to report an error
            error("Worker - " + name, message.content)
            //console.error("[ WORKER - " + name + " ]", message.content)
            break
        case "log":
            console.warn("[ WORKERS ] The log \"command\" will soon be removed!")
            // The worker wants to log a message to the browser console
            console.log("[ WORKER - " + name + " ]", message.content)
            break
        case "confirm":
            if(confirm(message.content)){
                sendMessage(name, {type: "callback", content: { value: true }, id: message.id})
            }else {
                sendMessage(name, {type: "callback", content: { value: false }, id: message.id})
            }
            break
        case "callback": 
            if(window.internal.workers.handlers[message.id] === undefined) console.warn("[ WORKERS ] Dropped callback \"" + message.id + "\"")
            window.internal.workers.handlers[message.id](message.content)
            break
        case "relay": {
            // Relay messages to other workers
            if(message.callback !== true){
                if(window.internal.workers.list[message.target] === undefined) {
                    console.error("[ WORKER ] No such relay target as \"" + message.target + "\"")
                }else {
                    const id = uuid.v4()
                    window.internal.workers.handlers[id] = async (response) => {
                        // This will be called when the worker responds
                        sendMessage(name, response.content)
                    }
                    sendMessage(message.target, message.content)
                }
            }else {
                // This is a callback
                if(window.internal.workers.handlers[message.id]){
                    window.internal.workers.handlers[message.id]()
                }else {
                    console.error("[ WORKERS ] Dropped callback \"" + message.id + "\"")
                }
            }
            break
        }
        case "window": {
            const whitelist = ["id"] // Note: Internal cannot be moved as is! Move only specific values from it if needed.
            let json = {}
            for(const key in window){
                if(whitelist.includes(key)) json[key] = window[key]
            }
            sendMessage(name, {type: "callback", content: { window: json }, id: message.id})
            break
        }
        default:
            // Unknown message
            console.warn("[ WORKERS ] Unknown message from worker:", message)
            break
        }
    }
    catch(err){
        console.error("Worker message handler failed:", err)
    }
    
}

// TODO: Can this be done dynamically?
import Filesystem from "worker-loader!./workers/filesystem.js"
import CloudStorage from "worker-loader!./workers/cloud-storage.js"

/**
 * Create a worker using comlink
 * @param {string} name Worker name 
 */
async function createWorker(name){
    const Worker = {Filesystem, CloudStorage}[name]
    const worker = new Worker()
    // Standard: { init: <promise to resolve when ready>, share: <data to be added to global memory> }
    const Core = Comlink.wrap(worker)
    window.internal.workers.shared[name] = Core.shared
    Core.shared.id = window.id
    window.internal.workers.list[name] = worker
    worker.addEventListener("message", e => {
        if(typeof e.data !== "string") return
        onMessage(e, name)
    }) 
    await Core.init()
}

// Export client api
/**
 * Worker api
 * @param {*} worker The name of the worker to send the data to
 * @param {*} type The message type
 * @param {*} content Message content
 */
export async function api(worker, type, content){
    return new Promise((resolve, reject) => {
        try {
            const id = uuid.v4()
            window.internal.workers.handlers[id] = async (message) => {
                // This will be called when the worker responds
                resolve(message)
            }
            sendMessage(worker, {type: type, content: content, id: id})
        }
        catch(err){
            reject(err)
        }
    })
}


// Main function and export
export default async function (){
    console.log("Staring workers...")
    // Filesystem
    try {
        await createWorker("Filesystem")
    }
    catch(err){
        console.error("Failed to create Filesystem worker:", err)
    }
    // Cloud storage
    try {
        await createWorker("CloudStorage")
    }
    catch(err){
        console.error("Failed to create Cloud storage worker:", err)
    }
    return true
}

window.internal.workers.essentialsResolve()