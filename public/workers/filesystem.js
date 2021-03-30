/**
 * This is the main filesystem worker. It handles all filesystem interactions.
 * 
 * By: @Esinko
 */
importScripts(["/3rd-party/localforage.js"])
// Worker memory
var wo = {
    instances: {},
    libs: {},
    vals: {},
    ready: false,
    libsNro: null,
    confirmHandler: null,
    readyHandlers: []
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
        this.type = parseInt(type)
        this.id = wo.libs.uuid.v4()
        // FS
        this.index = []
        this.data = {}
    }

    /**
     * Validate save metadata, such as verity keys
     * @param {*} metadata 
     * @param {*} callback
     */
    async validate(metadata, callback){
        try {
            //let example = {
            //    key: "verity_key, this is the verity key for the index",
            //    index: [
            //        {name: "Kansio", id: "uuid", type: 0, edited: "EPOCH time", index: [
            //            // Recursion of basic entries
            //        ]},
            //        {name: "File", id: "uuid, also the entry name of the data", type: 1, edited: "EPOCH time", key: "verity_key, this is the verity key for the data"}
            //    ] // Filesystem index
            //}
            // Verify input
            if (
                metadata.key != undefined &&
                typeof metadata.key == "string" &&
                metadata.index != undefined &&
                Array.isArray(metadata.index)
            ){
                // Input is valid, verify the verity of the index
                let generated = new wo.libs.hash(JSON.stringify(metadata.index) + "-" + wo.vals.id)
                generated = await generated.sha1()
                if(generated == metadata.key){
                    // Metadata is valid
                    callback(true)
                } else {
                    callback(false)
                }
            } else {
                callback(false)
            }
        }
        catch(err){
            send("error", null, "Metadata validation failed: " + err.stack != undefined ? err.stack : err)
        }
    }
    
    /**
     * Initialize the filesystem
     */
    async init(){
        return new Promise(async (resolve, reject) => {
            // Validate filesystem type
            if(typeof this.type == "number" && (this.type == 0 || this.type <= 2)){
                send("log", null, "Creating filesystem instance (type: " + this.type + ")")
                switch(this.type){
                case 0:
                    try {
                        let metadata = await localforage.getItem("matikkaeditori-metadata")
                        if(metadata != null){
                            metadata = JSON.parse(metadata)
                            this.validate(metadata, async res => {
                                if(res){
                                    send("log", null, "Metadata validated!")
                                    this.index = metadata.index
                                    resolve()
                                }else {
                                    send("log", null, "Unable to verify metadata verity...")
                                    handleConfirm("Unable to verify save verity, are you sure you want to load it?", async res => {
                                        if(res){
                                            this.index = res.index
                                            resolve()
                                        }else {
                                            send("error", null, "Interrupted init")
                                        }
                                    })
                                }
                            })
                        }else {
                            // Create the save
                            localforage.setItem("matikkaeditori-metadata", JSON.stringify({
                                key: null,
                                index: []
                            }))
                            this.index = []
                            let uuid = await this.create([], "Tervetuloa!", 1)
                            await this.write([], uuid, "Tervetuloa!", [
								{text: "Tervetuloa käyttämään matikkaeditori.fi-palvelua!"},
								{math: "1+1=2"}
							])
                            resolve()
                        }
                    }
                    catch(err){
                        send("error", null, "Failed to create instance: " + err.stack != undefined ? err.stack : err)
                    }
                    break
                case 1:

                    break
                case 2:

                    break
                }
            } else {
                reject("Unknown filesystem type (" + this.type + ")")
            }
        })
    }

    /**
     * Resolve a path in the fs
     * @param {String} path UUID path
     */
    async resolve(path){
        try {
            if (!Array.isArray(path)) throw "Invalid input"
            if (path.length == 0){
                // This is the root
                return this.index
            } else {
                let tmp = this.index
                for(let dir of path){
                    let ntmp = null
                    for(let entry of tmp){
                        if (entry.uuid == dir && entry.type == 0){ // Only folders allowed
                            ntmp = entry
                        }
                    }
                    tmp = ntmp
                    if (tmp == null) break // No such path
                }
                return tmp
            }
        }
        catch(err){
            send("error", null, "Failed to resolve: " + err.stack != undefined ? err.stack : err)
        }
    }

    /**
     * Sync metadata to the save location
     */
    async syncMetadata(){
        try {
            switch(this.type){
                case 0:
                    let hash = new wo.libs.hash(JSON.stringify(this.index) + "-" + wo.vals.id)
                    hash = await hash.sha1()
                    await localforage.setItem("matikkaeditori-metadata", JSON.stringify({
                        key: hash,
                        index: this.index
                    }))
                    break
                case 1:

                    break
                case 2:

                    break
            }
        }
        catch(err){
            throw "Failed to sync metadata: " + err.stack != undefined ? err.stack : err
        }
    }

    /**
     * Write data to the filesystem
     */
    async write(path, uuid, data){
        return new Promise(async (resolve) => {
            try {
                let dir = await this.resolve(path)
                if (dir != null){
                    let e = null
                    for(let entry of dir){
                        if(entry.uuid == uuid){
                            e = entry
                        }
                    }
                    if (e != null){
                        switch(this.type){
                            case 0:
                                let data_ = await localforage.getItem(uuid)
                                if (data_ != null){
                                    let key = new wo.libs.hash(JSON.stringify(data) + "-" + wo.vals.id)
                                    key = await key.sha1()
                                    await localforage.setItem(uuid, {
                                        key: key,
                                        data: data
                                    })
                                    e.edited = new Date().getTime()
                                    await this.syncMetadata()
                                    resolve()
                                } else {
                                    throw "Data entry missing for " + uuid
                                }
                                break
                            case 1:
    
                                break
                            case 2:
    
                                break
                        }
                    } else {
                        throw "Entry does not exist"
                    }
                } else {
                    throw "No such directory"
                }
            }
            catch(err){
                send("error", null, "Unable to write: " + err.stack != undefined ? err.stack : err)
            }
        })
    }

    /**
     * Read data
     * @param {*} path 
     * @param {*} uuid
     */
    async read(path, uuid){
        try {
            let dir = await this.resolve(path)
            if (dir != null){
                let e = null
                for(let entry of dir){
                    if(entry.uuid == uuid){
                        e = entry
                        break
                    }
                }
                if(e != null){
                    switch(this.type){
                        case 0:
                            let data = JSON.parse(await localforage.getItem(uuid))
                            // Check data verity
                            let hash = new wo.libs.hash(JSON.stringify(data.data) + "-" + wo.vals.id)
                            hash = await hash.sha1()
                            if(hash == data.key){ // Check the hash
                                return data.data
                            }else {
                                handleConfirm("Unable to verify entry verity, are you sure you want to load it?", async res => {
                                    if(res){
                                        return data.data
                                    }else {
                                        throw "Interrupted"
                                    }
                                })
                            }
                            return data
                        case 1:

                            break
                        case 2:

                            break
                    }
                } else {
                    throw "Entry does not exist"
                }
            } else {
                throw "No such directory"
            }
        }
        catch(err){
            send("error", null, "Unable to read")
        }
    }

    /**
     * Create a new
     * @param {*} path 
     * @param {*} name 
     */
    async create(path, name, type){
        try {
            let dir = await this.resolve(path)
            if (dir != null){
                let metadata = {
                    name: name,
                    uuid: wo.libs.uuid.v4(),
                    edited: new Date().getTime(),
                    type: type
                }
				send("log", null, metadata)
                // Create the data entry
                switch(this.type){
                    case 0:
                        await localforage.setItem(metadata.uuid, JSON.stringify({
                            key: null,
                            data: []
                        }))
                        break
                    case 1:

                        break
                    case 2:

                        break
                }
                dir.push(metadata)
                await this.syncMetadata()
                return metadata.uuid
            } else {
                throw "No such directory"
            }
        }
        catch(err){
            send("error", null, "Failed to create: " + err)
        }
    }
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
            let b = null
			// TODO: This fails? (Unable to generate uuids)
            send("log", null, message.content)
            if(message.content.in.toString().startsWith("CLASS-")){
                // This DOES work!
                //send("log", null, message.content.in.replace("CLASS-", ""))
                b = eval("(" + message.content.in.replace("CLASS-", "") + ")") // Is this secure...? Probably?
            }else {
                // This DOES work!
                b = {}
                // eslint-disable-next-line no-case-declarations
                let k = Object.keys(message.content.in)
                for(let i = 0; i < k.length; i++){
                    let n = k[i]
                    let v = message.content.in[n].toString()
                    if(v.startsWith("FUNCTION-")){
                        // Get the args
                        v = v.replace("FUNCTION-", "")
                        let a = v.split("{")[0].split("(")[1].split(")")[0]
                        a = a == "" ? [] : a.split(",") // TODO: Very basic arg parser. This should be made better to account for strings
                        // Parse the function to the actual code
                        let f = v.split("{")
                        f.splice(0, 1)
                        f = f.join("{")
                        f = f.split("}")
                        f.splice(f.length-1, 1)
                        f = f.join("}")
                        // Create function object
                        c = new Function(a, f)
                    }
                    b[n] = c
                }
            }
            wo.libs[message.content.as] = b // Set the built value
            send("log", null, "Loaded library " + message.content.as + " " + Object.keys(wo.libs).length + "/" + wo.libsNro)
            if(wo.libsNro == Object.keys(wo.libs).length){
                send("set", null, {val: "fs_ready", to: true})
                send("log", null, "Filesystem worker ready.")
                wo.ready = true
                for(let func of wo.readyHandlers){
                    func()
                }
            }
            break
        case "confirm":
            if(wo.confirmHandler != null) wo.confirmHandler(message.content.value)
            break
        case "set":
            wo.vals[message.content.name] = message.content.value
            send("response", message.id, true)
            break
        case "ready":
            // Send a message back when ready
            wo.readyHandlers.push(async () => {
                send("response", message.id, true)
            })
            break
        // FS
        case "init": 
            if(!wo.ready){
                send("error", null, "Filesystem worker called too early.")
            }else {
                // eslint-disable-next-line no-case-declarations
                let f = new Filesystem(parseInt(message.content))
                wo.instances[f.id] = f
                f.init().then(async () => {
                    send("log", null, "Filesystem with type of " + f.type + " was initialized as " + f.id)
                    send("response", message.id, f.id)
                }).catch(async err => {
                    send("error", null, "Failed to initialize filesystem: " + err)
                })
            }
            break
		case "index":
			if(!wo.ready){
                send("error", null, "Filesystem worker called too early.")
            }else {
                //send("log", null, wo.instances[message.content])
                send("response", message.id, wo.instances[message.content].index)
            }
            break
		case "read":
			if(!wo.ready){
                send("error", null, "Filesystem worker called too early.")
            }else {
				wo.instances[message.content].read(message.content.path, message.content.uuid).then(async res => {
                    send("log", null, res)
					send("response", message.id, res)
				}).catch(async err => {
					send("error", null, err)
				})
            }
			break
        default:
            send("error", null, "Unknown command:", message.type)
            break
        }
    }
    catch(err){
        send("error", null, "Failed to parse message: " + err.stack != undefined ? err.stack : err)
    }
}

// Confirm handler
async function handleConfirm(text, handler){
    send("confirm", null, text)
    wo.confirmHandler = handler
}

// Request components
wo.libsNro = 2 // How many libs do we need to load before accepting api calls?
send("component", null, "hash.js")
send("component", null, "uuid.js")