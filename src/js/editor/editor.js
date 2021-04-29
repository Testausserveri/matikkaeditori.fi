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
        this.target = null
        this.maths = []
        this.saveState = false
        this.mathFocus = null
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
                    if(window.editor.mathFocus != null) window.editor.mathFocus.blur()
                }
                // Create new math element in next line with enter
                if(e.which == 13 && this.mathFocus != null){
                    e.preventDefault()
                    if (window.editor.mathFocus) window.editor.mathFocus.blur()
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
                    window.editor.mathFocus = null
                    this.createMath("", target)
                }
            })
            // Save listener
            this.input.oninput = async () => {
                if(this.saveState == false){
                    console.log("TODO: Save here")
                    //this.saveState = true
                }
            }
            // TODO: DEV DUMMY
            this.target = "test"
        }
        catch(err){
            error("Editor", "Failed to init editor: " + err.stack != undefined ? err.stack : err)
        }
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
            console.log("Creating math...")
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
            }
            // Onopen event - The change to live state (from rendered)
            img.setAttribute("onclick", "window.editor.reopen(\"" + id + "\")")
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
            console.log("Done!")
            return id

        }
        catch(err){
            error("Editor", "Failed to add math: " + err.stack != undefined ? err.stack : err)
        }
    }

    /**
     * Load a filesystem target
     * @param {*} target 
     */
    async load(target){
        try {
            if(this.target != null){
                await this.save()
            }
            this.target = target
            // TODO
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
        }
        catch(err){
            error("Editor", "Failed to save: " + err.stack != undefined ? err.stack : err)
        }
    }
}