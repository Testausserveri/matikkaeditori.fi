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
                    let jsonData = {name: json.name, date: json.date}
                    if(json.data) jsonData.data = json.data // Add data to checksum calculation if available
                    const isValid = await this.validate(JSON.stringify(jsonData), json.checksum)
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
     * @param {*} onlyUpdate Do not edit
     */
    async writeToIndex(id, data, onlyUpdate){
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            if(id === undefined) id = true // Default is root
            console.log("[ Filesystem ] Preparing index update...")
            console.debug("[ Filesystem ] Index snapshot before update:", this.index)
            console.debug("[ Filesystem] Index entry identifier:", id, "data:", data)

            // Do the things
            if(!onlyUpdate){
                if(id === true){
                    // In root
                    console.debug("[ Filesystem ] Writing to index root...")
                    let replaced = false
                    for(let i = 0; i < this.index.length; i++){
                        if(this.index[i].i === data.id) {
                            replaced = true
                            this.index[i] = data
                        }
                    }
                    console.log("Replaced", replaced)
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
                                if(tree[i].i === id){
                                    // Replace?
                                    for(let ii = 0; ii < tree[i].d.length; ii++){
                                        if(tree[i].d[ii].id === data.id){
                                            replaced = true
                                            tree[i].d[ii] = data
                                        }
                                    }
                                    if(!replaced) tree[i].d.push(data)
                                }else {
                                    find(tree[i].d, id)
                                }
                            }
                        }
                    }
                    find(this.index, id)
                    if(!replaced) reject("Cannot find such location")
                }
            }
            const hashSession = new hash(this.index)
            const _hash = await hashSession.sha1()
            console.debug("[ Filesystem ] Index after update:", this.index)
            switch(this.type){
            /**
            * -----------------------------------------------
            * Implement filesystem index update for each type here
            * -----------------------------------------------
            */
            case 0: {
                await localForage.setItem("matikkaeditori-checksums", JSON.stringify(_hash))
                await localForage.setItem("matikkaeditori-index", JSON.stringify(this.index))    
            }
            }
            console.log("[ Filesystem ] Index update completed successfully.")
            resolve()
        })
    }

    /**
     * Resolve a specific part of the index and return it
     * @param {*} id 
     */
    async resolveFromIndex(id){
        if(id === true) return this.index
        const looper = tree => {
            for(const entry of tree){
                if(entry.i === id) return entry
                if(entry.t === 1){
                    const l = looper(entry.d)
                    if(l !== null) return l
                }
            }
            return null
        }
        return looper(this.index)
    }

    /**
     * Remove a specific part of the index
     * @param {*} id 
     */
    async removeFromIndex(id){
        if(id === true) return this.index
        const looper = tree => {
            for(let entry of tree){
                if(entry.i === id) {
                    // Note: Do we need to edit this
                    tree.splice(tree.indexOf(entry), 1)
                    this.writeToIndex(null, null, true).then(() => {
                        return true
                    })
                }
                if(entry.t === 1){
                    const l = looper(entry.d)
                    if(l !== null) return l
                }
            }
            return null
        }
        return looper(this.index)
    }

    /**
     * Limit tree level for data delivery
     * @param {*} tree 
     * @param {*} level 
     */
    async limitTreeLevel(tree, level){
        const checker = (tree, currentLevel) => {
            if(!currentLevel) currentLevel = 1
            for(const entry of tree){
                if(entry.t === 1){
                    if(level >= currentLevel){
                        return checker(entry.d, ++currentLevel)
                    }else {
                        entry.d = null
                    }
                }
            }
        }
        checker(tree)
        return tree
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
                        date: new Date().getTime(),
                    }
                    if(data.type === 0){
                        // Files have data
                        base.data = data.data ?? json.data
                        const hashInstance = new hash(JSON.stringify({name: base.name, data: base.data, date: base.date}))
                        const sha1 = await hashInstance.sha1()
                        base.checksum = sha1
                    }else {
                        // Folders have no data
                        const hashInstance = new hash(JSON.stringify({name: base.name, date: base.date}))
                        const sha1 = await hashInstance.sha1()
                        base.checksum = sha1
                    }
                    console.debug("[ Filesystem ] Write task base:", base)
                    await localForage.setItem(id ?? json.id, JSON.stringify(base))
                    // Update index
                    let indexBase = { t: data.type ?? json.type, i: id ?? json.id }
                    // TODO: This has to be redone to support moving folders and their contents
                    const isInIndex = await this.resolveFromIndex(id ?? json.id)
                    if(!isInIndex){
                        if(data.type === 1) {
                            indexBase.d = []
                        }
                        await this.writeToIndex(location, indexBase)
                    }
                    console.log("[ Filesystem ] Write task completed successfully.")
                    resolve(id ?? json.id)
                }
                }
            }
            catch(e){
                console.log(e)
                reject("Failed to write: " + e.stack)
            }
        })
    }

    /**
     * Remove answer
     * @param {*} id 
     */
    async remove(id){
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async(resolve, reject) => {
            try {
                switch(this.type){
                /**
                 * -----------------------------------------------
                 * Implement filesystem deletion for each type here
                 * -----------------------------------------------
                 */
                case 0: {
                    console.log("[ Filesystem ] Preparing remove task...")
                    // Remove from database
                    if(await localForage.getItem(id) !== null) {
                        console.log("[ Filesystem ] Target", id, "exists")
                        await localForage.removeItem(id)
                    }else {
                        console.log("[ Filesystem ] Target not found")
                    }

                    // Remove from index
                    if(await this.resolveFromIndex(id) !== null) await this.removeFromIndex(id)
                    

                    console.log("[ Filesystem ] Remove task concluded")
                    resolve(true)
                    break
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
                                data: ["Welcome to Matikkaeditori.fi!"],
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
        if(!instance) return console.error("No such filesystem instance")
        const data = await instance.read(e.content.id)
        com.send("callback", { id: e.id, read: data })
        break
    }
    case "write": {
        const instance = this_worker.shared.filesystem_instances[e.content.instance]
        if(!instance) return console.error("No such filesystem instance")
        const write = await instance.write(e.content.id, e.content.write, e.content.location)
        com.send("callback", { id: e.id, write })
        break
    }
    case "callback": {
        // Ignore these. (Handled by com.js)
        break
    }
    case "remove": {
        const instance = this_worker.shared.filesystem_instances[e.content.instance]
        if(!instance) return console.error("No such filesystem instance")
        console.log("RAW", e.content)
        await instance.remove(e.content.id)
        com.send("callback", { id: e.id })
        break
    }
    case "move": {
        const instance = this_worker.shared.filesystem_instances[e.content.instance]
        if(!instance) return console.error("No such filesystem instance")
        const currentLocation = e.content.from
        const newLocation = e.content.to
        // TODO: read from index & remove & write
        const oldData = await instance.resolveFromIndex(currentLocation)
        if(!oldData) return console.error("No such location (read)")
        await instance.removeFromIndex(e.content.id)
        if(newLocation !== true) {
            const newLocationExists = await instance.resolveFromIndex(newLocation)
            if(!newLocationExists) return console.error("No such location (write)")
        }
        await instance.writeToIndex(newLocation, oldData)
        break
    }
    case "index": {
        const instance = this_worker.shared.filesystem_instances[e.content.instance]
        if(!instance) return console.error("No such filesystem instance")
        if(e.content.id && e.content.level){
            const resolved = await instance.resolveFromIndex(e.content.id)
            const limited = await instance.limitTreeLevel(resolved.d, e.content.level)
            com.send("callback", { index: limited, id: e.id })
        }else {
            com.send("callback", { index: instance.index, id: e.id })
        }   
        break
    }
    default:
        com.send("error", "Unexpected command")
    }
})