/*globals MathQuill, MathJax */
// Todo: Move from worker components to here
import * as uuid from "./uuid.js"
import Utils from "./utils.js"
/**
 * Editor math utilities (wrapper for MathQuill)
 */
const Math = {
    events: new EventTarget(),
    cache: document.createElement("interfaceCache"),
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
            container: null,
            input: null,
            inputElement: null,
            image: null,
            isOpen: null,
            id: uuid.v4()
        }
        this.collection[obj.id] = obj

        // Create HTML elements
        obj.container = document.createElement("a") // Generally behaves correctly
        obj.container.contentEditable = false
        obj.container.className = "mathContainer closed"
        obj.inputElement = document.createElement("span")
        obj.container.appendChild(obj.inputElement)
        obj.image = document.createElement("img")
        obj.image.draggable = false
        obj.image.className = "mathImage"

        // Initialize MathQuill
        const mathQuillInterface = MathQuill.getInterface(2)
        obj.input = mathQuillInterface.MathField(obj.inputElement, {
            // MathQuill configuration
            spaceBehavesLikeTab: false,
            handlers: {
                edit: async () => {
                    if(obj.isOpen){
                        const latex = obj.input.latex()
                        obj.container.setAttribute("data", btoa(latex))
                        obj.image.setAttribute("data", latex)
                    }
                },
                moveOutOf: async direction => {
                    this.close(obj.id)
                    const line = Utils.getParentLine(obj.container)
                    let outsideNodeIndex = Utils.getNodeIndex(line, obj.container)
                    if(direction > 0) outsideNodeIndex += 1
                    Utils.select(line, outsideNodeIndex)
                    this.events.dispatchEvent(new CustomEvent("moveOut", { detail: obj }))
                }
            }
        })

        // Listen for close event
        obj.inputElement.children[0].children[0].onblur = async () => { // Not a listener. Not a memory leak.
            if(obj.isOpen) this.close(obj.id)
        }

        // Finalize
        obj.image.setAttribute("onclick", "window.internal.ui.editor.local.Math.open(\"" + obj.id + "\")")
        obj.container.setAttribute("data", "")
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
        const data = obj.container.getAttribute("data") ?? obj.image.getAttribute("data")
        obj.input.write(atob(data))

        // Open the element
        obj.container.appendChild(obj.inputElement)
        this.cache.appendChild(obj.image)
        obj.image.style.display = "none"
        obj.inputElement.style.display = "" // Unset it
        obj.container.style.width = "" // Unset it
        obj.container.style.height = "" // Unset it
        obj.container.className = "mathContainer open"
        obj.isOpen = true
        obj.input.focus()
        obj.input.reflow()
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
        obj.image.remove()
        obj.inputElement.remove()
        obj.container.remove()
        this.events.dispatchEvent(new CustomEvent("remove", { detail: obj }))
        return
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
        const data = obj.input.latex()

        // Close the element
        obj.isOpen = false
        obj.container.className = "mathContainer closed"

        // Remove if empty
        let removed = false
        if(data === ""){
            this.remove(id)
        }else {
            // Render latex in the form of an SVG
            const render = MathJax.tex2svg(data, { em: 10, ex: 5, display: true })
            // Todo: Elements not removed -> Is the memory still freed?
            const svg = render.getElementsByTagName("svg")[0].outerHTML
            // Display rendered svg
            obj.image.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)))
            obj.image.style.display = "inline"
            obj.container.appendChild(obj.image)
            this.cache.appendChild(obj.inputElement)
            // MathQuill weirdness, do not remove!
            obj.input.select()
            obj.input.keystroke("Backspace")
            // Todo: This should not live in here. This component is dynamic.
            if(window.setLatexCommandsVisibility) window.setLatexCommandsVisibility(false)
        }
        this.events.dispatchEvent(new CustomEvent("blur", { detail: obj }))
        if(removed) delete this.collection[id]
        return
    },

    /**
     * Flush math related memory
     * @returns {void}
     */
    flush(){
        this.cache.innerHTML = ""
        for(const id in this.collection){
            this.remove(id)
        }
        delete this.collection
        this.collection = {}
        return
    }
}

export default Math