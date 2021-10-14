/*globals MathQuill, MathJax */
/**
 * ------------------------------------------
 * Matikkaeditori.fi's Math editor component
 * 
 * By: @Esinko 08.09.2021
 * ------------------------------------------
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
 * @typedef EditorElement Matikkaeditori editor's embedded element
 * @property {string} name Element name
 * @property {[]} attributes Element attributes
 * @property {string} data Element raw data
 * @property {[...EditorElement]} tree Parsed element data
 */

// Imports
import * as uuid from "../worker-components/uuid.js"

// Utils
const Utils = new (class _Utils {
    /**
     * Get node index in tree
     * @param {HTMLElement} list Parent element
     * @param {HTMLAnchorElement} node Node to get the index of
     */
    getNodeIndex(list, node){
        let index = 0
        for(const childNode of list.childNodes){
            if(childNode === node) break
            index += 1
        }
        return index
    }

    /**
     * Get a node by it's index from the DOM
     * @param {HTMLElement} list 
     * @param {number} index 
     */
    getNodeByIndex(list, index){
        if(list.childNodes.length - 1 < index) return console.error("[ EDITOR ] Selection out of range! (byIndex)")
        return list.childNodes[index]
    }
    
    /**
     * Read value of object's objects and return them as an array
     * @param {{}} obj 
     * @param {string} property 
     */
    getObjectPropertyArray(obj, property){
        const keys = Object.keys(obj)
        const list = []
        for(const key of keys){
            if(obj[key][property]) list.push(obj[key][property])
        }
        return list
    }

    /**
     * Enable/Disable anchors for a set of nodes/elements
     * @param {HTMLElement[]} list List of elements
     * @param {boolean} mode True/false to set mode state
     */
    async toggleAnchorMode(list, mode){
        // This is a very hacky way to do this
        // and it WILL NOT scale well
        return new Promise(resolve => {
            for(const item of list){
                item.contentEditable = mode
            }
            // Request frames
            // Two frames make it so at least one frame is always painted
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        resolve()
                    }, 50)
                })
            })
        })
    }

    /**
     * Get current selection as a node
     * @returns {Node}
     */
    getSelectedNode(){
        const node = document.getSelection().focusNode
        return (node.nodeType == 3 ? node.parentNode : node)
    }

    /**
     * See if a node is under some other node in the DOM
     * @param {Node} node 
     * @param {Node} parent 
     */
    isSomeParent(node, parent){
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
    }

    /**
     * Find the parent line of a node in content-editable
     * @param {Node} node 
     */
    getParentLine(node){
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
    }

    /**
     * Insert a node in a certain range
     * @param {Range} range Position
     * @param {HTMLAnchorElement} node Node on insert
     */
    insertNodeAt(range, node){
        range.insertNode(node)
    }

    /**
     * Wait for an event from a certain event target
     * @param {EventTarget} from 
     * @param {string} event 
     */
    waitForEvent(from, event){
        return new Promise((resolve) => {
            const handler = async () => {
                from.removeEventListener(event, handler)
                resolve()
            }
            from.addEventListener(event, handler)
        })
    }

    /**
     * TODO: Does the same as selectByIndex!
     * Select something
     * @param {HTMLElement} element 
     * @param {number} index 
     */
    select(element, index){
        const range = document.createRange()
        const selection = window.getSelection()
        range.setStart(element, index)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
    }

    /**
     * Select an element by it's index in the DOM (contents)
     * @param {number} index 
     * @param {HTMLElement} element 
     */
    selectByIndex(index, element, collapse){
        if(element.childNodes.length - 1 < index) return console.error("[ EDITOR ] Selection out of range!")
        const range = document.createRange()
        const sel = document.getSelection()
        range.selectNodeContents(element.childNodes[index])
        range.collapse(collapse ?? true)
        sel.removeAllRanges()
        sel.addRange(range)
    }

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
    }

    /**
     * Find next instance of a string in an array
     * @param {string} string 
     * @param {[]} array 
     * @param {number} index 
     * @returns {number}
     */
    findNextOf(string, array, index){
        if(index) array = array.slice(index)
        return array.indexOf(string) // -1 is already also false
    }

    /**
     * Read data between two array indexes
     * @param {[]} array 
     * @param {number} start 
     * @param {number} end 
     * @returns {[]}
     */
    readBetweenIndexes(array, start, end){
        let arrayClone = JSON.parse(JSON.stringify(array))
        return arrayClone.splice(start, end - start)
    }

    /**
     * Get new clone of an array with a start index
     * @param {*} array 
     * @param {*} index 
     * @returns {[]}
     */
    getCloneFromIndex(array, index){
        let arrayClone = JSON.parse(JSON.stringify(array))
        return arrayClone.slice(index)
    }

    /**
     * Remove double quotes from the start & end of the string while maintaining \""
     * @param {string} string 
     * @returns {string}
     */
    removeDoubleQuotes(string){
        return string.replace(/\\"/g, "\\'").replace(/"/g, "").replace(/\\'/g, "\"")
    }

    /**
     * Read embedded element data from the official save format
     * @param {string} data 
     * @returns {[...EditorElement]}
     */
    parseEmbedded(data){
        data = data.split("")
        let elements = []
        let rawText = []
        let i = 0
        // Char read function
        const read = () => {
            let char = data[i]
            // Find opening tag
            if(char === "<"){
                // Dump text
                if(rawText.length !== 0) {
                    //console.debug("[ EDITOR ] Parser dumped raw text", rawText.join(""))
                    elements.push({
                        name: "text",
                        attributes: [],
                        tree: [],
                        data: rawText.join("")
                    })
                    rawText = []
                }

                //console.debug("[ EDITOR ] Parser detected an element at", i)

                // Plot forward until attributes closing tag
                let nextTagIndex = i + this.findNextOf(">", this.getCloneFromIndex(data, 0), i)
                
                //console.debug("[ EDITOR ] Parser found closing attribute tag at", i, "for new the element")

                // Get attribute tag data
                let tagData = this.readBetweenIndexes(data, i + 1, nextTagIndex).join("")
                
                //console.debug("[ EDITOR ] Parser read this raw first tag data", tagData)

                // Read tag name
                let tagName = tagData.split(" ")[0]

                //console.debug("[ EDITOR ] New element's tag name is", tagName)

                // Parse attribute data
                let attributeData = tagData.replace(tagName, "")

                //console.debug("[ EDITOR ] Parser read this raw attribute data", attributeData)

                let attributes = {}

                // Make sure there is data to read
                if(attributeData !== ""){
                    // Remove possible leading space
                    if(attributeData.startsWith(" ")) attributeData = attributeData.replace(" ", "")
                    attributeData = attributeData.split(" ")
                    for(let val of attributeData){
                        let parts = val.split("=")
                        attributes[this.removeDoubleQuotes(parts[0])] = this.removeDoubleQuotes(parts[1]) 
                    }
                    //console.debug("[ EDITOR ] Built attributes construct", attributes)
                }/*else {
                   // console.debug("[ EDITOR ] No attribute data to read")
                }*/

                // Find the closing tag and read the data
                let splitByTag = this.getCloneFromIndex(data, nextTagIndex + 1).join("").split("</" + tagName + ">")
                let rawData = splitByTag[0]

                // Forward the index by this elements size
                i += ("<" + tagData + ">" + rawData + "</" + tagName + ">").length-1
                //console.debug("[ EDITOR ] Parser jumping forward to ", i, "/", data.length)

                let element = {
                    name: tagName,
                    attributes,
                    data: rawData,
                    tree: []
                }

                // Element tree will not be parsed, as an element with this feature is yet to be implemented
                //if(rawData !== "" && ) this.parseEmbedded(rawData)

                console.debug("[ EDITOR ] Element parsed", element)
                elements.push(element)
            }else {
                rawText.push(char)
            }
            return i
        }
        // Reader loop
        const reader = () => {
            //console.log("[ EDITOR ] Parsing line data of", data.length)
            let readToIndex = read()
            //console.log("[ EDITOR ] Reading...", readToIndex, "/", data.length)
            if(readToIndex < data.length){
                ++i
                reader()
            }else {
                //console.log("[ EDITOR ] Done ", i, "/", data.length)
                return true
            }
        }
        reader()
        return elements
    }

    copyToCursor(html){
        const sel = document.getSelection()
        const dummy = document.createElement("div")
        // Todo: Huge XSS vulnerability here! Fix later...
        dummy.innerHTML = html.includes("<!--StartFragment-->") ? html.split("<!--StartFragment-->")[1].split("<!--EndFragment-->")[0] : html
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
        //sel.setPosition(sel.anchorNode, offset)
    }
})

// Math utilities (wrapper for MathQuill)
const Math = new (class _Math {
    constructor(){
        this.events = new EventTarget()
        this.cache = document.createElement("interfaceCache")
        this.cache.style.display = "none"
        document.body.appendChild(this.cache)
        this.collection = {}
    }
    /**
     * Create a new math element
     * @returns {MathElement}
     */
    async create(){
        //console.debug("[ EDITOR ] Creating math...")
        let mathObject = {
            container: null,
            input: null,
            inputElement: null,
            image: null,
            isOpen: null,
            id: uuid.v4()
        }
        this.collection[mathObject.id] = mathObject

        // Create the elements
        mathObject.container = document.createElement("p")
        mathObject.container.contentEditable = false
        mathObject.container.className = "mathContainer closed"
        mathObject.inputElement = document.createElement("span")
        mathObject.container.appendChild(mathObject.inputElement)
        mathObject.image = document.createElement("img")
        mathObject.image.draggable = false
        mathObject.image.className = "mathImage"

        // Initialize MathQuill
        const mqInterface = MathQuill.getInterface(2)
        mathObject.input = mqInterface.MathField(mathObject.inputElement, {
            spaceBehavesLikeTab: false,
            handlers: {
                // MathQuill event handler
                edit: async () => {
                    if(mathObject.isOpen) {
                        const latex = mathObject.input.latex()
                        mathObject.container.setAttribute("data", latex)
                        mathObject.image.setAttribute("data", latex)
                    }
                },
                enter: async () => {
                    // Handler for enter-key, not used for now
                },
                moveOutOf: async direction => {
                    this.close(mathObject.id)
                    const line = mathObject.container.parentNode
                    await Utils.waitForEvent(this.events, "blur")
                    const range = document.createRange()
                    const sel = window.getSelection()
                    //console.debug("[ EDITOR ] Jumping out of math...")
                    let index = Utils.getNodeIndex(line, mathObject.container)
                    if(direction > 0) index += 1
                    // Firefox patch: Index is off by 2 in both directions
                    if(window.browser === "firefox"){
                        if(direction < 0) index -= 2
                        if(direction > 0) index -= 2
                    }
                    range.setStart(line, index)
                    range.collapse(true)
                    sel.removeAllRanges()
                    sel.addRange(range)
                    this.events.dispatchEvent(new CustomEvent("moveOut"))
                    console.log(direction, index)
                }
            }
        })

        // Handle close event
        mathObject.inputElement.children[0].children[0].onblur = async () => {
            this.close(mathObject.id)
        }

        // Handle reopen event
        mathObject.image.setAttribute("onclick", "window.internal.ui.editor.local.Math.open(\"" + mathObject.id + "\")")

        // Finalize
        mathObject.container.setAttribute("data", "")
        return mathObject
    }

    /**
     * Open math element
     * @param {*} id 
     */
    async open(id){
        //console.debug("[ EDITOR ] Opening math...")
        const mathObject = this.collection[id]
        const latexData = mathObject.container.getAttribute("data")
        mathObject.input.write(latexData)
        
        // Browser specific things
        if(window.browser === "chrome"){
            if(mathObject.inputElement.parentElement !== mathObject.container){
                // Append container back
                mathObject.container.appendChild(mathObject.inputElement)
                // Hide image inside cache
                this.cache.appendChild(mathObject.image)
            }
        }else if(window.browser === "firefox"){
            if(mathObject.container.parentElement === this.cache){
                const imgContainerReference = mathObject.image.parentElement
                if(mathObject.image.parentElement.childNodes[0].nodeName.toLowerCase() === "#text"){
                    mathObject.image.parentElement.before(mathObject.image.parentElement.childNodes[0])
                }
                mathObject.image.parentElement.before(mathObject.container)
                this.cache.appendChild(mathObject.image)
                imgContainerReference.remove()
            }
        }

        mathObject.image.style.display = "none"
        mathObject.inputElement.style.display = "" // Unset it
        mathObject.container.style.width = "" // Unset it
        mathObject.container.style.height = "" // Unset it
        mathObject.container.className = "mathContainer open"
        mathObject.isOpen = true
        mathObject.input.focus()
        mathObject.input.reflow()
        if(window.setLatexCommandsVisibility) window.setLatexCommandsVisibility(true)
        this.events.dispatchEvent(new CustomEvent("focus", { detail: mathObject }))
    }

    /**
     * Close math element
     * @param {*} id 
     */
    async close(id){
        //console.debug("[ EDITOR ] Closing math...")
        const mathObject = this.collection[id]

        // Make sure we don't close twice
        if(!mathObject.isOpen) return

        // Re-configure the element to closed state
        mathObject.isOpen = false
        mathObject.container.className = "mathContainer closed"

        // Remove math if it's empty
        if(mathObject.input.latex() === ""){
            mathObject.image.remove()
            mathObject.container.remove()
            delete this.collection[id]
            return
        }

        // Render math to svg
        const render = await MathJax.tex2svg(mathObject.input.latex(), {em: 10, ex: 5, display: true})
        const svg = render.getElementsByTagName("svg")[0].outerHTML

        // Configure the image element
        mathObject.image.src = "data:image/svg+xml;base64," + window.btoa(unescape(encodeURIComponent(svg)))
        mathObject.image.style.display = "inline"

        // Browser specific container settings
        if(window.browser === "chrome"){
            mathObject.container.appendChild(mathObject.image)
            this.cache.appendChild(mathObject.inputElement)
        }else if(window.browser === "firefox"){
            const imgParent = document.createElement("a")
            imgParent.className = "mathContainer closed"
            imgParent.appendChild(mathObject.image)
            mathObject.container.before(imgParent)
            this.cache.appendChild(mathObject.container)
        }

        // Set element width and height attributes manually
        // Include 8px padding & 3px margin on sides
        //const dims = mathObject.container.getBoundingClientRect()
        //mathObject.image.setAttribute("height", dims.height)
        //mathObject.container.style.height = dims.height + "px"
        //mathObject.image.setAttribute("width", dims.width)
        //mathObject.container.style.width = dims.width + "px"

        // Compatibility things
        mathObject.input.select()
        mathObject.input.keystroke("Backspace")
        if(window.setLatexCommandsVisibility) window.setLatexCommandsVisibility(false)
        this.events.dispatchEvent(new CustomEvent("blur", { detail: mathObject }))
    }
})

// Main class
/**
 * Dynamic math editor component
 */
class Editor {
    
    /**
     * Create new instance of the editor
     * @param {HTMLElement} hook Element to hook the editor to
     */
    constructor(hook) {
        this.hook = hook
        this.local = {
            Math,
            Utils
        }

        // Constant variables
        this.events = new EventTarget()
        this.activator = "<br>"//"‎" // Activator element to fool the browser to enable caret control (special unicode char)

        // Dynamic variables
        this.activeMathElement = null
        this.activeLine = null // Active line element (div)
        this.watchDocument = true // Enable flow logic
        this.moveOutOfThisEvent = false // Math wrapper called moveOut event last keydown
    }

    /**
     * Set editor contents
     * @param {string} data Data in matikkaeditori.fi's save data format
     */
    async setContent(data, id){
        // UI compatibility
        this.target = {
            i: id
        }
        this.hook.innerHTML = ""

        // Create construct
        let construct = []
        console.log("[ EDITOR ] Parsing content...")
        for(let i = 0; i < data.length; i++){
            // Find tags
            const line = data[i]
            //console.log("[ EDITOR ] Processing line", i)
            let parsedLine = Utils.parseEmbedded(line)
            construct.push(parsedLine)
        }
        console.log("[ EDITOR ] Parser output:", construct)

        const fill = async (element) => {
            let htmlElement = null
            // eslint-disable-next-line no-undef
            if(element.data) element.data = atob(element.data)
            switch(element.name){

            case "meta": {
                // Don't do anything element related for this
                break
            }

            case "text": {
                // Basic text
                if(element.data === "") {
                    element.data = this.activator // Redundant, relic of the past
                    htmlElement = document.createElement("br")
                }else {
                    htmlElement = document.createTextNode(element.data)
                }
                break
            }

            case "math": {
                // Create math element
                const mathElement = await Math.create()
                mathElement.input.write(element.data)
                htmlElement = mathElement.container
                break
            }

            default: {
                console.error("Unsupported element type:", element.name, element)
            }
            }

            if(element.tree.length !== 0) {
                for(let childElement of element.tree){
                    htmlElement.appendChild(await fill(childElement))
                }
            }
            return htmlElement
        }

        // Write the elements to the editor
        for(let line of construct){
            let lineElement = null
            for(let element of line){
                if(element.name === "meta"){
                    // This is a meta tag
                    console.log("[ EDITOR ] Parser output META:", element.attributes)
                    continue
                }
                if(!lineElement) lineElement = document.createElement("div") // Create own line if not yet crated
                let fillResult = await fill(element)
                if(fillResult !== null) lineElement.appendChild(fillResult)
            }
            if(line.length === 0) {
                lineElement = document.createElement("div")
                if(window.browser === "firefox") lineElement.appendChild(document.createElement("br")) // Firefox line activator
            }
            if(lineElement) this.hook.appendChild(lineElement)
        }

        // Toggle all math
        for(let id in Math.collection){
            Math.open(id)
            Math.close(id)
        }
    }

    /**
     * Get editor contents
     */
    async getContent(){
        let format = ["<meta \"version\"=\"" + localStorage.getItem("version") + "\"></meta>"]
        for(let i = 0; i < this.hook.childNodes.length; i++){
            let line = this.hook.childNodes[i]
            // We expect each line to be a container itself!
            // Newline after each line!
            format.push("")
            for(let element of line.childNodes){
                switch(element.nodeName.toLowerCase()){
                case "#text": {
                    // This is plain text
                    // eslint-disable-next-line no-undef
                    format[format.length-1] += "<text>" + btoa(element.wholeText) + "</text>"
                    break
                }

                // Chrome math container
                case "p": {
                    // eslint-disable-next-line no-undef
                    format[format.length-1] += "<math>" + btoa(element.getAttribute("data")) + "</math>"
                    break
                }

                // Firefox math container
                case "a": {
                    let imgElement = null
                    for(let child of element.childNodes){
                        if(child.nodeName.toLowerCase() === "img") {
                            imgElement = child
                            break
                        }
                    }
                    if(imgElement === null) console.error("[ EDITOR ] Failed to read Firefox math container latex", element)
                    // eslint-disable-next-line no-undef
                    format[format.length-1] += "<math>" + btoa(imgElement.getAttribute("data")) + "</math>"
                    break
                }

                case "br": {
                    // This is a manual line-break
                    if(window.browser !== "firefox"){ // Does not mean anything on firefox
                        format.push("")
                    }
                    break
                }

                case "img": {
                    // This is a math render
                    // eslint-disable-next-line no-undef
                    format[format.length-1] += "<math>" + btoa(element.getAttribute("data")) + "</math>"
                    break
                }

                case "div": {
                    // This is a line within a line, move it's contents to the hook and 
                    for(const child of line.childNodes) line.after(child)
                    line.remove()
                    i = 0 // Resets to the start
                    console.warn("[ Editor ] Line structure changes were required! Redoing the getContent...")
                    break
                }
                
                default: {
                    console.warn("UNKNOWN ELEMENT IN EDITOR", element)
                }
                
                }
            }
        }
        console.log("FORMAT", format)
        return format
    }

    /**
     * Initialize the editor
     */
    async init(){
        return new Promise((resolve, reject) => {
            try {
                // Global keyboard listener
                let arrowKeyDoubleTap = false
                let lastSelection = null
                document.addEventListener("keydown", async event => {
                    // --- Math controls ---
                    if(!Utils.isSomeParent(Utils.getSelectedNode(), this.hook)) return

                    // Arrow key movement double tap listener
                    if(arrowKeyDoubleTap !== false && event.code === "ArrowLeft"){
                        console.debug("[ EDITOR ] Jumping using double-tap...")
                        arrowKeyDoubleTap()
                        arrowKeyDoubleTap = false
                        return
                    }
                    arrowKeyDoubleTap = false

                    // Open math element
                    if(event.ctrlKey && event.key === "e"){
                        event.preventDefault()
                        const mathElement = await Math.create()
                        Utils.insertNodeAt(Utils.getCaretPosition(), mathElement.container)
                        Math.open(mathElement.id)
                        return
                    }

                    // Close math
                    if(event.code === "Escape"){
                        event.preventDefault()
                        const container = this.activeLine.container
                        Math.close(this.activeMathElement.id)
                        await Utils.waitForEvent(Math.events, "blur")
                        Utils.selectByIndex(Utils.getNodeIndex(this.activeLine, container) - 1, this.activeLine)
                        return
                    }

                    // Firefox patch: Make sure we are not in a math container
                    if(event.code === "Enter"){
                        if(window.browser === "firefox"){
                            const selection = document.getSelection()
                            const direction = selection.anchorOffset // 0 is left, 1 is right
                            if(selection.anchorNode.nodeName.toLowerCase() === "a" && selection.anchorNode.childNodes.length === 1 && selection.anchorNode.childNodes[0].nodeName.toLowerCase() === "img"){
                                event.preventDefault()
                                if(direction === 0){
                                    const line = document.createElement("div")
                                    line.appendChild(document.createElement("br")) // this.activator
                                    this.activeLine.before(line)
                                    Utils.selectByIndex(0, line)
                                }else {
                                    const line = document.createElement("div")
                                    line.appendChild(document.createElement("br")) // this.activator
                                    this.activeLine.after(line)
                                    Utils.selectByIndex(0, line)
                                }
                                return // Forced to return
                            }
                        }
                    }

                    // Use enter to create new math
                    if(event.code === "Enter" && this.activeMathElement !== null){
                        event.preventDefault()

                        // Shift will make us move out and create a new line
                        if(event.shiftKey){
                            this.hook.focus() // This will blur any selected math
                            await Utils.waitForEvent(Math.events, "blur")
                            const newLine = document.createElement("div")
                            newLine.innerHTML = this.activator
                            this.activeLine.after(newLine)
                            Utils.selectByIndex(Utils.getNodeIndex(this.hook, newLine), this.hook) // Move into new line
                        }else {
                            // Create new line after current active line
                            Math.close(this.activeMathElement.id)
                            await Utils.waitForEvent(Math.events, "blur")
                            // Make new line
                            const newLine = document.createElement("div")
                            this.activeLine.after(newLine)
                            Utils.selectByIndex(Utils.getNodeIndex(this.hook, newLine), this.hook)
                            //Utils.select(this.hook, this.hook.childNodes.indexOf(this.activeLine) + 1)
                            const mathElement = await Math.create()
                            newLine.appendChild(mathElement.container)
                            Math.open(mathElement.id)
                        }
                        return
                    }

                    // Arrow key control
                    if(event.code === "ArrowLeft" || event.code === "ArrowRight"){
                        await Utils.toggleAnchorMode(Utils.getObjectPropertyArray(Math.collection, "container"), true)
                        const selection = Utils.getSelectedNode()
                        const selClone = selection // Laziness
                        const documentSelection = document.getSelection()
                        await Utils.toggleAnchorMode(Utils.getObjectPropertyArray(Math.collection, "container"), false)

                        // Focus function for math
                        const direction = event.code === "ArrowLeft" ? "moveToRightEnd" : "moveToLeftEnd"
                        const focus = async (selection) => {
                            if(!selection) selection = selClone
                            const id = selection.firstChild.onclick.toString().split("\"")[1].split("\"")[0]
                            Utils.waitForEvent(Math.events, "focus").then(() => {
                                console.log("DIR", direction)
                                Math.collection[id].input[direction]()
                            })
                            selection.firstChild.click()
                        }

                        // Detect by selection change
                        if(selection.nodeName.toLowerCase() === "p" && selection.getAttribute("data") !== null && this.activeMathElement === null){
                            event.preventDefault()
                            if(direction === "moveToRightEnd"){
                                // Wait for same keycode again
                                arrowKeyDoubleTap = focus
                            }else {
                                focus(selection)
                            }
                        }else // NOTE THE ELSE HERE!

                        // Detect by index jump
                        // TODO: Refactor this badness
                        // Known issue: Spamming the arrow key causes the actual selection to be lost while processing the open call
                        if(lastSelection !== null && this.activeMathElement === null && this.moveOutOfThisEvent === false){
                            // This is a special case, where we twice press the arrow key
                            // and the index does not change, but we jump over the math element.
                            // We can detect this by checking the last selection's offset and check if
                            // the current selection's offset is equal to the selected node's parent's number of child nodes
                            // and that the last selection was at index 0
                            // Though we need to be careful, as while in the end or beginning of a line
                            // this will also trigger as the offset will not change
                            // In firefox while moving to the left the offset is 0, while moving to the right it's 1
                            if((window.browser === "firefox" ? documentSelection.anchorNode.nodeName.toLowerCase() === "a" : true)){
                                if((window.browser === "firefox" ? (event.code === "ArrowRight" ? lastSelection > 0 : lastSelection === 0) : lastSelection === 0) && documentSelection.anchorOffset === (window.browser === "firefox" ? (event.code === "ArrowRight" ? 1 : 0) : documentSelection.anchorNode.wholeText.length)){
                                    // Check that we are not in the start / end of the line
                                    const nodeIndex = Utils.getNodeIndex(this.activeLine, selection)
                                    if(nodeIndex !== 0 && nodeIndex !== this.activeLine.childNodes.length - 1){
                                        // Not in the start / end of a line, get the element before the selection and call click
                                        let skippedNode = null
                                        skippedNode = Utils.getNodeByIndex(this.activeLine, nodeIndex - 2)
                                        if(skippedNode === this.hook) return // Cannot skip the hook
                                        // Firefox patch: Element index is different
                                        if(skippedNode === undefined || skippedNode.nodeName.toLowerCase() !== "a"){
                                            skippedNode = Utils.getNodeByIndex(this.activeLine, nodeIndex)
                                        }
                                        focus(skippedNode) // Calling a special focus function for math, click will not work with that!
                                    }
                                }
                            }
                        }
                        lastSelection = documentSelection.anchorOffset
                    }
                    this.moveOutOfThisEvent = false
                })

                
                // Event listener to handle math being opened without an active collection entry
                // We can detect this by check if the onclick function is not defined but the "data"-attribute is
                window.addEventListener("click", async e => {
                    if(e.target.nodeName.toLowerCase() === "img" && e.target.getAttribute("data") !== null && document.activeElement === this.hook){
                        const newConstruct = await Math.create()
                        newConstruct.input.write(e.target.getAttribute("data"))
                        e.target.before(newConstruct.container)
                        if(e.target.parentNode.nodeName.toLowerCase() === "p") {
                            e.target.parentNode.remove()
                        }else {
                            e.target.remove()
                        }
                        Math.open(newConstruct.id)
                    }
                })

                // Document content modification listener
                const observerCallback = async () => {
                    // Enable/disable
                    if(!this.watchDocument) return

                    const reference = this.hook.innerHTML.replace(/<br>/g, "")

                    // Editor is empty. We need to add an empty line
                    if(reference === ""){
                        // Add an empty line
                        this.hook.innerHTML = `<div>${this.activator}</div>`
                        Utils.selectByIndex(0, this.hook)
                    }

                    // Firefox patch: If the image element is in the beginning/end of a line, remove textNodes from within the container
                    if(window.browser === "firefox"){
                        for(const id in Math.collection){
                            const math = Math.collection[id]
                            if(!math.isOpen){
                                // Double parent for "a" container (see Math.close)
                                if(math.image.parentNode !== null && math.image.parentNode.childNodes.length > 1){
                                    let before = true
                                    for(const child of math.image.parentElement.childNodes){
                                        if(child.nodeName.toLowerCase() === "img") {
                                            before = false
                                            continue
                                        }
                                        if(child.nodeName.toLowerCase() === "#text"){
                                            // Move text out of the container
                                            if(before) math.image.parentElement.before(child)
                                            else math.image.parentElement.after(child)
                                            // We can assume the child has selection, so move the caret to it when it has been moved
                                            //Utils.selectByIndex(Utils.getNodeIndex(child), this.activeLine)
                                            Utils.select(child, Utils.getNodeIndex(child) + 1)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Firefox patch: Do not let lines deactivate, when the are emptied
                    if(window.browser === "firefox"){
                        for(const line of this.hook.childNodes){
                            if(line.childNodes.length === 0){
                                let activator = document.createElement("br")
                                line.appendChild(activator) // this.activator
                            }
                        }
                    }
                }

                // Set active mathElement
                Math.events.addEventListener("focus", e => {
                    this.activeMathElement = e.detail
                    if(this.activeMathElement.isOpen === false){
                        this.activeMathElement = null
                    }
                })
                Math.events.addEventListener("blur", () => {
                    // Firefox patch: Detect useless br tags in empty lines
                    if(window.browser === "firefox"){
                        if(this.activeMathElement !== null && this.activeMathElement.isOpen === false && this.activeMathElement.image !== null && this.activeMathElement.image.parentNode !== null){
                            console.log(this.activeMathElement.image.parentNode.parentNode.childNodes)
                            if(this.activeMathElement.image.parentNode.parentNode.childNodes[0].nodeName.toLowerCase() === "br" && this.activeMathElement.image.parentNode.parentNode.childNodes.length === 2){
                                this.activeMathElement.image.parentNode.parentNode.childNodes[0].remove()
                            }
                        }
                    }
                    this.activeMathElement = null
                })

                // Handle moveOut
                Math.events.addEventListener("moveOut", () => {
                    this.moveOutOfThisEvent = true
                })

                // Active line detection
                window.addEventListener("click", async () => {
                    // Get selection data and make sure it's valid
                    const selection = document.getSelection()
                    const line = selection.anchorNode.parentElement === this.hook ? selection.anchorNode : Utils.getParentLine(selection.anchorNode)
                    if(!Utils.isSomeParent(selection.anchorNode, this.hook)) return

                    // Update active line
                    if(line === this.hook || line === this.hook.parentElement) return
                    if(this.activeLine === line) return
                    this.activeLine = line
                    console.debug("[ EDITOR ] Active line change to", this.activeLine)
                })
                window.addEventListener("keydown", async event => {
                    if(event.code === "ArrowUp" || event.code === "ArrowDown"){
                        const selection = document.getSelection()
                        const line = selection.anchorNode.parentElement === this.hook ? selection.anchorNode : Utils.getParentLine(selection.anchorNode)
                        if(!Utils.isSomeParent(selection.anchorNode, this.hook)) return

                        // Update active line
                        if(line === this.hook || line === this.hook.parentElement) return
                        if(this.activeLine === line) return
                        this.activeLine = line
                        console.debug("[ EDITOR ] Active line change to", this.activeLine)
                    }
                })

                // Handle pasting text
                this.hook.addEventListener("paste", async event => {
                    event.preventDefault()
                    const paste = (event.clipboardData || window.clipboardData)
                    Utils.copyToCursor(paste.getData("text/html"))
                }) 

                // Activate document content modification listener
                const observer = new MutationObserver(observerCallback)
                observerCallback()
                observer.observe(this.hook, { attributes: false, childList: true, subtree: true })
                resolve()
            }
            catch(e){
                reject(e)
            }
        })
    }
}

// Export
export default Editor