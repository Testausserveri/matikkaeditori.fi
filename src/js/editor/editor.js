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
import Utils from "./utils.js"
import Math from "./math.js"

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
        this.resizeObserverNodes = []
        this.resizeObserver = null 
    }

    /**
     * Set editor contents
     * @param {string[]} data
     */
    setContent(data){
        this.watchHook = false
        this.hook.contentEditable = false
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
        this.hook.contentEditable = true
    }

    /**
     * Initialize the editor
     */
    init(){
        let lastSelection = null // Last selected node (during keydown event)
        let arrowKeyDoubleTap = false // Changes to the relevant function call for double tap
        let holdKeydown = false

        // Add a global keyboard listener
        document.addEventListener("keydown", async event => {
            // Make sure the editor is selected
            if(!Utils.isSomeParent(Utils.getSelectedNode(), this.hook)) return
            // Ignore input
            if(holdKeydown) {
                event.preventDefault()
                return
            }

            // --- Moving with arrow keys ---
            // Special left double tap (2 hits in a row means we want to move, otherwise do nothing)
            if(arrowKeyDoubleTap !== false && event.code === "ArrowLeft"){
                arrowKeyDoubleTap()
                arrowKeyDoubleTap = false
                return
            }
            if(event.code === "ArrowLeft") {
                arrowKeyDoubleTap = false
            }
            // Main arrow key control handler
            if(event.code === "ArrowLeft" || event.code === "ArrowRight"){
                await Utils.toggleAnchorMode(Utils.getObjectPropertyArray(Math.collection, "container"), true)
                const selection = Utils.getSelectedNode()
                const selectionClone = selection // Todo: Laziness?
                const documentSelection = document.getSelection()
                
                // Focus function for math
                const direction = event.code === "ArrowLeft" ? "moveToRightEnd" : "moveToLeftEnd"
                const focus = selection => {
                    if(!selection) selection = selectionClone
                    const id = selection.firstChild.onclick.toString().split("\"")[1].split("\"")[0]
                    Utils.waitForEvent(Math.events, "focus").then(() => {
                        Math.collection[id].input[direction]()
                    })
                    selection.firstChild.click()
                }

                // Detect by selection change
                if(selection.nodeName.toLowerCase() === "a" && selection.getAttribute("data") !== null && this.activeMathElement === null){
                    event.preventDefault()
                    holdKeydown = true
                    if(direction === "moveToRightEnd"){
                        // Wait for same keycode again
                        // TODO: Select start of text node right from math
                        Utils.select(this.activeLine, Utils.getNodeIndex(this.activeLine, Utils.getSelectedNode()) + 1)
                        if(this.moveOutOfThisEvent) focus(selection)
                        else arrowKeyDoubleTap = focus
                    }else {
                        focus(selection)
                    }
                }else {
                    // Detect by index jump
                    if(
                        // We need the last selection & this only affects moving to the left
                        lastSelection && event.code === "ArrowLeft" 
                        // Firefox patch: Only handle when text is selected
                        && (window.browser === "firefox" ? documentSelection.anchorNode.nodeName.toLowerCase() === "text" : true)
                        // Not in the start / end of a line
                        && Utils.getNodeIndex(this.activeLine, lastSelection.anchorNode) !== 0 && Utils.getNodeIndex(this.activeLine, lastSelection.anchorNode) !== lastSelection.anchorNode.parentNode.childNodes.length
                    ){
                        // Detect the jump
                        if(window.browser === "firefox" ? 
                            // On firefox
                            false // Nothing to handle on firefox
                            :
                            // On something else
                            lastSelection.anchorOffset < documentSelection.anchorOffset 
                            && documentSelection.anchorOffset === documentSelection.anchorNode?.nodeValue?.length
                        ){
                            let skippedNode = Utils.getNodeByIndex(this.activeLine, lastSelection.anchorOffset - 1)
                            if(skippedNode){
                                if(skippedNode.nodeName.toLowerCase() === "a"){
                                    focus(skippedNode)
                                }else if(window.browser === "firefox"){
                                    skippedNode = Utils.getNodeByIndex(this.activeLine, lastSelection.anchorOffset)
                                    focus(skippedNode)
                                }
                            }
                        }
                    }
                    lastSelection = { anchorOffset: documentSelection.anchorOffset, anchorNode: documentSelection.anchorNode }
                }
                await Utils.toggleAnchorMode(Utils.getObjectPropertyArray(Math.collection, "container"), false)
                holdKeydown = false
            }
            this.moveOutOfThisEvent = false

            // --- Math element control ---
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
                Math.close(this.activeMathElement.id)
                return
            }
            // Use enter to create new math while in math
            if(event.code === "Enter" && this.activeMathElement !== null){
                event.preventDefault()
                // Move out and create a new line
                if(event.shiftKey){
                    Math.close(this.activeMathElement.id)
                    const newLine = document.createElement("div")
                    newLine.innerHTML = "<br>"
                    this.activeLine.after(newLine)
                    Utils.selectByIndex(Utils.getNodeIndex(this.hook, newLine), this.hook)
                }else {
                    // Crate new line after current active line
                    const id = this.activeMathElement.id
                    //const offset = Utils.getNodeIndex(this.activeLine, this.activeMathElement.container)
                    Math.close(this.activeMathElement.id)
                    // Make sure the math element just closed still exists (may get deleted if empty)
                    if(Math.collection[id] !== undefined){
                        // Return caret to previous selection
                        // If line is empty, select the start
                        /*if(this.activeLine.childNodes.length === 1 && this.activeLine.childNodes[0].nodeName.toLowerCase() === "br"){
                            Utils.selectByIndex(Utils.getNodeIndex(this.hook, this.activeLine), this.hook)
                        }else {
                            // Make sure the editor is not empty
                            if(this.hook.childNodes.length !== 0) Utils.selectByIndex(offset - 1, this.activeLine)
                        }*/
                        // Make new line
                        const newLine = document.createElement("div")
                        this.activeLine.after(newLine)
                        Utils.selectByIndex(Utils.getNodeIndex(this.hook, newLine), this.hook)
                        //Utils.select(this.hook, this.hook.childNodes.indexOf(this.activeLine) + 1)
                        const mathElement = Math.create()
                        newLine.appendChild(mathElement.container)
                        Math.open(mathElement.id)
                    }
                }
                return
            }

            // --- Patches to browser content-editable related to document manipulation ---
            if(event.code === "Enter" && window.browser === "firefox"){
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
            // Disable shift+Enter
            if(event.shiftKey && event.key === "Enter" && this.activeMathElement === null){
                // Causes issues at least on chromium, prevention is required
                event.preventDefault()
                // Create a new line normally
                const newLine = document.createElement("div")
                newLine.innerHTML = "<br>"
                this.activeLine.after(newLine)
                this.activeLine = newLine
                console.debug("[ EDITOR ] Active line change to", this.activeLine)
                Utils.selectByIndex(Utils.getNodeIndex(this.hook, this.activeLine), this.hook)
                return
            }
        })

        // Event listener to handle math being opened without an active collection entry
        window.addEventListener("click", event => {
            if(event.target.nodeName.toLowerCase() === "img" && event.target.getAttribute("data") !== null && document.activeElement === this.hook){
                const newMath = Math.create()
                newMath.input.write(btoa(event.target.getAttribute("data")))
                event.target.before(newMath.container)
                if(event.target.parentNode.nodeName.toLowerCase() === "a"){
                    event.target.parentNode.remove()
                }else {
                    event.target.remove()
                }
                Math.open(newMath.id)
            }
        })

        // Set active math element
        Math.events.addEventListener("focus", event => {
            this.activeMathElement = event.detail
            if(this.activeMathElement.isOpen === false){
                this.activeMathElement = null
            }
        })
        Math.events.addEventListener("blur", () => {
            // Firefox patch: Detect useless br tags in empty lines
            if(window.browser === "firefox"){
                if(this.activeMathElement !== null && this.activeMathElement.isOpen === false && this.activeMathElement.image !== null && this.activeMathElement.image.parentNode !== null){
                    if(this.activeMathElement.image.parentNode.parentNode.childNodes[0].nodeName.toLowerCase() === "br" && this.activeMathElement.image.parentNode.parentNode.childNodes.length === 2){
                        this.activeMathElement.image.parentNode.parentNode.childNodes[0].remove()
                    }
                }
            }
            // Select end of math element
            if(this.watchHook && !this.moveOutOfThisEvent && this.activeLine.childNodes.length <= Utils.getNodeIndex(this.activeLine, this.activeMathElement.container) + 1) Utils.select(this.activeLine, Utils.getNodeIndex(this.activeLine, this.activeMathElement.container) + 1)
            this.activeMathElement = null
        })
        // Handle moveOut
        Math.events.addEventListener("moveOut", () => {
            this.moveOutOfThisEvent = true
        })

        // Set active line
        window.addEventListener("click", () => {
            // Get selection data and make sure it's valid
            const selection = document.getSelection()
            const line = selection.anchorNode.parentElement === this.hook ? selection.anchorNode : Utils.getParentLine(selection.anchorNode)

            // If we have only one line in the editor, we can focus that (as there are no other options)
            if(this.hook.childNodes.length === 1 && this.activeLine !== this.hook.childNodes[0]) {
                this.activeLine = this.hook.childNodes[0]
                Utils.selectByIndex(0, this.hook)
                console.debug("[ EDITOR ] Active line change to", this.activeLine)
                return
            }

            if(!Utils.isSomeParent(selection.anchorNode, this.hook)) return

            // Update active line
            if(line === this.hook || line === this.hook.parentElement) return
            if(this.activeLine === line) return
            this.activeLine = line
            console.debug("[ EDITOR ] Active line change to", this.activeLine)
        })
        window.addEventListener("keydown", async event => {
            if(event.code === "ArrowUp" || event.code === "ArrowDown"){
                // Move with arrow keys
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
            await Utils.copyToCursor(paste.getData("text/html"), paste.files)
            this.hook.oninput() // Counts as input
        }) 
        // Activate document content modification listener
        const observerCallback = async e => {
            // Enable/disable
            if(!this.watchHook) return

            const reference = this.hook.innerHTML.replace(/<br>/g, "")

            // Editor is empty. We need to add an empty line
            if(reference === ""){
                // Add an empty line
                this.hook.innerHTML = "<div><br></div>"
                Utils.selectByIndex(0, this.hook)
            }

            // Handle active line change with enter
            const line = Utils.getSelectedNode()?.nodeName?.toLowerCase() === "div" ? Utils.getSelectedNode() : Utils.getParentLine(Utils.getSelectedNode())
            if(line !== this.activeLine && line !== this.hook){
                console.debug("[ EDITOR ] Active line change to", this.activeLine)
                this.activeLine = line
            }

            // Text modified? What is activeLine?
            const parentLine = e && e.addedNodes && e.addedNodes[0] !== null ? Utils.getParentLine() : null
            if(parentLine && this.activeLine !== parentLine){
                this.activeLine = parentLine
                console.debug("[ EDITOR ] Active line change to", this.activeLine)
            }

            // Handle resize observers for images
            if(!this.resizeObserver) this.resizeObserver = new ResizeObserver(() => {
                if(typeof this.hook.oninput === "function") this.hook.oninput()
            })
            let newResizeList = []
            for(const line of this.hook.childNodes){
                for(const node of line.childNodes){
                    if(node.nodeName.toLowerCase() === "article"){
                        newResizeList.push(node)
                    }
                }
            }
            // We need to re-generate the observers
            if(newResizeList != this.resizeObserverNodes){
                this.resizeObserver.disconnect()
                for(const node of newResizeList) this.resizeObserver.observe(node)
                console.debug("[ EDITOR ] Resize observer list recreated.")
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

            // Firefox patch: Do not let lines deactivate, when there's only a math element present
            if(window.browser === "firefox"){
                // Left
                if(this.activeLine.childNodes[0].nodeName.toLowerCase() === "a"){
                    this.activeLine.childNodes[0].before(document.createElement("br"))
                }
                // Right
                if(this.activeLine.childNodes[this.activeLine.childNodes.length - 1].nodeName.toLowerCase() === "a"){
                    this.activeLine.childNodes[this.activeLine.childNodes.length - 1].after(document.createElement("br"))
                }
            }
        }
        const observer = new MutationObserver(observerCallback)
        observerCallback()
        observer.observe(this.hook, { attributes: false, childList: true, subtree: true })
        return
    }

    getContent(){
        return ["<meta \"version\"=\"" + localStorage.getItem("version") + "\"></meta>"].concat(Utils.toEmbedded(this.hook))
    }
}

/**
 * @type {MathEditor}
 */
export default Editor