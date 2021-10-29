// Libs
import React from "react"
import ReactDOM from "react-dom"
import * as uuid from "./worker-components/uuid.js"
import * as workers from "./workers.js"
import Utils from "./editor/utils.js"

// Sync reader
const syncIterator = async function (ar, handler, mode) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
        if(mode === "of"){
            for(const item of ar){
                const doBreak = await new Promise((resolve) => {
                    handler(item, resolve)
                })
                if(doBreak) break
            }
        }else {
            for(const item in ar){
                const doBreak = await new Promise((resolve) => {
                    handler(item, resolve)
                })
                if(doBreak) break
            }
        }
        resolve()
    })
}

/**
 * --------------------------------------------
 * Upgrade older save version to newer versions
 * --------------------------------------------
 */
export default {
    // Process to upgrade the legacy version to beta
    "legacy": async function () {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async () => {
            ReactDOM.render(
                <React.StrictMode>
                    <p><b>Upgrading legacy save data.<br></br>If the page freezes, contact eemil@testausserveri.fi or Esinko#7976 on Discord.</b></p>
                    <p id="progress">...</p>
                </React.StrictMode>,
                document.getElementById("root")
            )
            
            // Initialize the filesystem partially
            await workers.createWorker("Filesystem")
            const instance = await window.internal.workers.api("Filesystem", "init", { type: 0 })
            document.getElementById("progress").innerHTML += "<br>> Filesystem ready for upgrade."
            
            try {
                const raw = localStorage.getItem("data").split("")
                // Remove " from start and end
                if (raw[0] === "\"") raw[0] = ""
                if(raw[raw.length - 1] === "\"") raw[raw.length - 1] = ""

                const data = JSON.parse(raw.join(""))
                document.getElementById("progress").innerHTML += "<br>> Discovered " + Object.keys(data).length + " item(s). Upgrading legacy save data..."

                await syncIterator(data, async (id, resolve_) => {
                    // Get metadata
                    const newId = uuid.v4()
                    const saveData = data[id]
                    const date = saveData.date
                    const formattedDate = new Date(date)
                    let answer = saveData.answer
                    let title = saveData.answer.split("<div>")[0].split("<br>")[0].replace(/&nbsp;/g, " ").trim()
                    if(title.length === 0) title = "Unnamed"

                    // Get data
                    const parser = new DOMParser()
                    const html = parser.parseFromString("<body><div>" + answer + "<div></body>", "text/html")
                    const format = async () => {
                        await syncIterator(html.body.children[0].children, async (line, resolve__) => {
                            if(line.className.includes("math-editor")) {
                                resolve__()
                                return
                            }
                            // Make sure this is not math
                            if(line.tagName.toLowerCase() === "img"){
                                const math = document.createElement("a")
                                console.log("F", line)
                                math.setAttribute("data", btoa(line.getAttribute("alt") !== null && line.getAttribute("alt").length !== 0 ? line.getAttribute("alt") : "Unset"))
                                const nLine = document.createElement("div")
                                nLine.appendChild(math)
                                line.after(nLine)
                                line.remove()
                                resolve__()
                                return
                            }
                            await syncIterator(line.children, async (child, resolve___) => {
                                if(child.tagName.toLowerCase() === "img"){
                                    const math = document.createElement("a")
                                    math.setAttribute("data", btoa(child.getAttribute("alt") !== null && child.getAttribute("alt").length !== 0 ? child.getAttribute("alt") : "Unset"))
                                    child.after(math)
                                    child.remove()              
                                    resolve___()
                                }else {
                                    resolve___()                                
                                }
                            }, "of")
                            resolve__()
                        }, "of")
                        try {
                            return Utils.toEmbedded(html.body.children[0])
                        }
                        catch(e){
                            return await format()
                        }
                    }
                    const embedded = await format()
    
                    document.getElementById("progress").innerHTML += "<br>&nbsp;&nbsp;&nbsp;&nbsp;> \"" + title + "\" (" +  id + ") -> " + newId + ", " + date + " -> " + formattedDate.getTime()
                    await window.internal.workers.api("Filesystem", "write", {
                        instance: instance.instance,
                        id: newId,
                        write: {
                            name: title,
                            type: 0,
                            data: embedded,
                            date: formattedDate.getTime()
                        },
                        location: true
                    })
                    resolve_()
                }, "in")
                document.getElementById("progress").innerHTML += "<br>&nbsp;> Done."
            }
            catch(err){
                console.error(err)
                document.getElementById("progress").innerHTML += "<br>&nbsp;Upgrade failed. More details in the browser console"
                return
            }
            document.getElementById("progress").innerHTML += "<br>&nbsp;Reloading in..."
            let count = 6
            setInterval(() => {
                --count
                document.getElementById("progress").innerHTML += "<br>&nbsp;" + count
                if(count === 0){
                    // Just keep this around...
                    localStorage.setItem("version", window.internal.version)
                    window.location.reload()
                }
            }, 1000)
        })
    },
    // Process to upgrade the beta version to latest
    "beta": async function () {
        // Nothing to convert
        alert("Beta conversion is not yet implemented.")
        window.location.reload()
    },
    "3.0.0": async function () {
        // Convert from legacy
        alert("You cannot yet use v3 with legacy saves.")
        window.location.reload()
    }
}