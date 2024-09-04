/* eslint-disable class-methods-use-this */
/**
 * Main filesystem worker made to handle all tasks related to answer saving.
 * Uses LocalForage to store data in the browsers indexDB while automatically
 * falling back to normal local storage when required.
 * By: @Esinko
 */

// 3rd-party internal dependencies
import * as Comlink from "comlink"
import localForage from "localforage"

// Internal dependencies
import * as uuid from "../components/uuid"
import hash from "../components/hash"
import com from "../components/com"
import consoleWrapper from "../../utils/console"

// Configure console
consoleWrapper()

// Comlink configuration
const thisWorker = {
    async init() {
        // For now nothing needs to be here
        thisWorker.shared.ready = true
        return true
    },
    shared: {
        ready: false,
        filesystem_instances: {},
        id: null // Modified by "workers.js"
    }
}
Comlink.expose(thisWorker)

// Main class
/**
 * Filesystem class
 */
class Filesystem {
    /**
     * Create a new filesystem instance
     * @param {number} type Filesystem type ID
     */
    constructor(type) {
        this.type = parseInt(type, 10) // Force int
        this.id = uuid.v4()
        // Instance memory
        this.index = [] // Index contains the structure
        this.data = {} // Data is one huge dump of id = <data>
        thisWorker.shared.filesystem_instances[this.id] = this
    }

    /**
     * Validate checksum for a string
     */
    async validate(string, checksum) {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                const hashObj = new hash(string)
                const sha1 = await hashObj.sha1() // Is this enough?
                console.debug(
                    "[ Filesystem ] Checksum calculation", string, checksum, sha1
                )
                if (checksum === sha1) {
                    resolve(true)
                } else {
                    resolve(false)
                }
            } catch (e) {
                reject(new Error(`Failed to validate checksum: ${e.stack}`))
            }
        })
    }

    /**
     * Read data from the dump
     * @param {*} id
     */
    async read(id) {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                switch (this.type) {
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
                    const jsonData = { name: json.name, date: json.date }
                    if (json.data) jsonData.data = json.data // Add data to checksum calculation if available
                    const isValid = await this.validate(JSON.stringify(jsonData), json.checksum)
                    if (isValid) {
                        console.debug("[ Filesystem ] Checksum valid, read task concluded successfully.")
                        if (!json.name) {
                            console.warn("[ Filesystem ] Name is missing from item!")
                            json.name = `Nimeämätön ${json.t === 0 ? "tiedosto" : "kansio"}`
                        }
                        resolve(json)
                    } else {
                        // TODO: Handle this better
                        reject(new Error("Failed to validate read data"))
                    }
                    break
                }
                default:
                    throw new Error("Unknown filesystem type")
                }
            } catch (e) {
                reject(new Error(`Failed to read: ${e.stack}`))
            }
        })
    }

    /**
     * Write data to the index
     * @param {*} id if true --> root
     * @param {*} data
     * @param {*} onlyUpdate Do not edit
     */
    async writeToIndex(
        id, data, onlyUpdate
    ) {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            // eslint-disable-next-line no-param-reassign
            if (id === undefined) id = true // Default is root
            console.log("[ Filesystem ] Preparing index update...")
            console.debug("[ Filesystem ] Index snapshot before update:", this.index)
            console.debug(
                "[ Filesystem] Index entry identifier:", id, "data:", data
            )

            // Do the things
            if (!onlyUpdate) {
                if (id === true) {
                    // In root
                    console.debug("[ Filesystem ] Writing to index root...")
                    let replaced = false
                    for (let entry of this.index) {
                        if (entry.i === data.id) {
                            replaced = true
                            entry = data
                            break
                        }
                    }
                    if (!replaced) this.index.push(data)
                } else {
                    // In folder
                    console.debug("[ Filesystem ] Writing to folder...")
                    let replaced = false
                    let pushed = false
                    // TODO: Rework this
                    // eslint-disable-next-line no-shadow
                    const find = (tree, id) => {
                        // eslint-disable-next-line no-plusplus
                        for (let i = 0; i < tree.length; i++) {
                            if (tree[i].t === 0 && tree[i].id === id) {
                                replaced = true
                                tree[i] = data
                            } else if (tree[i].t === 1) {
                                if (tree[i].i === id) {
                                    // Replace?
                                    // eslint-disable-next-line no-plusplus
                                    for (let ii = 0; ii < tree[i].d.length; ii++) {
                                        if (tree[i].d[ii].i === data.i) {
                                            replaced = true
                                            tree[i].d[ii] = data
                                        }
                                    }
                                    if (!replaced) {
                                        tree[i].d.push(data)
                                        pushed = true
                                    }
                                    break
                                } else {
                                    find(tree[i].d, id)
                                }
                            }
                        }
                    }
                    find(this.index, id)
                    if (!replaced && !pushed) reject(new Error("Cannot find such location"))
                }
            }
            const hashSession = new hash(this.index)
            const hashData = await hashSession.sha1()
            console.debug("[ Filesystem ] Index after update:", this.index)
            switch (this.type) {
            /**
                * -----------------------------------------------
                * Implement filesystem index update for each type here
                * -----------------------------------------------
                */
            case 0: {
                await localForage.setItem("matikkaeditori-checksums", JSON.stringify(hashData))
                await localForage.setItem("matikkaeditori-index", JSON.stringify(this.index))
                break
            }
            default:
                throw new Error("Unknown filesystem type")
            }
            console.log("[ Filesystem ] Index update completed successfully.")
            resolve()
        })
    }

    /**
     * Resolve a specific part of the index and return it
     * @param {*} id
     */
    async resolveFromIndex(id) {
        if (id === true) return this.index
        const looper = (tree) => {
            for (const entry of tree) {
                if (entry.i === id) return entry
                if (entry.t === 1) {
                    const l = looper(entry.d)
                    if (l !== null) return l
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
    async removeFromIndex(id) {
        if (id === true) return this.index
        const looper = (tree) => {
            for (const entry of tree) {
                if (entry.i === id) {
                    // Note: Do we need to edit this
                    tree.splice(tree.indexOf(entry), 1)
                    this.writeToIndex(
                        null, null, true
                    ).then(() => true)
                }
                if (entry.t === 1) {
                    const l = looper(entry.d)
                    if (l !== null) return l
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
    async limitTreeLevel(tree, level) {
        // Clone array
        const treeClone = JSON.parse(JSON.stringify(tree))
        const checker = (treeObject, currentLevel = 1) => {
            for (const entry of treeObject) {
                if (entry.t === 1) {
                    if (level > currentLevel) {
                        return checker(entry.d, currentLevel + 1)
                    }
                    entry.d = null
                }
            }
            return null
        }
        checker(treeClone)
        return treeClone
    }

    /**
     * Write data to the dump
     * @param {*} id
     * @param {*} data
     * @param {*} location
     */
    async write(
        id, data, location
    ) {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                switch (this.type) {
                /**
                     * -----------------------------------------------
                     * Implement filesystem writing for each type here
                     * -----------------------------------------------
                     */
                case 0: {
                    console.log("[ Filesystem ] Preparing write task...")
                    let json = JSON.parse(await localForage.getItem(id))
                    if (json === null) {
                        console.debug("[ Filesystem ] No previous entry found.")
                        json = {
                            id: id ?? uuid.v4() // Generate id if new object
                        }
                    }
                    const base = {
                        name: data.name ?? json.name,
                        date: data.date ?? new Date().getTime()
                    }

                    if (!base.name || base.name.trim().length === 0) {
                        reject(new Error("Invalid name provided!"))
                        break
                    }

                    reject("Write fail")
                    break

                    if (data.type === 0) {
                        // Files have data
                        base.data = data.data ?? json.data
                        const hashInstance = new hash(JSON.stringify({ name: base.name, data: base.data, date: base.date }))
                        const sha1 = await hashInstance.sha1()
                        base.checksum = sha1
                    } else {
                        // Folders have no data
                        const hashInstance = new hash(JSON.stringify({ name: base.name, date: base.date }))
                        const sha1 = await hashInstance.sha1()
                        base.checksum = sha1
                    }
                    console.debug("[ Filesystem ] Write task base:", base)
                    await localForage.setItem(id ?? json.id, JSON.stringify(base))
                    // Update index
                    const indexBase = { t: data.type ?? json.type, i: id ?? json.id }
                    // TODO: This has to be redone to support moving folders and their contents
                    const isInIndex = await this.resolveFromIndex(id ?? json.id)
                    if (!isInIndex) {
                        if (data.type === 1) {
                            indexBase.d = []
                        }
                        await this.writeToIndex(location, indexBase)
                    }
                    console.log("[ Filesystem ] Write task completed successfully.")
                    resolve(id ?? json.id)
                    break
                }
                default:
                    throw new Error("Unknown filesystem type")
                }
            } catch (e) {
                console.debug(new Error(`Failed to write: ${e.stack}`))
                reject(e.toString())
            }
        })
    }

    /**
     * Remove answer
     * @param {*} id
     */
    async remove(id) {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                switch (this.type) {
                /**
                     * -----------------------------------------------
                     * Implement filesystem deletion for each type here
                     * -----------------------------------------------
                     */
                case 0: {
                    console.log("[ Filesystem ] Preparing remove task...")
                    // Remove from database
                    if (await localForage.getItem(id) !== null) {
                        console.log(
                            "[ Filesystem ] Target", id, "exists"
                        )
                        await localForage.removeItem(id)
                    } else {
                        console.log("[ Filesystem ] Target not found")
                    }

                    // Remove from index
                    if (await this.resolveFromIndex(id) !== null) await this.removeFromIndex(id)

                    console.log("[ Filesystem ] Remove task concluded")
                    resolve(true)
                    break
                }
                default:
                    throw new Error("Unknown filesystem type")
                }
            } catch (e) {
                reject(new Error(`Failed to write: ${e.stack}`))
            }
        })
    }

    /**
     * Initialize the filesystem
     */
    async init() {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                switch (this.type) {
                /**
                     * ------------------------------------------------------
                     * Implement filesystem initialization for each type here
                     * ------------------------------------------------------
                     */
                case 0: {
                    let index = await localForage.getItem("matikkaeditori-index")
                    let checksums = await localForage.getItem("matikkaeditori-checksums")

                    if (index !== null && checksums !== null) {
                        index = JSON.parse(index)
                        checksums = JSON.parse(checksums)
                        const indexIsValid = await this.validate(index, checksums)
                        if (!indexIsValid) {
                            const load = await com.send("confirm", "Someone may have tampered with index data or it may be corrupt. Would you like to load it?")
                            if (!load) reject(new Error("Filesystem initialization aborted."))
                        }
                        this.index = index
                        resolve()
                    } else {
                        // const create = await com.send("confirm", "No save data exists or it cannot be loaded. Would you like to create a new save?")
                        // if(create){
                        // TODO: Create index & example file
                        const exampleId = uuid.v4()
                        const exampleFile = {
                            name: "Tervetuloa!",
                            date: new Date().getTime(),
                            // eslint-disable-next-line no-undef
                            // running btoa here fucks up charset äöå, so hardcoding the gibberish here
                            data: ["<text>VGVydmV0dWxvYSBrw6R5dHTDpG3DpMOkbiBNYXRpa2thZWRpdG9yaS5maXTDpCEg8J+OiQ==</text>"],
                            checksum: null,
                            type: 0
                        }
                        const hashSession = new hash({ name: exampleFile.name, data: exampleFile.data, date: exampleFile.date })
                        exampleFile.checksum = await hashSession.sha1()
                        await this.write(
                            exampleId, exampleFile, true
                        )
                        console.log("[ Filesystem ] Example file created")
                        resolve()
                    }
                    break
                }
                default:
                    throw new Error("Unknown filesystem type")
                }
            } catch (e) {
                reject(new Error(`Failed to initialize filesystem: \n${e.stack}`))
                console.debug(e)
            }
        })
    }
}

com.onMessage.addEventListener("message", async (e) => {
    // Detail is the event data
    // eslint-disable-next-line no-param-reassign
    e = e.detail
    if (!thisWorker.shared.ready) return
    switch (e.type) {
    case "init": {
        const instance = new Filesystem(e.content.type)
        // ID must be reused later
        thisWorker.shared.filesystem_instances[e.id] = instance
        await instance.init()
        com.send("callback", { id: e.id, instance: instance.id, index: instance.index })
        break
    }
    case "read": {
        const instance = thisWorker.shared.filesystem_instances[e.content.instance]
        if (!instance) {
            console.error("No such filesystem instance")
            break
        }
        const data = await instance.read(e.content.id)
        com.send("callback", { id: e.id, read: data })
        break
    }
    case "write": {
        const instance = thisWorker.shared.filesystem_instances[e.content.instance]
        if (!instance) {
            console.error("No such filesystem instance")
            break
        }
        instance.write(
            e.content.id, e.content.write, e.content.location
        )
            .then((write) => com.send("callback", { id: e.id, write }))
            .catch((error) => com.send("callback", { id: e.id, error }))
        break
    }
    case "callback": {
        // Ignore these. (Handled by com.js)
        break
    }
    case "remove": {
        const instance = thisWorker.shared.filesystem_instances[e.content.instance]
        if (!instance) {
            console.error("No such filesystem instance")
            break
        }
        await instance.remove(e.content.id)
        com.send("callback", { id: e.id })
        break
    }
    case "move": {
        const instance = thisWorker.shared.filesystem_instances[e.content.instance]
        if (!instance) {
            console.error("No such filesystem instance")
            break
        }
        const currentLocation = e.content.from
        const newLocation = e.content.to
        // TODO: read from index & remove & write
        const oldData = await instance.resolveFromIndex(currentLocation)
        if (!oldData) {
            console.error("No such location (read)")
            break
        }
        await instance.removeFromIndex(e.content.id)
        if (newLocation !== true) {
            const newLocationExists = await instance.resolveFromIndex(newLocation)
            if (!newLocationExists) {
                console.error("No such location (write)")
                break
            }
        }
        await instance.writeToIndex(newLocation, oldData)
        break
    }
    case "index": {
        const instance = thisWorker.shared.filesystem_instances[e.content.instance]
        if (!instance) {
            console.error("No such filesystem instance")
            break
        }
        if (e.content.id && e.content.level) {
            const resolved = await instance.resolveFromIndex(e.content.id)
            let limited = null
            if (resolved !== null) {
                limited = await instance.limitTreeLevel(e.content.id === true ? resolved : resolved.d, e.content.level)
            }
            com.send("callback", { index: limited, id: e.id })
        } else {
            com.send("callback", { index: instance.index, id: e.id })
        }
        break
    }
    case "reset": {
        await localForage.clear()
        com.send("callback", { id: e.id, status: "ok" })
        break
    }
    default:
        console.error("[ Filesystem ] Unknown command", e)
    }
})
