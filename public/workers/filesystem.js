/**
 * This is the main filesystem worker. It handles all filesystem interactions.
 * 
 * By: @Esinko
 */
// Worker memory
var wo = {
	instances: {},
	libs: {}
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
						obs.transaction.oncomplete = async () => {
							// Create welcome entry
							tr = db.transaction("save", "readwrite").objectStore("data")
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
					db.onsuccess = async () => {
						// Create lookup table
						tr = db.transaction(["data"])
						obs = tr.objectStore("data")
						tr2 = obs.getAll()
						tr2.onsuccess = async () => {
							send("log", null, tr.result)
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
			wo.libs[message.content.as] = message.content.in
			send("log", null, "Loaded library " + message.content.as)
			break
		// FS
		case "init": 
			// eslint-disable-next-line no-case-declarations
			let f = new Filesystem(message.content)
			wo.instances[f.id] = f
			f.init().then(async () => {
				send("log", null, "Filesystem with type of " + f.type + " was initialized as " + f.id)
				send("response", message.id, null)
			}).catch(async err => {
				send("error", "Failed to initialize filesystem:", err)
			})
			break
		default:
			send("error", "Unknown command:", message.type)
			break
		}
	}
	catch(err){
		send("error", "Failed to parse message:",err)
	}
}
// Request components
send("component", null, "hash")
send("component", null, "uuid")

// Send loaded log
send("log", null, "Filesystem worker loaded!")