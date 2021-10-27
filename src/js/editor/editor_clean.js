/*globals MathQuill, MathJax */
/**
 * @typedef MathEditor
 * \------------------------------------------------------------------------------------
 * 
 * Matikkaeditori.fi's math editor component
 * 
 * By: \@Esinko
 * 
 *             Created:    08.09.2021
 *             Refactored: 22.10.2021
 * 
 * \------------------------------------------------------------------------------------
 * @returns {Editor}
 */

// Type definitions 
/**
 * @typedef MathElement Matikkaeditori math element
 * @property {HTMLElement} container The main element (container) of the math element
 * @property {*} input Latex input interface (MathQuill)
 * @property {HTMLElement} inputElement The math input element
 * @property {*} image Image element of rendered latex
 * @property {boolean} isOpen Is the math element open?
 * @property {string} id Math element's id
 */
/**
 * @typedef {MathElement[]} MathElementList List of math elements 
 */
/**
 * @typedef EditorElement Matikkaeditori editor's embedded element
 * @property {string} name Element name
 * @property {[]} attributes Element attributes
 * @property {string} data Element raw data
 * @property {[...EditorElement]} tree Parsed element data
 */
/**
 * @typedef {EditorElement[]} EditorElementList List of editor elements 
 */

// Dependencies
import * as uuid from "../worker-components/uuid.js"

/**
 * Utility functions
 */
const Utils = {
    /**
     * --------------------------------------------------------
     * Node handling
     * --------------------------------------------------------
     */
    /**
     * Get node index in tree
     * @param {Node} list Parent element
     * @param {HTMLAnchorElement} node Node to get the index of
     * @returns {number}
     */
    getNodeIndex(list, node){
        if(!(list instanceof HTMLElement)) throw console.error("[ EDITOR ] List provided to getNodeIndex is not an instance of HTMLElement.")
        let index = 0
        for(const childNode of list.childNodes){
            if(childNode === node) break
            index += 1
        }
        return index
    },

    /**
     * Get a node by it's index from the DOM
     * @param {Node} list Parent element
     * @param {number} index Index to read from the childNodes of the parent element
     * @returns {Node|null}
     */
    getNodeByIndex(list, index){
        if(!(list instanceof HTMLElement)) throw console.error("[ EDITOR ] List given to getNodeByIndex is not an instance of HTMLElement.")
        if(list.childNodes.length - 1 < index) throw console.error("[ EDITOR ] Selection given to getNodeByIndex is out of range.")
        return list.childNodes[index]
    },

    /**
     * Enable/Disable anchor-ability for a set of nodes/elements
     * @param {HTMLElement[]|Node[]} list List of elements
     * @param {boolean} mode True/false to set mode state
     * @returns {Promise<void>}
     */
    async toggleAnchorMode(list, mode){
        // Todo: This is a very hacky way to do this
        //       and it WILL NOT scale well
        return new Promise(resolve => {
            for(const item of list){
                item.contentEditable = mode
            }
            // Request frames
            // Two frames make it so at least one frame is always "painted"
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        resolve()
                    }, 50) // 50 ms delay to allow for processing
                    // Todo: Is 50ms enough? What about very slow devices?
                })
            })
        })
    },

    /**
     * See if a node is under some other node in the DOM
     * @param {Node} node 
     * @param {Node} parent 
     * @returns {boolean}
     */
    isSomeParent(node, parent){
        if(!(node instanceof Node)) throw console.error("[ EDITOR ] Node given to isSomeParent is not instance of Node.")
        if(parent === null) return false
        const traverse = (innerNode) => {
            if(innerNode.parentNode === parent){
                return true
            }else {
                // Check other parent
                if(innerNode.parentNode !== null) return traverse(innerNode.parentNode)
                return false
            }
            
        }
        return traverse(node)
    },

    /**
     * Find the parent line of a node in content-editable
     * @param {Node} node
     * @returns {Node|null} 
     */
    getParentLine(node){
        if(!(node instanceof Node)) throw console.error("[ EDITOR ] Node given to getParentLine is not instance of Node.")
        const traverse = (innerNode) => {
            if(innerNode.parentNode.nodeName.toLowerCase() === "div"){
                return innerNode.parentNode
            }else {
                // Check other parent
                if(innerNode.parentNode !== null) return traverse(innerNode.parentNode)
                return null
            }
            
        }
        return traverse(node)
    },

    /**
     * Insert a node in a certain range
     * @param {Range} range Position
     * @param {Node} node Node on insert
     * @returns {void}
     */
    insertNodeAt(range, node){
        if(!(range instanceof Range)) throw console.error("[ EDITOR ] Range given to insertNodeAt is not instance of Range.")
        if(!(node instanceof Node)) throw console.error("[ EDITOR ] Node given to insertNodeAt is not instance of Node.")
        range.insertNode(node)
    },

    /**
     * --------------------------------------------------------
     * Event & Async tools
     * --------------------------------------------------------
     */
    /**
     * Wait for an event from a given event target
     * @param {EventTarget} from 
     * @param {string} event 
     * @returns {Promise<void>}
     */
    waitForEvent(from, event){
        if(!(from instanceof EventTarget)) throw console.error("[ EDITOR ] Event target given to waitForEvent is not instance of EventTarget.")
        if(typeof string !== "string") throw console.error("[ EDITOR ] Event name given to waitForEvent is not a type of string.")
        return new Promise((resolve) => {
            const handler = async () => {
                from.removeEventListener(event, handler)
                resolve()
            }
            from.addEventListener(event, handler)
        })
    },

    /**
     * Execute a function & await a promise in async context
     * @param {function} input 
     * @param {Promise} promise
     * @returns {Promise<any>}
     */
    async asyncTrigger(input, promise){
        if(typeof input !== "function") throw console.error("[ EDITOR ] Input given to asyncTrigger is not typeof function.")
        if(!(promise instanceof Promise)) throw console.error("[ EDITOR ] Promise given to asyncTrigger is not instance of Promise.")
        return new Promise((resolve, reject) => {
            promise.then((...args) => {
                resolve(...args)
            }).catch((...args) => {
                reject(...args)
            })
            input()
        })
    },

    /**
     * --------------------------------------------------------
     * Selection management
     * --------------------------------------------------------
     */
    /**
     * Get current selection as a node
     * @returns {Node}
     */
    getSelectedNode(){
        const node = document.getSelection().focusNode
        if(node === null) return null // No selection 
        return (node.nodeType == 3 ? node.parentNode : node)
    },

    /**
     * Select a part of the given element
     * @param {HTMLElement|Node} element 
     * @param {number} index 
     * @returns {void}
     */
    select(element, index){
        if(!(element instanceof HTMLElement) && !(element instanceof Node)) throw console.error("[ EDITOR ] Element/Node given to select is not instance of HTMLElement/Node.")
        if(typeof index !== "number") throw console.error("[ EDITOR ] Index given to select is not type of number.")
        const range = document.createRange()
        const selection = window.getSelection()
        range.setStart(element, index)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
    },

    /**
     * Select an element by it's index in the DOM (contents)
     * @param {number} index 
     * @param {HTMLElement} element 
     * @returns {void}
     */
    selectByIndex(index, element, collapse){
        if(element.childNodes.length - 1 < index) return console.error("[ EDITOR ] Selection out of range!")
        const range = document.createRange()
        const sel = document.getSelection()
        range.selectNodeContents(element.childNodes[index])
        range.collapse(collapse ?? true)
        sel.removeAllRanges()
        sel.addRange(range)
    },

    /**
     * Get current caret position
     * @returns {Range}
     */
    getCaretPosition(){
        const selection = window.getSelection()
        let range
        if(selection){
            range = selection.getRangeAt(0)
            range.deleteContents()
        }else {
            range = document.selection.createRange()
        }
        return range
    },

    /**
     * Copy HTML to the cursor position
     * @param {string} html 
     * @returns {void}
     */
    copyToCursor(html){
        const sel = document.getSelection()
        const dummy = document.createElement("div")
        // Todo: Huge XSS vulnerability here! Fix later...
        dummy.innerHTML = html.includes("<!--StartFragment-->") ? html.split("<!--StartFragment-->")[1].split("<!--EndFragment-->")[0] : html
        // Todo: Test the HTML for valid data
        const offset = sel.anchorOffset
        const range = document.createRange()
        range.setStart(sel.anchorNode, offset)
        range.collapse(true)
        sel.removeAllRanges()
        sel.addRange(range)
        // Todo: I have no fucking idea why this works and why we need to do this.
        //       Don't you fucking dare touch this badness I won't help you fix it!!!
        let last = null
        const tmp = [...dummy.childNodes]
        for(let elem of tmp){
            if(!last) range.insertNode(elem)
            else last.after(elem)
            last = elem
        }
        sel.collapseToEnd()
        dummy.remove()
    },

    /**
     * --------------------------------------------------------
     * Object & Array handling
     * --------------------------------------------------------
     */
    /**
     * Read value of object's objects and return them as an array
     * @param {{}} obj 
     * @param {string} property 
     * @returns {[...any]}
     */
    getObjectPropertyArray(obj, property){
        if(typeof obj !== "object") throw console.error("[ EDITOR ] Object given to getObjectPropertyArray is not type of object.")
        const keys = Object.keys(obj)
        const list = []
        for(const key of keys){
            if(obj[key][property]) list.push(obj[key][property])
        }
        return list
    },

    /**
     * Find next instance of a string in an array
     * @param {string} string 
     * @param {[]} array 
     * @param {number} index 
     * @returns {number}
     */
    findNextOf(string, array, index){
        if(typeof string !== "string") throw console.error("[ EDITOR ] String given to findNextOf is not type of string.")
        if(!Array.isArray(array)) throw console.error("[ EDITOR ] Array given to findNextOf is not an array.")
        if(typeof index !== "number") throw console.error("[ EDITOR ] Index given to findNextOf is not type of number.")
        if(index) array = array.slice(index)
        return array.indexOf(string) // -1 is already also false
    },

    // TODO: Indexes or what?
    /**
     * Read data between two array indexes
     * @param {[]} array 
     * @param {number} start 
     * @param {number} end 
     * @returns {[..any]}
     */
    readBetweenIndexes(array, start, end){
        if(!Array.isArray(array)) throw console.error("[ EDITOR ] Array given to readBetweenIndexes is not an array.")
        if(typeof start !== "number") throw console.error("[ EDITOR ] Start given to readBetweenIndexes is not type of number.")
        if(typeof end !== "number") throw console.error("[ EDITOR ] End given to readBetweenIndexes is not type of number.")
        const arrayClone = JSON.parse(JSON.stringify(array))
        return arrayClone.splice(start, end - start)
    },

    /**
     * Get new clone of an array with a start index
     * @param {[]} array 
     * @param {number} index 
     * @returns {[...any]}
     */
    getCloneFromIndex(array, index){
        if(!Array.isArray(array)) throw console.error("[ EDITOR ] Array given to getCloneFromIndex is not an array.")
        if(typeof index !== "number") throw console.error("[ EDITOR ] Index given to getCloneFromIndex is not type of number.")
        let arrayClone = JSON.parse(JSON.stringify(array))
        return arrayClone.slice(index)
    },

    /**
     * --------------------------------------------------------
     * String management & tools
     * --------------------------------------------------------
     */
    /**
     * Remove double quotes from the start & end of the string while maintaining \""
     * @param {string} string 
     * @returns {string}
     */
    removeDoubleQuotes(string){
        return string.replace(/\\"/g, "\\'").replace(/"/g, "").replace(/\\'/g, "\"")
    },

    /**
     * --------------------------------------------------------
     * Save format parser & encoder
     * --------------------------------------------------------
     */
    /**
     * Read embedded element data from the official save format
     * @param {string} data 
     * @returns {EditorElementList}
     */
    parseEmbedded(data){
        if(typeof data !== "string") throw console.error("[ EDITOR ] Data given to parseEmbedded is not type of string.")
        
        data = data.split("")
        let elements = []
        let raw = []
        let i = 0

        // Read function
        const read = () => {
            const char = data[i]
            // New element?
            if(char === "<"){
                // Dump cache
                if(raw.length !== 0) {
                    // Any random text data will be formatted as a text element
                    elements.push({
                        name: "text",
                        attributes: [],
                        tree: [],
                        data: raw.join("")
                    })
                    raw = []
                }
                
                // Find closing > tag
                let nextTagIndex, tagData, tagName, attributeData, elementData
                const attributes = {}
                try {
                    // Read and format element tag data
                    nextTagIndex = i + this.findNextOf(">", this.getCloneFromIndex(data, 0), i)
                    tagData = this.readBetweenIndexes(data, i + 1, nextTagIndex).join("")
                    tagName = tagData.split(" ")[0]
                    attributeData = tagData.replace(tagName, "")
                    if(attributeData !== ""){
                        // Remove possible leading space
                        if(attributeData.startsWith(" ")) attributeData = attributeData.replace(" ", "")
                        attributeData = attributeData.split(" ")
                        for(let val of attributeData){
                            let parts = val.split("=")
                            attributes[this.removeDoubleQuotes(parts[0])] = this.removeDoubleQuotes(parts[1]) 
                        }
                    }
                }
                catch(e){
                    console.error("[ EDITOR ] ParseEmbedded failed to read tag data that started at", i, "of", data, "err:", e)
                }

                // Find closing element tag
                const splitByTag = this.getCloneFromIndex(data, nextTagIndex + 1).join("").split("</" + tagName + ">")
                elementData = splitByTag[0]

                // Update index number
                i += ("<" + tagData + ">" + elementData + "</" + tagName + ">").length - 1

                // Create element construct
                const element = {
                    name: tagName,
                    attributes,
                    data: elementData,
                    tree: []
                }

                // Todo: Element tree will not be parsed, as an element with this feature is yet to be implemented

                console.debug("[ EDITOR ] Element parsed", element)
                elements.push(element)
            }else {
                // No element qualification, dump to cache
                raw.push(char)
            }

            // Return updated index
            return i
        }

        // Reader loop
        const reader = () => {
            const readToIndex = read()
            if(readToIndex < data.length){
                // More to read
                ++i
                reader()
            }else {
                return true
            }
        }

        reader()
        return elements
    },

    /**
     * Format HTML editor data to the official save format
     * @param {HTMLElement} element 
     * @returns {string}
     */
    toEmbedded(element){
        const format = []
        if(!(element instanceof HTMLElement)) throw console.error("[ EDITOR ] Element given to toEmbedded is not instance of HTMLElement.")
        for(let i = 0; i < element.childNodes.length; i++){
            const line = element.childNodes[i]
            // Create line
            format.push("")
            for(const element of line.childNodes){
                switch(element.nodeName.toLowerCase()){
                case "#text": {
                    // This is plain text
                    format.lastItem += "<text>" + btoa(element.wholeText) + "</text>"
                    break
                }
                /*case "p": {
                    // Chrome math container
                    format.lastItem += "<math>" + btoa(element.getAttribute("data")) + "</math>"
                    break
                }
                case "a": {
                    // Firefox math container
                    let imgElement = null
                    for(const child of element.childNodes){
                        if(child.nodeName.toLowerCase() === "img"){
                            imgElement = child
                        }
                    }
                    if(imgElement === null) throw console.error("[ EDITOR ] Failed to read Firefox math data", element)
                    break
                }*/
                case "a": {
                    // Math container
                    format.lastItem += "<math>" + btoa(element.getAttribute("data")) + "</math>"
                    break
                }
                case "br": {
                    // Manual line-break
                    // Only handled as an activator now
                    if(window.browser !== "firefox" && element.parentNode.childNodes.length !== 1){
                        // No meaning for firefox & does not change anything on chromium if by itself in a line
                        format.push("")
                    }
                    break
                }
                case "img": {
                    // Rendered math
                    format.lastItem += "<math>" + btoa(element.getAttribute("data")) + "</math>"
                    break
                }
                case "div": {
                    // Line within a line
                    // This may be caused by a bug, or a browser content editable related inconsistency
                    for(const child of line.childNodes) line.after(child)
                    line.remove()
                    i = 0
                    console.warn("[ Editor ] Line structure changes were required! Redoing the getContent...")
                    break
                }
                default: {
                    console.warn("[ EDITOR ] Unknown element in editor", element)
                }
                }
            }
        }
        return format.length === 0 ? "" : format.join("")
    },

    /**
     * Convert editor element to a HTML element
     * @param {EditorElement} element
     * @returns {HTMLElement | Node}
     */
    fill(element){
        let html = null
        if(element.data) element.data = atob(element.data)
        switch(element.name){
        case "meta": {
            // Not an element
            break
        }
        case "text": {
            // Basic text
            if(element.data === ""){
                html = document.createElement("br")
            }else {
                html = document.createTextNode(element.data)
            }
            break
        }
        case "math": {
            // Math element
            const mathElement = Math.create()
            mathElement.input.write(element.data)
            html = mathElement.container
            break
        }
        default: {
            console.error("[ EDITOR ]", "Unknown element type of \"" + element.name + "\" cannot be processed. Raw:", element)
        }
        }
        if(element.tree !== undefined && element.tree !== 0){
            // This element has children
            for(const child of element.tree){
                element.appendChild(this.fill(child))
            }
        }
        return html
    }
}

/**
 * Math utilities (wrapper for MathQuill)
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
                    await this.close(obj.id)
                    const line = Utils.getParentLine(obj.container)
                    let outsideNodeIndex = Utils.getNodeIndex(line, obj.container)
                    if(direction > 0) outsideNodeIndex += 1
                    // Firefox patch: Index is off by 2 in both directions
                    if(window.browser === "firefox"){
                        if(direction < 0) outsideNodeIndex -= 2
                        if(direction > 0) outsideNodeIndex -= 2
                    }
                    Utils.select(line, outsideNodeIndex)
                    this.events.dispatchEvent(new CustomEvent("moveOut", { detail: obj }))
                }
            }
        })

        // Listen for close event
        obj.inputElement.children[0].children[0].onblur = async () => { // Not a listener. Not a memory leak.
            if(!obj.isOpen) this.close(obj.id)
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
            MathJax.tex2svg(data, { em: 10, ex: 5, display: true }).then(render => {
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
            }).catch(e => {
                console.error("[ EDITOR ]", "Failed to render math:", e)
            })
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
// Configure interface cache
Math.cache.style.display = "none"
document.body.appendChild(Math.cache)

// Main class
/**
 * \------------------------------------------------------------------------------------
 * 
 * Matikkaeditori.fi dynamic editor component
 * 
 * \------------------------------------------------------------------------------------
*/
class Editor {
    /**
     * Editor component instance
     * @param {HTMLElement} hook 
     */
    constructor(hook){
        if(!Utils.isSomeParent(hook, document.body)) throw "The hook element has to be in the DOM"
        // Todo: Add type declarations for these (I forget how)
        this.hook = hook
        this.local = { Math, Utils }
        this.events = new EventTarget()
        this.activeMathElement = null
        this.activeLine = null
        this.watchHook = true
        this.moveOutOfThisEvent = false // Todo: Needed?
    }

    /**
     * Set editor contents
     * @param {string[]} data
     */
    setContent(data){
        this.watchHook = false
        this.hook.innerHTML = ""
        Math.flush()
        
        // Parse
        console.log("[ EDITOR ] Setting editor content...")
        let content = []
        for(const line of data){
            content.push(Utils.parseEmbedded(line))
        }
        console.log("[ EDITOR ] Parser output:", content)

        // Process each line
        let wrote = false
        for(const line of content){
            let lineElement = null
            if(line.length === 0){
                lineElement = document.createElement("div")
                lineElement.appendChild(document.createElement("br"))
            }else {
                for(let element of line){
                    if(element.name === "meta"){
                        // Meta tag!
                        console.log("[ EDITOR ]", "Save META:", element.attributes)
                        continue
                    }
                    if(!lineElement) lineElement = document.createElement("div")
                    const result = Utils.fill(element)
                    if(result !== null) lineElement.appendChild(result)
                }
                if(lineElement !== null){
                    this.hook.appendChild(lineElement)
                    if(!wrote) wrote = true
                }
            }
        }
        if(!wrote) this.hook.innerHTML = "<div><br><div>" // Empty document

        // Toggle math
        for(const id in Math.collection){
            Math.open(id)
            Math.close(id)
        }

        this.watchHook = true
    }

    /**
     * Initialize the editor
     */
    init(){
        let arrowKeyDoubleTap = false // Changes to the relevant function call for double tap

        // Add a global keyboard listener
        document.addEventListener("keydown", event => {
            // Make sure the editor is selected
            if(!Utils.isSomeParent(Utils.getSelectedNode(), this.hook)) return

            // Moving with arrow keys
            // Special left double tap (2 hits in a row means we want to move, otherwise do nothing)
            if(arrowKeyDoubleTap !== false && event.code === "ArrowLeft"){
                arrowKeyDoubleTap()
                arrowKeyDoubleTap = false
                return
            }
            if(event.code === "ArrowLeft") {
                arrowKeyDoubleTap = true
            }

            // Math element control
            // Create with ctrl+e
            if(event.ctrlKey && event.key === "e"){
                event.preventDefault()
                if(this.activeMathElement !== null) return // No math inside math
                const mathElement = Math.create()
                Utils.insertNodeAt(Utils.getCaretPosition(), mathElement.container)
                Math.open(mathElement.id)
                return
            }
            // Close with esc
            if(event.code === "Escape" && this.activeMathElement !== null){
                event.preventDefault()
                const containerReference = this.activeMathElement.container
                Math.close(this.activeMathElement.id)
                Utils.selectByIndex(Utils.getNodeByIndex(this.activeLine, containerReference))
                return
            }   

            // Patches to browser content-editable related to document manipulation


        })
    }

    getContent(){
        return ["<meta \"version\"=\"" + localStorage.getItem("version") + "\"></meta>"].concat(Utils.toEmbedded(this.hook))
    }
}

/**
 * @type {MathEditor}
 */
export default Editor