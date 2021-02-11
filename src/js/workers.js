/**
 * Worker-handler: Register workers, handle events etc.
 */
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
		let message = JSON.parse(event.textContent.toString())
		// Note: Standard = { type: "any case of the switch below", content: "any data to pass", id: "task id if present"}
		switch(message.type){
		case "component":
			// The worker wants to load a component
			for(let i = 0; i < window.internal.workers.components.length; i++){
				let component = window.internal.workers.components[i]
				if(message.content == component){
					let c_ = await import("./worker-components/" + message.content)
					sendMessage(name, {type: "component", content: c_}) // Worker will call c_.default()?
				}else {
					console.warn("A worker has requested an unknown component:", message.content)
				}
			}
			break
		case "response":
			// The worker is responding to a command
			if(message.id != undefined){
				if(typeof window.internal.workers.handlers[message.id] == "function"){
					// Run the response handler
					window.internal.workers.handlers[message.id]()
				}else {
					console.warn("Worker response handler missing", message)
				}
			}else {
				console.warn("Worker response was dropped due to a missing task id:", message)
			}
			break
		case "error":
			// The worker wants to report an error
			console.error("[ WORKER - " + name + "]", message.content)
			break
		case "log":
			// The worker wants to log a message to the browser console
			console.log("[ WORKER - " + name + "]", message.content)
			break
		default:
			// Unknown message
			console.warn("Unknown message from worker:", message)
			break
		}
	}
	catch(err){
		console.error("Worker message handler failed:", err)
	}
	
}
// Export client api
export async function api(worker, type, content){
	return new Promise((resolve, reject) => {
		try {
			let id = uuid.v4()
			window.internal.workers.handlers[id] = async (message) => {
				// This will be called when the worker responds
				resolve(message)
			}
			sendMessage(worker, {type: type, content: content, id})
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
		let fs = new Worker("./workers/filesystem.js")
		fs.onmessage = async (e) => {onMessage(e, "filesystem")}
		fs.onerror = async (e) => {
			console.error("Worker error:", e)
		}
		window.internal.workers.list["filesystem"] = fs
	}
	catch(err){
		console.error("Failed to create Filesystem worker:", err)
	}
	// Cloud storage
	try {
		let cs = new Worker("./workers/cloud-storage.js")
		cs.onmessage = async (e) => {onMessage(e, "cloud_storage")}
		cs.onerror = async (e) => {
			console.error("Worker error:", e)
		}
		window.internal.workers.list["cloud_storage"] = cs
	}
	catch(err){
		console.error("Failed to create Cloud storage worker:", err)
	}
}