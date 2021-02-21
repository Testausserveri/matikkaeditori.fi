/**
 * This is the main filesystem worker. It handles all filesystem interactions.
 * 
 * By: @Esinko
 */
// Worker memory
var wo = {
	instances: {},
	libs: {},
	ready: false,
	libsNro: 2 // How many libs do we need to load before accepting api calls?
}
// Main class
/**
 * The filesystem
 */
class Filesystem {
	/**
	 * Create a new instance of the filesystem
	 * @param {Number} type The filesystem type 0-2
	 */
	constructor(type){
		this.type = type
		this.table = {}
		// IndexDB specific variables
		this.db = null
		this.id = wo.libs.uuid.v4()
	}
	
	/**
	 * Initialize the filesystem
	 */
	async init(){
		return new Promise((resolve, reject) => {
			// Validate filesystem type
			if(typeof this.type == "number" && (this.type == 0 || this.type <= 2)){
				let db, idb, obs, tr, tr2
				switch(this.type){
				case 0:
					send("log", null, "Creating filesystem instance (type: " + this.type + " )")
					db = indexedDB.open("save", 1)
					db.onerror = async (e) => {
						send("error", null, "Failed to open IndexDB: "+e)
					}
					db.onupgradeneeded = async (e) => {
						send("log", null, "IndexDB needs to be created.")
						// We need to create the database
						idb = e.target.result
						obs = idb.createObjectStore("data", { keyPath: "id" })
						obs.transaction.oncomplete = async (e) => {
							// Create welcome entry
							tr = e.target.result.transaction("save", "readwrite").objectStore("data")
							tr.add({
								id: wo.libs.uuid.v4(),
								name: "Tervetuloa!",
								content: "Tervetuloa käyttmään Matikkaeditori.fi-palvelua!",
								parent: null
							})
							// We are done
							send("log", null, "IndexDB created!")
							resolve()
						}
					}
					db.onsuccess = async (e) => {
						// Create lookup table
						tr = e.target.result.transaction("save", "readwrite").objectStore("data")
						obs = tr.objectStore("data")
						tr2 = obs.getAll()
						tr2.onsuccess = async () => {
							send("log", null, tr2.result)
							send("log", null, "Filesystem instance created!")
						}
						tr2.onerror = async err => {
							send("log", null, "Failed to create filesystem table", err)
						}
					}
					break
				case 1:

					break
				case 2:

					break
				}
			}else {
				reject("Unknown filesystem type (" + this.type + ")")
			}
		})
	}

	///**
	// * Write data to the filesystem
	// */
	//async write(){
	//	return new Promise((resolve, reject) => {
	//		
	//	})
	//}
}

// Message handlers
async function send(type, id, ...msg){
	for(let i = 0; i < msg.length; i++){
		postMessage(JSON.stringify({type:type,id:id,content:msg[i]}))
	}
}
onmessage = function(e) {
	try {
		let message = JSON.parse(e.data.toString())
		// Api
		switch(message.type){
		// Worker
		case "component":
			message.content.as = message.content.as.replace(".js", "") // Remove .js file ending
			// Convert the strings to code again
			// eslint-disable-next-line no-case-declarations
			let b = {}
			// eslint-disable-next-line no-case-declarations
			let k = Object.keys(message.content.in)
			for(let i = 0; i < k.length; i++){
				let n = k[i]
				let v = message.content.in[n].toString()
				let c = v.startsWith("FUNCTION-") ? function(){
					// Get the args
					v = v.replace("FUNCTION-", "")
					let a = v.split("{")[0].split(n)[1].split("(")[1].split(")")[0]
					a = a == "" ? [] : a.split(",") // TODO: Very basic arg parser. This should be made better to account for strings
					// Parse the function to the actual code
					let f = v.split("{")
					f.splice(0, 1)
					f = f.join("{")
					f = f.split("}")
					f.splice(f.length-1, 1)
					f = f.join("}")
					// Create function object
					return new Function(a, f)
				} : v
				b[n] = c
			}
			wo.libs[message.content.as] = b // Set the built value
			send("log", null, "Loaded library " + message.content.as + " " + Object.keys(wo.libs).length + "/" + wo.libsNro)
			if(wo.libsNro == Object.keys(wo.libs).length){
				send("set", null, {val: "fs_ready", to: true})
				send("log", null, "Filesystem worker ready.")
				wo.ready = true
			}
			break
		// FS
		case "init": 
			if(!wo.ready){
				send("error", null, "Filesystem worker called too early.")
			}else {
				// eslint-disable-next-line no-case-declarations
				let f = new Filesystem(message.content)
				wo.instances[f.id] = f
				f.init().then(async () => {
					send("log", null, "Filesystem with type of " + f.type + " was initialized as " + f.id)
					send("response", message.id, null)
				}).catch(async err => {
					send("error", null, "Failed to initialize filesystem:", err)
				})
			}
			break
		default:
			send("error", null, "Unknown command:", message.type)
			break
		}
	}
	catch(err){
		send("error", null, "Failed to parse message:", err.stack)
	}
}
// Request components
send("component", null, "hash.js")
send("component", null, "uuid.js")