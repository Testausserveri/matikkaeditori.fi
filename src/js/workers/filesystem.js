/*global importScripts */
/**
 * Main filesystem worker made to handle all tasks related to answer saving.
 * Uses LocalForage to store data in the browsers indexDB while automatically
 * falling back to normal local storage when required.
 * By: @Esinko
 */

// 3rd-party internal dependencies
import * as Comlink from "comlink"

// 3rd-party external dependencies
importScripts(["/3rd-party/localforage.js"])
// eslint-disable-next-line no-undef
const localForage = localforage

// Internal dependencies
import * as uuid from "../worker-components/uuid.js"
import hash from "../worker-components/hash.js"
import com from "../worker-components/com.js"
import C from "../console"

// Configure console
C()

// Comlink configuration
const this_worker = {
    init: async function () {
        // For now nothing needs to be here
        this_worker.shared.ready = true
        com.s
        return true
    },
    shared: {
        ready: false,
        filesystem_instances: {},
        id: null // Modified by "workers.js"
    }
}
Comlink.expose(this_worker)

// Main class
/**
 * Filesystem class
 */
class Filesystem {
    /**
     * Create a new filesystem instance
     * @param {number} type Filesystem type ID
     */
    constructor(type){
        this.type = parseInt(type) // Force int
        this.id = uuid.v4()
        // Instance memory
        this.index = [] // Index contains the structure
        this.data = {} // Data is one huge dump of id = <data>
        this_worker.shared.filesystem_instances[this.id] = this
    }

    /**
     * Validate checksum for a string
     */
    async validate(string, checksum){
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                const _hash = new hash(string)
                const sha1 = await _hash.sha1() // Is this enough?
                console.debug("[ Filesystem ] Checksum calculation", string, checksum, sha1)
                if(checksum === sha1){
                    resolve(true)
                }else {
                    resolve(false)
                }
            }
            catch(e){
                reject("Failed to validate checksum: " + e.stack)
            }
        })
    }

    /**
     * Read data from the dump
     * @param {*} id 
     */
    async read(id){
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                switch(this.type){
                /**
                 * -----------------------------------------------
                 * Implement filesystem reading for each type here
                 * -----------------------------------------------
                 */
                case 0: {
                    console.debug("[ Filesystem ] Preparing read task...")
                    const json = JSON.parse(await localForage.getItem(id))
                    console.debug("[ Filesystem ] Read raw data:", json)
                    console.debug("[ Filesystem ] Validating checksum...") 
                    const isValid = await this.validate(JSON.stringify({name: json.name, data: json.data, date: json.date}), json.checksum)
                    if(isValid){
                        console.debug("[ Filesystem ] Checksum valid, read task concluded successfully.")
                        resolve(json)
                    }else {
                        // TODO: Handle this better
                        reject("Failed to validate")
                    }
                }
                }
            }
            catch(e){
                reject("Failed to read: " + e.stack)
            }
        })
    }

    /**
     * Write data to the index
     * @param {*} id if true --> root
     * @param {*} data 
     */
    async writeToIndex(id, data){
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            console.log("[ Filesystem ] Preparing index update...")
            console.debug("[ Filesystem ] Index snapshot before update:", this.index)
            console.debug("[ Filesystem] Index entry identifier:", id, "data:", data)
            if(id === true){
                // In root
                console.debug("[ Filesystem ] Writing to index root...")
                let replaced = false
                for(let i = 0; i < this.index.length; i++){
                    if(this.index[i].id === id) {
                        replaced = true
                        this.index[i] = data
                    }
                }
                if(!replaced) this.index.push(data)
            }else {
                // In folder
                console.debug("[ Filesystem ] Writing to folder...")
                let replaced = false
                const find = (tree, id) => {
                    for(let i = 0; i < tree.length; i++){
                        if(tree[i].t === 0 && tree[i].id === id) {
                            replaced = true
                            tree[i] = data
                        }else if(tree[i].t === 1){
                            find(tree[i].d, id)
                        }
                    }
                }
                find(this.index, id)
                if(!replaced) reject("Cannot find such location")
            }
            const hashSession = new hash(this.index)
            console.debug("[ Filesystem] Index after update:", this.index)
            await localForage.setItem("matikkaeditori-checksums", JSON.stringify(await hashSession.sha1()))
            await localForage.setItem("matikkaeditori-index", JSON.stringify(this.index))
            console.log("[ Filesystem ] Index update completed successfully.")
            resolve()
        })
    }

    /**
     * Write data to the dump
     * @param {*} id 
     * @param {*} data
     * @param {*} location
     */
    async write(id, data, location){
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async(resolve, reject) => {
            try {
                switch(this.type){
                /**
                 * -----------------------------------------------
                 * Implement filesystem writing for each type here
                 * -----------------------------------------------
                 */
                case 0: {
                    console.log("[ Filesystem ] Preparing write task...")
                    let json = JSON.parse(await localForage.getItem(id))
                    if(json === null) {
                        console.debug("[ Filesystem ] No previous entry found.")
                        json = {
                            id: id ?? uuid.v4() // Generate id if new object
                        }
                    }
                    const base = {
                        name: data.name ?? json.name,
                        data: data.data ?? json.data,
                        date: new Date().getTime(),
                        checksum: null
                    }
                    const hashInstance = new hash(JSON.stringify({name: base.name, data: base.data, date: base.date}))
                    const sha1 = await hashInstance.sha1()
                    base.checksum = sha1
                    console.debug("[ Filesystem ] Write task base:", base)
                    await localForage.setItem(id ?? json.id, JSON.stringify(base))
                    // Update index
                    await this.writeToIndex(location, { t: data.type ?? json.type, i: id ?? json.id })
                    console.log("[ Filesystem ] Write task completed successfully.")
                    resolve()
                }
                }
            }
            catch(e){
                reject("Failed to write: " + e.stack)
            }
        })
    }

    /**
     * Initialize the filesystem
     */
    async init(){
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                switch(this.type){
                /**
                 * ------------------------------------------------------
                 * Implement filesystem initialization for each type here
                 * ------------------------------------------------------
                 */
                case 0: {
                    let index = await localForage.getItem("matikkaeditori-index")
                    let checksums = await localForage.getItem("matikkaeditori-checksums")

                    if(index !== null && checksums !== null){
                        index = JSON.parse(index)
                        checksums = JSON.parse(checksums)
                        const index_is_valid = await this.validate(index, checksums)
                        if(!index_is_valid){
                            const load = await com.send("confirm", "Someone may have tampered with index data or it may be corrupt. Would you like to load it?")
                            if(!load) reject("Filesystem initialization aborted.")
                        }
                        this.index = index
                        resolve()
                    }else {
                        const create = await com.send("confirm", "No save data exists or it cannot be loaded. Would you like to create a new save?")
                        if(create){
                            // TODO: Create index & example file
                            const exampleId = uuid.v4()
                            const exampleFile = {
                                name: "Welcome!",
                                date: new Date().getTime(),
                                data: "Welcome to Matikkaeditori.fi!",
                                checksum: null,
                                type: 0
                            }
                            const hashSession = new hash({name: exampleFile.name, data: exampleFile.data, date: exampleFile.date })
                            exampleFile.checksum = await hashSession.sha1()
                            await this.write(exampleId, exampleFile, true) // Root is true
                            console.log("Example file created")
                            resolve()
                        }else {
                            reject("Filesystem initialization aborted.")
                        }
                    }
                }
                }
            }
            catch(e){
                reject("Failed to initialize filesystem: \n" + e.stack)
                console.debug(e)
            }
        })
    }
}

com.onMessage.addEventListener("message", async e => {
    console.debug("[ COM - com.js ] Worker <- Main:", e)
    // Detail is the event data
    e = e.detail
    if(!this_worker.shared.ready) return
    switch(e.type){
    case "init": {
        const instance = new Filesystem(e.content.type)
        // ID must be reused later
        this_worker.shared.filesystem_instances[e.id] = instance
        await instance.init()
        com.send("callback", { id: e.id, instance: instance.id, index: instance.index })
        break
    }
    case "read": {
        const instance = this_worker.shared.filesystem_instances[e.content.instance]
        if(!instance) return com.send("error", "No such filesystem instance")
        const data = await instance.read(e.content.id)
        com.send("callback", { id: e.id, read: data })
        break
    }
    case "write": {
        const instance = this_worker.shared.filesystem_instances[e.content.instance]
        if(!instance) return com.send("error", "No such filesystem instance")
        await instance.write(e.content.id, e.content.write, e.content.location)
        com.send("callback", { id: e.id })
        break
    }
    case "callback": {
        // Ignore these. (Handled by com.js)
        break
    }
    default:
        com.send("error", "Unexpected command")
    }
})