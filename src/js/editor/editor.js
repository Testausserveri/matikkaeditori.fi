/* global MathQuill, MathJax */
/**
 * Math editor
 * 
 * By: @Esinko
 */
import error from "../error.js"
import * as uuid from "../worker-components/uuid.js"
export default class Editor {
    constructor(inputElement){
        this.input = inputElement
        this.hasAnchors = null
        this.target = null
        this.maths = []
        this.toolAttachPoint = null
        this.saveState = false
        this.movedOutOfLastKeydown = false
        this.mathFocus = null
        this.activeLine = null
        this.oninput = null
        this.events = new EventTarget()
        this.domObserver = null
        this.domObserverCallback = null
    }

    /**
     * Enable/disable math elements as anchors
     * @param {*} state 
     */
    async setAnchor(state){
        return new Promise((resolve) => {
            this.hasAnchors = state
            const keys = Object.keys(this.maths)
            for(let i = 0; i < keys.length; i++){
                const id = keys[i]
                const math = this.maths[id]
                math.container.contentEditable = state
                if(i+1 === keys.length){
                    // TODO: Handle the element changes with a promise?
                    setTimeout(() => {
                        resolve()
                    }, 10)
                }
            }
        })
    }

    updateActiveLine(jumped){
        const selection = window.getSelection().anchorNode?.parentElement
        if(this.mathFocus == null && !jumped){
            if(this.activeLine !== selection) this.activeLine = selection
            if(selection === null || selection == undefined) this.activeLine = this.input
        }

        this.movedOutOfLastKeydown = false
    }

    /**
     * Initialize the editor
     */
    async init(){
        try {
            // Register keyboard listener
            window.$(window).keydown(async e => {
                // Add new math element
                if(e.ctrlKey && e.key == "e"){
                    e.preventDefault()
                    if(this.target != null) this.createMath()
                }
                // Close math with esc
                if(e.which == 27){
                    e.preventDefault()
                    if(window.internal.ui.editor.mathFocus != null) window.internal.ui.editor.mathFocus.blur()
                }
                // Create new math element in next line with enter
                // Move out of the formula with shift
                if(e.which == 13 && this.mathFocus != null){
                    e.preventDefault()
                    if(e.shiftKey){
                        this.input.focus()
                        const newLine = document.createElement("div")
                        // NOT EMPTY!
                        newLine.innerText = "‎"
                        this.input.appendChild(newLine)
                        // Move caret
                        const range = document.createRange()
                        const sel = window.getSelection()
                        range.setStart(this.input, this.input.childNodes.length)
                        range.collapse(true)
                        sel.removeAllRanges()
                        sel.addRange(range)
                    }else {
                        // Blur math
                        let self = this
                        this.events.addEventListener("mathBlur", async function () {
                            // Remove this listener
                            self.events.removeEventListener("mathBlur", this)
                            // TODO: Make this open the next line, no idea how to do that rn
                            //document.execCommand("insertText", false, "\n")
                            let target = null
                            for(let child of self.input.children){
                                if(child.tagName.toLowerCase() == "div"){
                                    target = child
                                }
                            }
                            if(target == null) target = self.input
                            window.internal.ui.editor.mathFocus = null
                            self.createMath("", target)
                        })
                        this.input.focus()
                    }
                }
                // Use arrow keys to move into math elements
                // These return as activeLine is updated after
                let jumped = this.movedOutOfLastKeydown
                if(e.which === 37){ // Left
                    // Quite the hacky way to make the containers valid anchors
                    await this.setAnchor(true)
                    let node = document.getSelection().anchorNode
                    node = (node.nodeType == 3 ? node.parentNode : node)
                    if(node !== this.input && node.nodeName === "P"){
                        // Move into math
                        console.log("[ EDITOR ] Jumping to math...")
                        jumped = true
                        const id = node.firstChild.onclick.toString().split("\"")[1].split("\"")[0]
                        node.firstChild.click()
                        this.maths[id].input.moveToRightEnd()
                        e.preventDefault()
                        return
                    }
                    for(const id in this.maths){
                        const math = this.maths[id]
                        math.container.contentEditable = true
                    }
                    await this.setAnchor(false)
                }
                if(e.which === 39){ // Right
                    // Quite the hacky way to make the containers valid anchors
                    await this.setAnchor(true)
                    let node = document.getSelection().anchorNode
                    node = (node.nodeType == 3 ? node.parentNode : node)
                    if(node !== this.input && node.nodeName === "P"){
                        // Move into math
                        console.log("[ EDITOR ] Jumping to math...")
                        jumped = true
                        const id = node.firstChild.onclick.toString().split("\"")[1].split("\"")[0]
                        node.firstChild.click()
                        this.maths[id].input.moveToLeftEnd()
                        e.preventDefault()
                        return
                    }
                    for(const id in this.maths){
                        const math = this.maths[id]
                        math.container.contentEditable = true
                    }
                    await this.setAnchor(false)
                }

                // Update active line
                this.updateActiveLine(jumped)

                //console.debug("Key", e.which)
            })
            
            // Save listener
            this.input.oninput = async () => {
                // Re-align tools
                if(this.mathFocus !== null) this.attachTools()
                if(this.saveState == false){
                    window.internal.ui.editor.save()
                }
            }

            // Compatibility bullshit patches

            // Document modification listener
            this.domObserverCallback = async () => {
                // If the document is empty, force an empty inner DIV element to appear (focus issues)
                let htmlReference = this.input.innerHTML.replace(/<br>/g, "")
                if(htmlReference === ""){
                    // NOT EMPTY
                    this.input.innerHTML = "<div>" + "‎" + "</div>"
                }
            }
            this.domObserver = new MutationObserver(this.domObserverCallback)
            this.domObserver.observe(this.input, { attributes: false, childList: true, subtree: true })   
        }
        catch(err){
            error("Editor", "Failed to init editor: " + err.stack != undefined ? err.stack : err)
        }
    }
    
    /**
     * Attach math tools
     * @param {HTMLElement} element 
     */
    attachTools(element){
        if(element) this.toolAttachPoint = element
        else element = this.toolAttachPoint
        const dims = element.getBoundingClientRect()
        const top = dims.top + dims.height
        const left = dims.left + dims.width
        const tools = document.getElementById("mathTools")
        tools.style.display = "block"
        tools.style.top = top + "px"
        tools.style.left = (left - tools.getBoundingClientRect().width + 5) + "px"
    }

    /**
     * Detach math tools
     */
    detachTools(){
        const tools = document.getElementById("mathTools")
        tools.style.display = "none"
    }

    /**
     * Get selection offset until an element
     * @param {*} element 
     */
    getLengthUntil(element){
        let total = 0
        for(const node of this.activeLine.childNodes){
            if(element === node) break
            total += 1
        }
        return total
    }

    /**
     * Reopen a math element by id
     */
    reopen(id){
        let latexData = this.maths[id].container.getAttribute("data")
        this.maths[id].input.write(latexData) // Write the latex back in
        this.maths[id].image.style.display = "none"
        this.maths[id].inputElement.style.display = ""
        this.maths[id].container.style.width = ""
        this.maths[id].container.style.height = ""
        this.maths[id].container.className = "mathContainer open"
        this.maths[id].closed = false
        this.maths[id].input.focus()
        this.mathFocus = this.maths[id].input
        window.setLatexCommandsVisibility(true)
        this.maths[id].input.reflow()
        this.attachTools(this.maths[id].container)
    }

    /**
     * Insert a new node in the current location in a text field
     * @param {*} node The node to add
     */
    insertNodeAtCaret(node) {
        // Verify the input has focus
        if(document.activeElement != this.input) this.input.focus()
        var sel, range
        if (window.getSelection) {
            sel = window.getSelection()
            if (sel.getRangeAt && sel.rangeCount) {
                range = sel.getRangeAt(0)
                range.deleteContents()
                range.insertNode( node )
            }
        } else if (document.selection && document.selection.createRange) {
            document.selection.createRange().insertNode(node)
        }
    }

    /**
     * Create a new math element
     */
    async createMath(latex, here){
        try {
            console.log("[ EDITOR ] Creating math...")
            // Create the elements
            let img = document.createElement("img")
            img.draggable = false
            img.className = "mathImage"
            let container = document.createElement("p")
            container.contentEditable = false
            container.className = "mathContainer open"
            let math = document.createElement("span")
            container.appendChild(math)
            // Create math input
            let id = await uuid.v4()
            let mq = MathQuill.getInterface(2)
            let latexInput = mq.MathField(math, {
                spaceBehavesLikeTab: false,
                handlers: {
                    edit: async () => {
                        // Write latex data to the container data attribute
                        if(this.maths[id].closed == false) container.setAttribute("data", latexInput.latex())
                    },
                    enter: async () => {
                        // TODO: Implement add new math input thingy here
                    },
                    moveOutOf: async (direction) => {
                        let active = this.activeLine
                        this.maths[id].inputElement.children[0].children[0].blur()
                        this.movedOutOfLastKeydown = true
                        setTimeout(() => {
                            const range = document.createRange()
                            const sel = window.getSelection()
                            console.log("[ EDITOR ] Jumping out of math...")
                            let pos = this.getLengthUntil(this.maths[id].container)
                            if(direction > 0) pos += 1 // Handle direction
                            range.setStart(active, pos)
                            range.collapse(true)
                            sel.removeAllRanges()
                            sel.addRange(range)
                            active.focus()
                        }, 10)
                    }
                }
            })
            // Register the math input
            this.maths[id] = {
                container: container,
                input: latexInput,
                inputElement: math,
                image: img,
                closed: false
            }
            // Onclose event - The change to rendered state
            math.children[0].children[0].onblur = async () => { // This element loses focus when the input closes
                // Call the close event only once
                if(this.maths[id].closed) return
                this.maths[id].closed = true
                // Detach tools
                this.detachTools()
                // If the latex input is empty remove the element
                if(this.maths[id].input.latex() == ""){
                    this.maths[id].image.remove()
                    this.maths[id].container.remove()
                    delete this.maths[id]
                    return
                }
                this.maths[id].container.className = "mathContainer closed"
                // Render the latex into svg
                let render = await MathJax.tex2svg(latexInput.latex(), {em: 10, ex: 5, display: true})
                let data = render.getElementsByTagName("svg")[0].outerHTML //Get the raw svg data
                // Configure the image element
                let img = this.maths[id].image
                //img.style.width = Math.ceil(dims.width - 1) + "px"
                //img.style.height = Math.ceil(dims.height - 5) + "px"
                img.style.display = "inline-block"
                // Add in the svg data
                img.src = "data:image/svg+xml;base64," + window.btoa(unescape(encodeURIComponent(data)))
                // Replace the math element with the image
                await container.insertBefore(img, this.maths[id].inputElement)
                // Finalize
                this.maths[id].inputElement.style.display = "none" // Hide the math element
                this.maths[id].input.select()
                this.maths[id].input.keystroke("Backspace")
                // Compatibility things
                // Check for text nodes before & after
                const myIndex = Array.from(container.parentElement.childNodes).indexOf(container)
                // Check before
                let textNode
                if(typeof container.parentElement.childNodes[myIndex - 1] === "undefined" || container.parentElement.childNodes[myIndex - 1].nodeName.toLowerCase() !== "#text"){
                    textNode = document.createTextNode("‎")
                    container.before(textNode)
                }
                // Check after
                if(typeof container.parentElement.childNodes[myIndex + 1] === "undefined" || container.parentElement.childNodes[myIndex + 1].nodeName.toLowerCase() !== "#text"){
                    textNode = document.createTextNode("‎")
                    container.after(textNode)
                }
                // Set UI stuff
                window.setLatexCommandsVisibility(false)
                this.mathFocus = null
                this.events.dispatchEvent(new CustomEvent("mathBlur"))
                console.log("[ EDITOR ] Math unfocused")
            }
            // Onopen event - The change to live state (from rendered)
            img.setAttribute("onclick", "window.internal.ui.editor.reopen(\"" + id + "\")")
            // Write possible predefined latex
            if(latex != undefined) latexInput.write(latex)
            // Append to the editor
            if(here == undefined){
                this.insertNodeAtCaret(container)
            }else {
                here.appendChild(container)
            }
            // Focus the input
            latexInput.focus()
            this.mathFocus = latexInput
            this.events.dispatchEvent(new CustomEvent("mathFocus"))
            // Set UI stuff
            window.setLatexCommandsVisibility(true)
            this.attachTools(container)
            return id

        }
        catch(err){
            error("Editor", "Failed to add math: " + err.stack != undefined ? err.stack : err)
        }
    }

    /**
     * Load a filesystem target
     * @param {*} target 
     * @param {*} id
     */
    async load(target, id){
        try {
            if(this.target != null){
                await this.save()
            }
            // Target is filesystem answer
            this.input.innerHTML = ""
            this.target = target
            this.target.id = id
            console.log("[ Filesystem ] Load:", this.target)
            let targetLine = this.input
            // Parse
            for(let line of this.target.data){
                if(line.includes("<math>")){
                    line = line.split("<math>")
                    
                    // Create line
                    const textNode = document.createElement("div")
                    // NOT EMPTY!
                    if(line === "") line = "‎" // There must be a space here
                    targetLine = textNode
                    this.input.appendChild(textNode)

                    for(let mathStart of line){
                        // This is math
                        if(mathStart.includes("</math>")){
                            mathStart = mathStart.split("</math>")
                            // Math part              
                            await this.createMath(mathStart[0], targetLine)

                            // Text part
                            if(mathStart[1]){
                                // There can only be one element here!
                                const textNode = document.createTextNode(mathStart[1])
                                targetLine.appendChild(textNode)
                            }
                        }else {
                            // Text part
                            const textNode = document.createTextNode(mathStart)
                            targetLine.appendChild(textNode)
                        }
                    }
                }else {
                    const textNode = document.createElement("div")
                    // NOT EMPTY!
                    if(line === "") line = "‎" // There must be a space here
                    textNode.innerText = line
                    targetLine = textNode
                    this.input.appendChild(textNode)
                }
            }
            // Set active line on first load
            this.activeLine = this.input.childNodes[0]
        }
        catch(err){
            error("Editor", "Failed to load: " + err.stack != undefined ? err.stack : err)
        }
    }

    /**
     * Save data to filesystem target
     */
    async save(){
        try {
            // Save here
            // Format in editor:
            // Text nodes are in the original line
            // A new line can be marked by <br>
            // Text nodes as are their own lines, which include math elements
            let format = [""]
            const parse = (main) => {
                for(const node of main.childNodes){
                    switch (node.nodeName.toLowerCase()){
                    case "div": {
                        // Marks own line
                        if(format.length !== 1 && format[0] !== "") format.push("")
                        parse(node)
                        break
                    }
                    case "#text": {
                        // First line
                        format[format.length - 1] += node.wholeText
                        break
                    }
                    case "p": {
                        // Math element
                        format[format.length - 1] += "<math>" + node.getAttribute("data") + "</math>"
                        break
                    }
                    case "br": {
                        // Line break in text nodes
                        format.push("")
                    }
                    }
                }
            }
            parse(this.input)

            for(let line of format){
                line = line.replace(/‎/g, "")
            }
            
            console.log("[ EDITOR ] Saved:", format)
            await window.internal.workers.api("Filesystem", "write", {
                instance: window.internal.ui.activeFilesystemInstance,
                write: {
                    data: format,
                    type: 0
                },
                id: this.target.id
            })
        }
        catch(err){
            error("Editor", "Failed to save: " + err.stack != undefined ? err.stack : err)
        }
    }
}