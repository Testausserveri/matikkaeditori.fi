/* eslint-disable no-continue */
/* eslint-disable no-console */
/**
 * Upgrade utility to convert old saves to new saves
 * By: @Esinko (1.11.2021)
 */

// Dependencies
import React from "react"
import ReactDOM from "react-dom"
import * as uuid from "./worker-components/uuid"
import * as workers from "./workers"
import Utils from "./editor/utils"

let timeSinceRender = null

/**
 * Render a simple text based UI
 * @param {string} version
 */
async function ui(version) {
    timeSinceRender = new Date().getTime()
    ReactDOM.render(<React.StrictMode>
        <div id="main" style={{
            padding: "50px", height: "100%", width: "100%", overflow: "hidden"
        }}>
            <div style={{ position: "fixed", background: "#edf9ff", height: "40%" }}>
                <h1>
                        Päivitetään &quot;{version}&quot; tallennetta...
                </h1>
                <h3>
                        Jos sivu jäätyy tai saat virheilmoituksen, ota yhteyttä <b>eemil@testausserveri.fi</b> tai Discordissa <b>Esinko#7976</b>
                </h3>
                <p>
                    <i>
                            Upgrading &quot;{version}&quot; save data!
                        <br></br>
                            If the page freezes, contact eemil@testausserveri.fi or Esinko#7976 on Discord.
                    </i>
                </p>
            </div>
            <div style={{
                position: "absolute", top: "40%", marginTop: "10px", height: "40%", width: "80%", overflowY: "scroll", scrollPaddingBottom: "100%", scrollSnapType: "y mandatory", overflowX: "hidden", scrollBehavior: "smooth"
            }}>
                <p id="progress" style={{ scrollPaddingBottom: "100%", scrollSnapType: "y mandatory" }}></p>
            </div>
        </div>
    </React.StrictMode>,
    document.getElementById("root"))
    document.getElementById("main").parentElement.style.overflowX = "hidden"
}

/**
 * Push a new message to the progress log
 * @param {string} message
 * @param {boolean} noNewLine
 * @param {boolean} noPrefix
 * @param {string} safe
 */
async function updateProgress(
    message, noNewLine, noPrefix, safe
) {
    const prefix = `[ <a style="color: limegreen;">${((new Date().getTime() - timeSinceRender) / 1000).toFixed(3)} s</a> ]`
    const safeMessage = safe ? message.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;") : message
    document.getElementById("progress").innerHTML += (noNewLine ? "" : "<br>") + (noPrefix ? "" : `${prefix} `) + safeMessage
    document.getElementById("progress").parentElement.scrollTop = document.getElementById("progress").parentElement.scrollHeight
}

function format(html) {
    // Group orphan elements in line 0
    const newLines = [[]]
    for (const element of html.body.children[0].childNodes) {
        if (element.nodeName.toLowerCase() !== "div") {
            if (element.nodeName.toLowerCase() === "br") newLines.push([])
            newLines[newLines.length - 1 < 0 ? 0 : newLines.length - 1].push(element)
        }
    }
    for (const line of newLines.reverse()) {
        const lineElement = document.createElement("div")
        lineElement.append(...line)
        html.body.children[0].children[0].before(lineElement)
    }
    for (const line of html.body.children[0].children) {
        if (line.className.includes("math-editor")) {
            // Broken math element, cannot be converted
            continue
        }
        // Ignore hidden elements
        if (line.style.display === "none") continue

        // Handle possible math / image in line structure (bug in legacy editor)
        if (line.tagName.toLowerCase() === "img") {
            if (line.hasAttribute("style")) {
                // Math
                const math = document.createElement("math")
                math.setAttribute("data", btoa(line.getAttribute("alt") !== null && line.getAttribute("alt").length !== 0 ? line.getAttribute("alt") : "Unset"))
                const nLine = document.createElement("div")
                nLine.appendChild(math)
                line.after(nLine)
                line.remove()
            } else {
                // Image
                const nLine = document.createElement("div")
                line.after(nLine)
                nLine.appendChild(line)
            }
        }

        // Handle line elements
        for (const child of line.children) {
            if (line.style.display === "none") continue
            if (child.tagName.toLowerCase() === "img" && child.hasAttribute("style")) {
                // Math
                const math = document.createElement("math")
                math.setAttribute("math", btoa(child.getAttribute("alt") !== null && child.getAttribute("alt").length !== 0 ? child.getAttribute("alt") : "Unset"))
                child.after(math)
                child.remove()
            }
            if (child.tagName.toLowerCase() === "#text") {
                // Decode text
                child.textContent = new DOMParser().parseFromString(child.textContent, "text/html")?.documentElement?.textContent ?? ""
                // Trim text
                child.textContent = child.textContent.trimRight()
            }
        }
    }
    try {
        const embed = Utils.toEmbedded(html.body.children[0])
        // eslint-disable-next-line consistent-return
        return embed
    } catch (e) {
        // Keep formatting
        updateProgress(
            "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Yritetään uudelleen...", false, true
        )
        console.error(e)
        // eslint-disable-next-line consistent-return
        return format()
    }
}

/**
 * --------------------------------------------
 * Upgrade older save version to newer versions
 * --------------------------------------------
 */
export default {
    // Process to upgrade legacy version to current latest
    async legacy() {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve) => {
            ui("legacy")
            updateProgress("Käynnistetään tiedostojärjestelmää...", true)

            // Initialize the filesystem partially
            await workers.createWorker("Filesystem")
            const instance = await window.internal.workers.api(
                "Filesystem", "init", { type: 0 }
            )
            updateProgress("<b>Onnistui!</b>")

            updateProgress("Luetaan vanha tallenne...")
            if (!localStorage.getItem("data")) {
                updateProgress("Vanhaa tallennetta ei löydetty.")
            } else {
                try {
                    // Get old save data
                    const raw = localStorage.getItem("data").split("")
                    if (raw[0] === "\"") raw.splice(0, 1)
                    if (raw[raw.length - 1] === "\"") raw.pop()
                    const data = JSON.parse(raw.join(""))
                    updateProgress("<b>Onnistui!</b>")
                    updateProgress(`Löydettiin ${Object.keys(data).length} tallenne(tta). Päivitetään...`)

                    // Format function

                    for await (const id of Object.keys(data)) {
                        // Get metadata
                        const newId = uuid.v4()
                        const saveData = data[id]
                        const { date } = saveData
                        const formattedDate = new Date(date)
                        let title = saveData.answer.split("<div>")[0].split("<br>")[0].replace(/&nbsp;/g, " ").trim()
                        if (title.length === 0) title = "Unnamed"

                        // Get data
                        const parser = new DOMParser()
                        const html = parser.parseFromString(`<body><div>${saveData.answer}<div></body>`, "text/html")
                        updateProgress(
                            `&nbsp;&nbsp;&nbsp;&nbsp;> (${id}) -> ${newId}`, undefined, undefined
                        )
                        const embedded = format(html)
                        updateProgress(
                            " <b>Luettu.</b>", true, true
                        )

                        // Save to the new filesystem
                        await window.internal.workers.api(
                            "Filesystem", "write", {
                                instance: instance.instance,
                                id: newId,
                                write: {
                                    name: title,
                                    type: 0,
                                    data: embedded,
                                    date: formattedDate.getTime()
                                },
                                location: true
                            }
                        )
                        updateProgress(
                            " <b>Päivitetty.</b>", true, true
                        )
                    }
                } catch (e) {
                    console.log("%cAlku ----------------------------", "color: #d42c2c; font-size: 33px; font-family: Inconsolata, monospace; font-weight: bold;")
                    console.error(e)
                    console.trace("Trace")
                    console.log("%cLoppu ----------------------------", "color: #d42c2c; font-size: 33px; font-family: Inconsolata, monospace; font-weight: bold;")
                    updateProgress("Päivitys epäonnistui. Lisätietoja:")
                    updateProgress(
                        `<h3 style="color: red;">${e.message}</h3>`, false, true
                    )
                    updateProgress(
                        `<p style="color: darkred; margin-top: -30px;">${e.stack}</p>`, false, true
                    )
                    return
                }
            }

            // Refresh and update version field
            localStorage.setItem("version", window.internal.version)
            updateProgress("Päivitys valmis. Käynnistetään editori...")
            let count = 6
            const counter = setInterval(() => {
                count -= 1
                if (count === 0) {
                    updateProgress(
                        "Nyt!", false, true
                    )
                    clearInterval(counter)
                    resolve()
                } else {
                    updateProgress(
                        count, false, true
                    )
                }
            }, 1000)
        })
    }
}
