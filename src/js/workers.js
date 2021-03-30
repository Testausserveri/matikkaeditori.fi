/**
 * Worker-handler: Register workers, handle events etc.
 */
import error from "./error.js"
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
        case "component":
            // The worker wants to load a component
            // eslint-disable-next-line no-case-declarations
            let sent = false // Only used here
            for(let i = 0; i < window.internal.workers.components.length; i++){
                let component = window.internal.workers.components[i]
                if(message.content == component){
                    sent = true
                    // Import the module
                    let c_ = await import("./worker-components/" + message.content)
                    console.debug("Imported:", c_, c_.default)
                    let b = null
                    if(
                        Object.keys(c_).length == 1 &&
                        c_.default != undefined &&
                        c_.default.toString().startsWith("class")
                    ){
                        // We'll assume that this is a class
                        b = "CLASS-" + c_.default.toString()
                    } else {
                        // Convert module to js object
                        // NOTE: This will only convert something that's on the top level of the module!
                        let k = Object.keys(c_)
                        b = {}
                        for(let i = 0; i < k.length; i++){
                            let n = k[i]
                            b[n] = typeof c_[n] == "function" ? "FUNCTION-" + c_[n].toString() : c_[n]
                        }
                    }
                    console.debug("Exported:", b)
                    console.log("[ WORKERS ] Processing component load",message.content,"for",name + "...")
                    sendMessage(name, {type: "component", content: {as: message.content, in: b}}) // Worker will call c_.default()?
                }
            }
            if(!sent){
                console.warn("A worker has requested an unknown component:", message.content, name, event)
            }
            break
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
        case "set":
            // The worker want's to set a variable in global scope
            console.log("[ WORKER - " + name + " ] SET", message.content.val, message.content.to)
            window[message.content.val] = message.content.to
            if(message.id != null) sendMessage(name, {type : "set", content: true})
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
export default function (){
    // Filesystem
    try {
        let fs = new Worker("workers/filesystem.js")
        fs.onmessage = async (e) => {onMessage(e, "filesystem")}
        fs.onerror = async e => {
            error("Worker - filesystem", e)
        }
        window.internal.workers.list["filesystem"] = fs
    }
    catch(err){
        console.error("Failed to create Filesystem worker:", err)
    }
    // Cloud storage
    try {
        let cs = new Worker("workers/cloud-storage.js")
        cs.onmessage = async (e) => {onMessage(e, "cloud_storage")}
        cs.onerror = async e => {
            error("Worker - cloud_storage", e)
        }
        window.internal.workers.list["cloud_storage"] = cs
    }
    catch(err){
        console.error("Failed to create Cloud storage worker:", err)
    }
}