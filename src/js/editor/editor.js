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
        this.mathFocus = null
        this.oninput = null
    }

    /**
     * Enable/disable math elements as anchors
     * @param {*} state 
     */
    setAnchor(state){
        this.hasAnchors = state
        for(const id in this.maths){
            const math = this.maths[id]
            math.container.contentEditable = state
        }
    }

    /**
     * Initialize the editor
     */
    async init(){
        try {
            // Register keyboard listener
            window.$(window).keydown(e => {
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
                if(e.which == 13 && this.mathFocus != null && !e.shiftKey){
                    e.preventDefault()
                    if (window.internal.ui.editor.mathFocus) window.internal.ui.editor.mathFocus.blur()
                    this.input.focus()
                    // TODO: Make this open the next line, no idea how to do that rn
                    //document.execCommand("insertText", false, "\n")
                    let target = null
                    for(let child of this.input.children){
                        if(child.tagName.toLowerCase() == "div"){
                            target = child
                        }
                    }
                    if(target == null) target = this.input
                    window.internal.ui.editor.mathFocus = null
                    console.log("Runs")
                    this.createMath("", target)
                }
                // Use arrow keys to move into math elements
                if(e.which === 37){ // Left
                    // Quite the hacky way to make the containers valid anchors
                    this.setAnchor(true)
                    // We need to timeout for 10 ms here. It just needs to be done.
                    setTimeout(() => {
                        let node = document.getSelection().anchorNode
                        node = (node.nodeType == 3 ? node.parentNode : node)
                        if(node !== this.input && node.nodeName === "P"){
                            // Move into math
                            console.log("[ EDITOR ] Jumping to math...")
                            const id = node.firstChild.onclick.toString().split("\"")[1].split("\"")[0]
                            node.firstChild.click()
                            this.maths[id].input.moveToRightEnd()
                            e.preventDefault()
                        }
                        for(const id in this.maths){
                            const math = this.maths[id]
                            math.container.contentEditable = true
                        }
                        this.setAnchor(false)
                    }, 10)
                }
                if(e.which === 39){ // Right
                    // Quite the hacky way to make the containers valid anchors
                    this.setAnchor(true)
                    // We need to timeout for 10 ms here. It just needs to be done.
                    setTimeout(() => {
                        let node = document.getSelection().anchorNode
                        node = (node.nodeType == 3 ? node.parentNode : node)
                        if(node !== this.input && node.nodeName === "P"){
                            // Move into math
                            console.log("[ EDITOR ] Jumping to math")
                            const id = node.firstChild.onclick.toString().split("\"")[1].split("\"")[0]
                            node.firstChild.click()
                            this.maths[id].input.moveToLeftEnd()
                            e.preventDefault()
                        }
                        for(const id in this.maths){
                            const math = this.maths[id]
                            math.container.contentEditable = true
                        }
                        this.setAnchor(false)
                    }, 10)
                }

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
        for(const node of this.input.childNodes){
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
                        this.maths[id].inputElement.children[0].children[0].blur()
                        setTimeout(() => {
                            const range = document.createRange()
                            const sel = window.getSelection()
                            let pos = this.getLengthUntil(this.maths[id].container)
                            console.log("[ EDITOR ] Jumping out of math...")
                            if(direction > 0) pos += 1 // Handle direction
                            range.setStart(this.input, pos)
                            range.collapse(true)
                            sel.removeAllRanges()
                            sel.addRange(range)
                            this.input.focus()
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
                // Modify container size
                let dims = img.getBoundingClientRect()
                this.maths[id].container.style.width = Math.ceil(dims.width - 1 + 10) + "px"
                this.maths[id].container.style.height = Math.ceil(dims.height - 5 + 10) + "px"
                // Finalize
                this.maths[id].inputElement.style.display = "none" // Hide the math element
                this.maths[id].input.select()
                this.maths[id].input.keystroke("Backspace")
                // Set UI stuff
                window.setLatexCommandsVisibility(false)
                this.mathFocus = null
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
                            console.debug("As math & text:", mathStart)
                            mathStart = mathStart.split("</math>")
                            // Math part              
                            await this.createMath(mathStart[0], targetLine)

                            // Text part
                            if(mathStart[1]){
                                console.debug("After math:", mathStart[1])
                                // There can only be one element here!
                                const textNode = document.createTextNode(mathStart[1])
                                targetLine.appendChild(textNode)
                            }
                        }else {
                            console.debug("As text:", mathStart)
                            // Text part
                            const textNode = document.createTextNode(mathStart)
                            targetLine.appendChild(textNode)
                        }
                    }
                }else {
                    console.debug("As raw text:", line)
                    const textNode = document.createElement("div")
                    // NOT EMPTY!
                    if(line === "") line = "‎" // There must be a space here
                    textNode.innerText = line
                    targetLine = textNode
                    this.input.appendChild(textNode)
                }
            }
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
                    console.debug("Elem:", node.nodeName)
                    switch (node.nodeName.toLowerCase()){
                    case "div": {
                        // Marks own line
                        format.push("")
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
            if(format[0] === "") format.splice(0, 1)
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