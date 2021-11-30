/*globals MathQuill, MathJax */
// Todo: Move from worker components to here
import * as uuid from "./uuid.js"
import Utils from "./utils.js"
import Input from "./input.js"

// Assets
import errorIcon from "./error.svg"

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
 * @property {[]} flags List of temporary flags
 */
/**
 * @typedef {{MathElement}} MathElementList List of math elements 
 */

/**
 * Editor math utilities (wrapper for MathQuill)
 */
const Math = {
    events: new EventTarget(),
    cache: {}, // Cached editor elements
    domCache: document.createElement("interfaceCache"),
    /**
     * @type {MathElementList}
     */
    collection: {},

    /**
     * Create a new math element
     * @returns {MathElement}
     */
    create(){
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
        this.collection[obj.id] = obj

        // Create HTML elements
        //  container: Parent of all elements
        //  inputElement: Reference to the raw element
        //  image: Reference to the image stand-in for the input when it's closed
        Object.assign(obj, Input())

        // Initialize MathQuill
        const mathQuillInterface = MathQuill.getInterface(2)
        obj.dynamicInterface = mathQuillInterface.MathField(obj.dynamicInput, {
            // MathQuill configuration
            spaceBehavesLikeTab: false,
            handlers: {
                edit: async () => {
                    if(obj.flags.includes("ignoreInputDynamic")){
                        obj.flags.splice(obj.flags.indexOf("ignoreInputDynamic"), 1)
                        return
                    }
                    if(obj.data !== obj.dynamicInterface.latex()) this.write(obj.id, obj.dynamicInterface.latex(), "dynamic")
                    obj.dynamicInterface.focus()
                },
                moveOutOf: async direction => {
                    this.events.dispatchEvent(new CustomEvent("moveOut", { detail: obj }))
                    this.close(obj.id)
                    const line = Utils.getParentLine(obj.container)
                    let outsideNodeIndex = Utils.getNodeIndex(line, obj.container)
                    if(direction > 0) outsideNodeIndex += 1
                    if(line.childNodes[line.childNodes.length - 1] === obj.container) {
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
            /*if(obj.flags.includes("ignoreInputLatex")){
                obj.flags.splice(obj.flags.indexOf("ignoreInputLatex"), 1)
                //return
            }*/
            if(obj.latexInput.value !== obj.data) this.write(obj.id, obj.latexInput.value, "latex")
        }

        // Listen for close events
        obj.dynamicInput.children[0].children[0].onblur = async () => { // Not a listener -> Not a memory leak.
            if(obj.isOpen && !Utils.wasParentClicked(obj.container)) this.close(obj.id)
        }
        obj.latexInput.onblur = async () => { // Not a listener -> Not a memory leak.
            if(obj.isOpen && !Utils.wasParentClicked(obj.container)) this.close(obj.id)
        }

        // Finalize
        //obj.image.setAttribute("onclick", "window.internal.ui.editor.local.Math.open(\"" + obj.id + "\")")
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
    open(id){
        const obj = this.collection[id]
        if(obj.isOpen) return

        // Open the element
        // TODO: Refactor this
        if(obj.isOpen === null){
            // Never opened or closed before, element is ready
            obj.container.style.display = ""
            obj.container.className = "inputContainer open"
            obj.container.removeAttribute("style")
            obj.image.removeAttribute("style")
            obj.isOpen = true
            // MathQuill weirdness
            obj.dynamicInterface.focus()
            obj.dynamicInterface.reflow()
        }else {
            obj.container.removeAttribute("style")
            obj.image.removeAttribute("style")
            // Get elements from cache
            if(this.cache[id] !== undefined){
                while(obj.container.firstChild) {
                    obj.container.lastChild.remove()
                    if(!obj.container.firstChild) break
                }
                for(const child of this.cache[id]) obj.container.appendChild(child)
                obj.isOpen = true
                obj.container.className = "inputContainer open"
                // Set values
                obj.flags.push("ignoreInputDynamic")
                obj.dynamicInterface.latex(obj.data)
                obj.latexInterface.latex(obj.data)
                // MathQuill weirdness
                obj.dynamicInterface.focus()
                obj.dynamicInterface.reflow()
            }else {
                throw "Cache miss"
            }
        }
        
        // Todo: This should not live in here. This component is dynamic.
        if(window.setLatexCommandsVisibility) window.setLatexCommandsVisibility(true)
        this.events.dispatchEvent(new CustomEvent("focus", { detail: obj }))
        return
    },

    /**
     * Remove a math element
     * @param {string} id 
     * @returns {void}
     */
    remove(id){
        const obj = this.collection[id]
        if(obj === undefined) throw "Math element \"" + id + "\" does not exist"
        // Remove all children
        for(const child of obj.container.childNodes) child.remove()
        // Remove from memory
        delete this.collection[id]
        this.events.dispatchEvent(new CustomEvent("remove", { detail: id })) // Future-proofing
        return
    },

    /**
     * Write data to a math element
     * @param {string} id 
     * @param {string} data
     * @param {string} from
     */
    write(id, data, from){
        if(!this.collection[id]) throw "Math element \"" + id + "\" does not exist"
        const obj = this.collection[id]
        if(!obj.writable) return
        if(from === undefined) from = ""

        obj.data = data
        obj.container.setAttribute("math", btoa(data))

        // Fix: Pop stuff in the cache
        const placeholder = document.createElement("span")
        obj.dynamicInput.after(placeholder)
        this.domCache.appendChild(obj.dynamicInput)

        // Write the actual data, finally
        if(from !== "dynamic"){
            obj.flags.push("ignoreInputDynamic")
            obj.dynamicInterface.latex(data)
            obj.dynamicInterface.reflow()
        }
        if(from !== "latex") {
            //obj.flags.push("ignoreInputLatex")
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
    close(id){
        const obj = this.collection[id]
        if(obj === undefined) throw "Math element \"" + id + "\" does not exist"
        if(!obj.isOpen) return

        // Close the element
        obj.isOpen = false
        obj.container.className = "inputContainer closed"
        obj.container.removeAttribute("style")
        obj.image.removeAttribute("style")

        // Remove if empty
        let removed = false
        if(obj.data === ""){
            this.remove(id)
            removed = true
        }else {
            // Invalid latex?
            if(obj.dynamicInterface.latex() !== obj.data) {
                // Add error icon
                obj.image.src = `${errorIcon}`
                // TODO: Move to css
                obj.image.style.display = "inline"
                obj.image.style.width = "20px"
                // Remove every element from container
                this.cache[id] = []
                for(const child of obj.container.children) this.cache[id].push(child)
                while(obj.container.firstChild) {
                    obj.container.lastChild.remove()
                    if(!obj.container.firstChild) break
                }

                // Add image
                obj.container.appendChild(obj.image)
            }else {
                // Render latex in the form of an SVG
                // Handle umlauts
                let formattedData = obj.data
                formattedData = formattedData.replace(/ö/g, "\\ddot{o}")
                formattedData = formattedData.replace(/ä/g, "\\ddot{a}")
                formattedData = formattedData.replace(/å/g, "\\mathring{a}")

                const render = MathJax.tex2svg(formattedData, { em: 10, ex: 5, display: true })
                // Todo: Elements not removed -> Is the memory still freed?
                const svg = render.getElementsByTagName("svg")[0].outerHTML

                // Display rendered svg
                obj.image.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)))

                // Remove every element from container
                this.cache[id] = []
                for(const child of obj.container.children) this.cache[id].push(child)
                while(obj.container.firstChild) {
                    obj.container.lastChild.remove()
                    if(!obj.container.firstChild) break
                }

                // Add image
                obj.container.appendChild(obj.image)
            }
            // Todo: This should not live in here. This component is dynamic.
            if(window.setLatexCommandsVisibility) window.setLatexCommandsVisibility(false)
        }
        this.events.dispatchEvent(new CustomEvent("blur", { detail: obj }))
        if(removed) delete this.collection[id]
        obj.container.setAttribute("math", btoa(obj.data))
        return
    },

    /**
     * Flush math related memory
     * @returns {void}
     */
    flush(){
        this.cache = {}
        for(const id in this.collection){
            this.remove(id)
        }
        delete this.collection
        this.domCache.innerHTML = ""
        this.collection = {}
        return
    },

    init(){
        // This needs to exist for now, as mathquill needs to do some svg calculations.
        // Without this the elements won't have the appropriate prototypes
        // A cleaner solution will be explored when I decide to have time for that :p
        Math.domCache.style.display = "none"
        document.body.appendChild(Math.domCache)

        // Listener to open stuff
        window.addEventListener("click", async e => {
            const id = e.target.getAttribute("math-id") ?? e.target.parentElement.getAttribute("math-id")
            if(id && !this.collection[id].isOpen){
                this.open(id)
            }
            // Close all open math
            let closeThese = []
            for(const _id in this.collection){
                if(_id === id) continue
                console.log(this.collection[_id].isOpen, await Utils.wasParentClicked(this.collection[_id].container))
                if(this.collection[_id].isOpen && await Utils.wasParentClicked(this.collection[_id].container)) {
                    continue // Clicks to math UI
                }
                if(this.collection[_id].isOpen) closeThese.push(_id)
            }
            for(const id of closeThese){
                this.close(id)
            }
        })
    }
}

export default Math