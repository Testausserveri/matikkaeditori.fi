/* eslint-disable new-cap */
/* globals MathQuill, MathJax */
// Todo: Move from worker components to here
import * as uuid from "./uuid"
// TODO: This should be fixed?
// eslint-disable-next-line import/no-cycle
import Utils from "./utils"
import input from "./input"

// Assets
import errorIcon from "./error.svg"
import specialChars from "./specialChars"

/**
 * @typedef MathElement Matikkaeditori math element
 * @property {HTMLElement} container The main element (container) of the math element
 * @property {*} dynamicInterface Latex input interface (MathQuill)
 * @property {HTMLElement} dynamicInput The math input element
 * @property {HTMLElement} latexInput The math input element
 * @property {HTMLElement} latexInterface Latex input interface (RAW)
 * @property {*} image Image element of rendered latex
 * @property {boolean} isOpen Is the math element open?
 * @property {string} data Element data
 * @property {string} id Math element's id
 * @property {HTMLElement[]} labels Math element's selection labels
 * @property {HTMLElement} infoElement Info element, text
 * @property {[]} flags List of temporary flags
 */

/**
 * Editor math utilities (wrapper for MathQuill)
 */
const Math = {
    events: new EventTarget(),
    cache: {}, // Cached editor elements
    domCache: document.createElement("interfaceCache"),
    /**
     * @type {Object.<string, MathElement>}
     */
    collection: {},

    /**
     * Create a new math element
     * @returns {MathElement}
     */
    create() {
        // Create construct
        /**
         * @type {MathElement}
         */
        const obj = {
            image: document.createElement("img"),
            isOpen: null,
            writable: true,
            id: uuid.v4(),
            data: "",
            flags: []
        }
        obj.image.setAttribute("draggable", "false")
        this.collection[obj.id] = obj

        // Create HTML elements
        //  container: Parent of all elements
        //  inputElement: Reference to the raw element
        //  image: Reference to the image stand-in for the input when it's closed
        Object.assign(obj, input())

        // Initialize MathQuill
        const mathQuillInterface = MathQuill.getInterface(2)
        obj.dynamicInterface = mathQuillInterface.MathField(obj.dynamicInput, {
            // MathQuill configuration
            spaceBehavesLikeTab: false,
            handlers: {
                edit: async () => {
                    if (obj.flags.includes("ignoreInputDynamic")) {
                        obj.flags.splice(obj.flags.indexOf("ignoreInputDynamic"), 1)
                        return
                    }
                    if (obj.flags.includes("disableInputDynamic")) return
                    if (obj.data !== obj.dynamicInterface.latex()) {
                        this.write(
                            obj.id, obj.dynamicInterface.latex(), "dynamic"
                        )
                    }
                    obj.dynamicInterface.focus()
                },
                moveOutOf: async (direction) => {
                    this.events.dispatchEvent(new CustomEvent("moveOut", { detail: obj }))
                    this.close(obj.id)
                    const line = Utils.getParentLine(obj.container)
                    let outsideNodeIndex = Utils.getNodeIndex(line, obj.container)
                    if (direction > 0) outsideNodeIndex += 1
                    if (line.childNodes[line.childNodes.length - 1] === obj.container) {
                        obj.container.after(document.createElement("br"))
                    }
                    Utils.select(line, outsideNodeIndex)
                }
            }
        })

        // Initialize raw input
        // TODO: Move out with arrow keys for raw stuff...?
        obj.latexInput.oninput = async () => {
            // No skipping needed
            /* if(obj.flags.includes("ignoreInputLatex")){
                obj.flags.splice(obj.flags.indexOf("ignoreInputLatex"), 1)
                //return
            } */
            if (obj.latexInput.value !== obj.data) {
                this.write(
                    obj.id, obj.latexInput.value, "latex"
                )
            }
        }

        // Listen for close events
        /* obj.dynamicInput.children[0].children[0].onblur = async () => { // Not a listener -> Not a memory leak.
            if(obj.isOpen && !Utils.wasParentClicked(obj.container)) this.close(obj.id)
        }
        obj.latexInput.onblur = async () => { // Not a listener -> Not a memory leak.
            if(obj.isOpen && !Utils.wasParentClicked(obj.container)) this.close(obj.id)
        } */

        // Finalize
        // obj.image.setAttribute("onclick", "window.internal.ui.editor.local.Math.open(\"" + obj.id + "\")")
        obj.container.setAttribute("math", "") // TODO: This change has to be propagated
        obj.container.setAttribute("math-id", obj.id)
        obj.container.style.display = "none"
        return obj
    },

    /**
     * Open a math element
     * @param {string} id
     * @returns {void}
     */
    open(id) {
        const obj = this.collection[id]
        if (obj.isOpen) return

        // obj.container.contentEditable = false

        // Open the element
        // TODO: Refactor this
        if (obj.isOpen === null) {
            // Never opened or closed before, element is ready
            obj.container.style.display = ""
            obj.container.className = "inputContainer open"
            obj.container.removeAttribute("style")
            obj.image.removeAttribute("style")
            obj.isOpen = true
        } else {
            obj.container.removeAttribute("style")
            obj.image.removeAttribute("style")

            // Get elements from cache
            if (this.cache[id] !== undefined) {
                while (obj.container.firstChild) {
                    obj.container.lastChild.remove()
                    if (!obj.container.firstChild) break
                }
                for (const child of this.cache[id]) obj.container.appendChild(child)
                obj.isOpen = true
                obj.container.className = "inputContainer open"

                // Set values
                obj.flags.push("ignoreInputDynamic")
                obj.dynamicInterface.latex(obj.data)
                obj.latexInterface.latex(obj.data)
            } else {
                throw new Error("Cache miss")
            }
        }

        if (obj.flags.includes("disableInputDynamic")) obj.labels[0].click() // Forces the raw latex view to open

        // NOTE: Mathquill requires a single frame (at least) to get ready
        requestAnimationFrame(() => {
            // MathQuill weirdness
            obj.dynamicInterface.focus()
            obj.dynamicInterface.reflow()

            // Todo: This should not live in here. This component is dynamic.
            if (window.setLatexCommandsVisibility) window.setLatexCommandsVisibility(true)
            this.events.dispatchEvent(new CustomEvent("focus", { detail: obj }))
        })
    },

    /**
     * Remove a math element
     * @param {string} id
     * @returns {void}
     */
    remove(id) {
        const obj = this.collection[id]
        if (obj === undefined) throw new Error(`Math element "${id}" does not exist`)
        // Remove the container
        obj.container.remove()
        // Remove from memory
        delete this.collection[id]
        this.events.dispatchEvent(new CustomEvent("remove", { detail: id })) // Future-proofing
    },

    /**
     * Write data to a math element
     * @param {string} id
     * @param {string} data
     * @param {string} from
     */
    write(
        id, data, from = ""
    ) {
        if (!this.collection[id]) throw new Error(`Math element "${id}" does not exist`)
        const obj = this.collection[id]
        if (!obj.writable) return

        obj.data = data
        obj.container.setAttribute("math", btoa(data))

        // Fix: Pop stuff in the cache
        const placeholder = document.createElement("span")
        obj.dynamicInput.after(placeholder)
        this.domCache.appendChild(obj.dynamicInput)

        // Write the actual data, finally
        if (from !== "dynamic") {
            obj.flags.push("ignoreInputDynamic")
            obj.dynamicInterface.latex(data)
            obj.dynamicInterface.reflow()
            if (obj.dynamicInterface.latex() !== data) {
                if (obj.flags.includes("disableInputDynamic")) return
                obj.dynamicInput.style.pointerEvents = "none"
                obj.dynamicInput.style.userSelect = "none"
                obj.infoElement.innerText = "LaTex syntax error"
                obj.flags.push("disableInputDynamic")
            } else {
                obj.dynamicInput.style.pointerEvents = ""
                obj.dynamicInput.style.userSelect = ""
                obj.infoElement.innerText = ""
                if (obj.flags.includes("disableInputDynamic")) obj.flags.splice(obj.flags.indexOf("disableInputDynamic"), 1)
            }
        }
        if (from !== "latex") {
            // obj.flags.push("ignoreInputLatex")
            obj.latexInterface.latex(data)
        }

        // Pop-out of cache
        placeholder.before(obj.dynamicInput)
        placeholder.remove()
    },

    /**
     * Close a math element
     * @param {string} id
     * @returns {void}
     */
    async close(id) {
        const obj = this.collection[id]
        if (obj === undefined) throw new Error(`Math element "${id}" does not exist`)
        if (!obj.isOpen) return

        // Close the element
        obj.isOpen = false
        obj.container.className = "inputContainer closed"
        obj.container.removeAttribute("style")
        obj.image.removeAttribute("style")

        // Invalid latex?
        if (obj.dynamicInterface.latex() !== obj.data) {
            // Add error icon
            obj.image.src = `${errorIcon}`
            // TODO: Move to css
            obj.image.style.display = "inline"
            obj.image.style.width = "20px"
            // Remove every element from container
            this.cache[id] = []
            for (const child of obj.container.children) this.cache[id].push(child)
            while (obj.container.firstChild) {
                obj.container.lastChild.remove()
                if (!obj.container.firstChild) break
            }

            // Add image
            obj.container.appendChild(obj.image)
        } else {
            // Render latex in the form of an SVG

            // Handle umlauts
            let formattedData = obj.data
            formattedData = formattedData.replace(/ö/g, "\\ddot{o}")
            formattedData = formattedData.replace(/ä/g, "\\ddot{a}")
            formattedData = formattedData.replace(/å/g, "\\mathring{a}")

            // Handle some specific units
            formattedData = formattedData.replace(/€/g, "\\unicode{0x20AC}") // €

            // Handle special chars
            for (const char of specialChars[0].characters) {
                formattedData = formattedData.split(char.character).join(char.latexCommand)
            }

            const initialOptions = MathJax.getMetricsFor(obj.latexInput)

            const render = await MathJax.tex2svgPromise(formattedData, initialOptions)

            // Todo: Elements not removed -> Is the memory still freed?
            const svg = render.getElementsByTagName("svg")[0].outerHTML

            // Display rendered svg
            obj.image.src = `data:image/svg+xml;base64,${btoa(unescape(svg))}`

            // Remove every element from container
            this.cache[id] = []
            for (const child of obj.container.children) this.cache[id].push(child)
            while (obj.container.firstChild) {
                obj.container.lastChild.remove()
                if (!obj.container.firstChild) break
            }

            // Add image
            obj.container.appendChild(obj.image)
        }
        // Todo: This should not live in here. This component is dynamic.
        if (window.setLatexCommandsVisibility) window.setLatexCommandsVisibility(false)

        // Remove if empty
        if (obj.data.length === 0) {
            this.events.dispatchEvent(new CustomEvent("blur", { detail: obj }))
            Utils.waitForEvent(this.events, "blur").then(() => {
                this.remove(id)
            })
        }

        // obj.container.contentEditable = true
        this.events.dispatchEvent(new CustomEvent("blur", { detail: obj }))
        obj.container.setAttribute("math", btoa(obj.data))
    },

    /**
     * Flush math related memory
     * @returns {void}
     */
    flush() {
        this.cache = {}
        for (const id of Object.keys(this.collection)) {
            this.remove(id)
        }
        delete this.collection
        this.domCache.innerHTML = ""
        this.collection = {}
    },

    init() {
        // This needs to exist for now, as MathQuill needs to do some svg calculations.
        // Without this the elements won't have the appropriate prototypes
        // A cleaner solution will be explored when I decide to have time for that :p
        Math.domCache.style.display = "none"
        document.body.appendChild(Math.domCache)

        // Listener to open stuff
        window.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("math-id") ?? e.target.parentElement.getAttribute("math-id")
            if (id && this.collection[id] && !this.collection[id].isOpen) {
                this.open(id)
            }
        })

        // Listener to close stuff
        window.addEventListener("mousedown", async (e) => {
            // Don't hide for symbol clicks
            if (e.target?.parentElement?.className === "symbols" || e.target?.parentElement?.parentElement?.className === "symbols") return
            const id = e.target.getAttribute("math-id") ?? e.target.parentElement.getAttribute("math-id")
            // Close all open math
            const closeThese = Object.keys(this.collection)
                .filter((_id) => _id !== id)
                // eslint-disable-next-line no-underscore-dangle
                .filter((_id) => this.collection[_id].isOpen)
                // eslint-disable-next-line no-underscore-dangle
                .filter((_id) => !Utils.isSomeParent(e.target, this.collection[_id].container))
            closeThese.forEach((_id) => this.close(_id))
        })
    }
}

export default Math
