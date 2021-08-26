/**
 * Worker-handler: Register workers, handle events etc.
 */
import error from "./error.js"
import * as Comlink from "comlink"

// Message handlers
/**
 * Handle messages from
 * @param {*} msg 
 */
function sendMessage(worker, msg){
    try {
        window.internal.workers.list[worker].postMessage(JSON.stringify(msg))
    }
    catch(err){
        console.error("Failed to send message to",worker,":",err)
    }
}
/**
 * Handles received messages
 * @param {*} event The onmessage event
 * @param {*} name The worker name in the internal workers list
 */
async function onMessage(event, name){
    try {
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
            // The worker wants to report an error
            error("Worker - " + name, message.content)
            //console.error("[ WORKER - " + name + " ]", message.content)
            break
        case "log":
            // The worker wants to log a message to the browser console
            console.log("[ WORKER - " + name + " ]", message.content)
            break
        case "confirm":
            if(confirm(message.content)){
                sendMessage(name, {type: "confirm", content: {value: true}})
            }else {
                sendMessage(name, {type: "confirm", content: {value: false}})
            }
            break
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

/**
 * Create a worker using comlink
 * @param {string} name Worker name 
 */
async function createWorker(name){
    const Worker = import("worker-loader!./workers/" + name + ".js")
    const worker = new Worker()
    // Standard: { init: <promise to resolve when ready>, share: <data to be added to global memory> }
    const Core = Comlink.wrap(worker)
    await Core.init()
    window.internal.workers.shared[name] = Core.shared
    window.internal.workers.list[name] = worker
    worker.addEventListener("message", e => onMessage(e, name))
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
            let id = window.public.uuid.v4()
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
    // Filesystem
    try {
        await createWorker("filesystem")
    }
    catch(err){
        console.error("Failed to create Filesystem worker:", err)
    }
    // Cloud storage
    try {
        await createWorker("cloud-storage")
    }
    catch(err){
        console.error("Failed to create Cloud storage worker:", err)
    }
    return true
}