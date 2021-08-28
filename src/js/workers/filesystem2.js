/*global localForage, importScripts */
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

// Internal dependencies
import uuid from "worker-loader!../worker-components/uuid.js"
import hash from "worker-loader!../worker-components/hash.js"
import com from "worker-loader!../worker-components/com.js"

// Comlink configuration
const this_worker = {
    init: async function () {
        // For now nothing needs to be here
        this_worker.shared.ready = true
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
        this_worker.shared.filesystem_instances[id] = this
    }

    /**
     * Validate checksum for a string
     */
    async validate(string, checksum){
        return new Promise(async (resolve, reject) => {
            try {
                const hash = new hash(string)
                const sha1 = await hash.sha1() // Is this enough?
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
                    const json = JSON.parse(await localForage.getItem(id))
                    const string = JSON.stringify({name: json.name, data: json.data, date: json.date})
                    const isValid = await this.validate(string, json.checksum)
                    if(isValid){
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
     * Write data to the dump
     * @param {*} id 
     * @param {*} data
     */
    async write(id, data){
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
                    const json = JSON.parse(await localForage.getItem(id))
                    const hashInstance = new hash(JSON.stringify({name: json.name, data: json.data, date: json.date}))
                    const sha1 = await hashInstance.sha1()
                    const base = {
                        name: data.name | json.name,
                        data: data.data | json.data,
                        date: new Date().getTime(),
                        checksum: sha1
                    }
                    await localForage.setItem(id, base)
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
     * Get the filesystem index
     */
    async index(){
        return new Promise(async (resolve, reject) => {
            try {
                switch(this.type){
                /**
                     * -----------------------------------------------
                     * Implement filesystem writing for each type here
                     * -----------------------------------------------
                     */
                case 0: {
                    const json = JSON.parse(await localForage.getItem(id))
                    const hashInstance = new hash(JSON.stringify({name: json.name, data: json.data, date: json.date}))
                    const sha1 = await hashInstance.sha1()
                    const base = {
                        name: data.name | json.name,
                        data: data.data | json.data,
                        date: new Date().getTime(),
                        checksum: sha1
                    }
                    await localForage.setItem(id, base)
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
                    let index = await localforage.getItem("matikkaeditori-index")
                    let checksums = await localStorage.getItem("matikkaeditori-checksums")

                    if(index !== null && checksums !== null){
                        index = JSON.parse(index)
                        checksums = JSON.parse(checksums)
                        const index_is_valid = await this.validate(index, checksums.index)
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
            }
        })
    }
}

//com.send("log", "Initializing filesystem. Type: " + this.type + ", id: " + this.id)