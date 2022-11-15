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
import Utils from "./utils"
import Math from "./math"

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
    constructor(hook) {
        if (!Utils.isSomeParent(hook, document.body)) throw new Error("The hook element has to be in the DOM")
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
        this.observerCallback = null
    }

    /**
     * Set editor contents
     * @param {string[]} data
     */
    setContent(data) {
        this.watchHook = false
        this.hook.contentEditable = false
        this.hook.innerHTML = ""
        Math.flush()
        this.observerCallback()

        // Parse
        console.log("[ EDITOR ] Setting editor content...")
        const content = []
        for (const line of data) {
            content.push(Utils.parseEmbedded(line))
        }
        console.log("[ EDITOR ] Parser output:", content)

        // Process each line
        let wrote = false
        for (const line of content) {
            let lineElement = null
            if (line.length === 0) {
                lineElement = document.createElement("div")
                lineElement.appendChild(document.createElement("br"))
                this.hook.appendChild(lineElement)
                if (!wrote) wrote = true
            } else {
                for (const element of line) {
                    if (element.name === "meta") {
                        // Meta tag!
                        console.log(
                            "[ EDITOR ]", "Save META:", element.attributes
                        )
                        // eslint-disable-next-line no-continue
                        continue
                    }
                    if (!lineElement) lineElement = document.createElement("div")
                    const result = Utils.fill(element)
                    if (result !== null) lineElement.appendChild(result)
                }
                if (lineElement !== null) {
                    this.hook.appendChild(lineElement)
                    if (!wrote) wrote = true
                }
            }
        }
        if (!wrote) this.hook.innerHTML = "<div><br></div>" // Empty document

        // Toggle math
        for (const id of Object.keys(Math.collection)) {
            Math.collection[id].writable = false
            Math.open(id)
            Math.close(id)
            if (Math.collection[id] !== undefined) Math.collection[id].writable = true
        }

        this.watchHook = true
        this.observerCallback()
        this.hook.contentEditable = true
    }

    /**
     * Initialize the editor
     */
    init() {
        let lastSelection = null // Last selected node (during keydown event)
        let holdKeydown = false // Ignore the keyboard event

        // Global keyboard listener
        document.addEventListener("keydown", (event) => {
            // Only catch events when the editor is active
            if (!Utils.isSomeParent(Utils.getSelectedNode(), this.hook)) return

            // --------------------------------------------------------------------------------------------------------------
            //
            // Passive listeners
            //
            //--------------------------------------------------------------------------------------------------------------

            // Update active line while moving up or down with arrow keys
            if (event.code === "ArrowUp" || event.code === "ArrowDown") {
                // Move with arrow keys
                const selection = document.getSelection()
                const line = selection.anchorNode.parentElement === this.hook ? selection.anchorNode : Utils.getParentLine(selection.anchorNode)
                if (!Utils.isSomeParent(selection.anchorNode, this.hook)) return

                // Update active line
                if (line === this.hook || line === this.hook.parentElement) return
                if (this.activeLine === line) return
                this.activeLine = line
                console.debug("[ EDITOR ] Active line change to", this.activeLine)
            }

            // --------------------------------------------------------------------------------------------------------------
            //
            // Moving in/out of math elements with arrow keys
            //
            // --------------------------------------------------------------------------------------------------------------

            // Ignore input
            if (holdKeydown) { event.preventDefault(); return }

            // Main arrow key control handler
            // TODO: Refactor this
            if (!event.ctrlKey && (event.code === "ArrowLeft" || event.code === "ArrowRight")) {
                // await Utils.toggleAnchorMode(Utils.getObjectPropertyArray(Math.collection, "container"), true)
                const selection = Utils.getSelectedNode()
                const selectionClone = selection // Todo: Laziness?
                const documentSelection = document.getSelection()

                // Focus function for math
                const direction = event.code === "ArrowLeft" ? "moveToRightEnd" : "moveToLeftEnd"
                const focus = (toSelect = selectionClone) => {
                    const id = toSelect.getAttribute("math-id") ?? toSelect.parentElement.getAttribute("math-id")
                    Utils.waitForEvent(Math.events, "focus").then(() => {
                        Math.collection[id].labels[1].onclick() // Manually force the display the dynamic interface
                        Math.collection[id].dynamicInterface.focus()
                        Math.collection[id].dynamicInterface[direction]()
                    });
                    (toSelect.firstChild ?? toSelect).click()
                }

                // Firefox needs it's own method of detection
                if (window.browser === "firefox") {
                    const elementList = Utils.listToArray(documentSelection.anchorNode.parentElement.childNodes)
                    const selectionIndex = Utils.getNodeIndex(documentSelection.anchorNode.parentElement, documentSelection.anchorNode)
                    if ( // At start (from right)
                        documentSelection.anchorNode.nodeName.toLowerCase() === "#text" &&
                        elementList[selectionIndex - 1]?.nodeName === "MATH" &&
                        documentSelection.anchorOffset === 0
                    ) {
                        focus(elementList[selectionIndex - 1])
                    } else if ( // At end (from left)
                        documentSelection.anchorNode.nodeName.toLowerCase() === "#text" &&
                        elementList[selectionIndex + 1]?.nodeName === "MATH" &&
                        documentSelection.anchorOffset === documentSelection.anchorNode.textContent.length
                    ) {
                        focus(elementList[selectionIndex + 1])
                    }
                }

                // Normal ways of detection
                // Detect by selection change
                if (
                    selection.nodeName.toLowerCase() === (window.browser === "firefox" ? "img" : "math") &&
                    selection.getAttribute("math") !== null &&
                    this.activeMathElement === null
                ) {
                    event.preventDefault()
                    holdKeydown = true
                    focus(selection)
                } else {
                    // Detect by index jump
                    if (
                        // We need the last selection & this only affects moving to the left
                        lastSelection && event.code === "ArrowLeft" &&
                        // Not in the start / end of a line
                        Utils.getNodeIndex(this.activeLine, lastSelection.anchorNode) !== 0 && Utils.getNodeIndex(this.activeLine, lastSelection.anchorNode) !== lastSelection.anchorNode?.parentNode?.childNodes?.length &&
                        // Detect the jump
                        lastSelection.anchorOffset < documentSelection.anchorOffset &&
                        documentSelection.anchorOffset === documentSelection.anchorNode?.nodeValue?.length
                    ) {
                        let skippedNode = Utils.getNodeByIndex(this.activeLine, lastSelection.anchorOffset - 1)
                        if (skippedNode) {
                            if (skippedNode.nodeName.toLowerCase() === "math") {
                                focus(skippedNode)
                            } else if (window.browser === "firefox") {
                                skippedNode = Utils.getNodeByIndex(this.activeLine, lastSelection.anchorOffset)
                                focus(skippedNode)
                            }
                        }
                    }
                    lastSelection = { anchorOffset: documentSelection.anchorOffset, anchorNode: documentSelection.anchorNode }
                }
                // await Utils.toggleAnchorMode(Utils.getObjectPropertyArray(Math.collection, "container"), false)
                holdKeydown = false
            }
            this.moveOutOfThisEvent = false

            // --------------------------------------------------------------------------------------------------------------
            //
            // Math element control
            //
            // --------------------------------------------------------------------------------------------------------------

            // Create with ctrl+e
            if (event.ctrlKey && event.key === "e") {
                event.preventDefault()
                if (this.activeMathElement !== null) return // No math inside math
                const mathElement = Math.create()
                Utils.insertNodeAt(Utils.getCaretPosition(), mathElement.container)
                Math.open(mathElement.id)
                return
            }

            // Close with esc
            if (event.code === "Escape" && this.activeMathElement !== null) {
                event.preventDefault()
                Math.close(this.activeMathElement.id)
                return
            }

            // Use enter to create new math while in math
            if (event.code === "Enter" && this.activeMathElement !== null) {
                event.preventDefault()
                // Move out and create a new line
                if (event.shiftKey) {
                    Math.close(this.activeMathElement.id)
                    const newLine = document.createElement("div")
                    newLine.innerHTML = "<br>"
                    this.activeLine.after(newLine)
                    Utils.selectByIndex(Utils.getNodeIndex(this.hook, newLine), this.hook)
                } else {
                    // Crate new line after current active line
                    const { id } = this.activeMathElement
                    Math.close(this.activeMathElement.id)
                    // Make sure the math element just closed still exists (may get deleted if empty)
                    if (Math.collection[id] !== undefined) {
                        // Make new line
                        const newLine = document.createElement("div")
                        this.activeLine.after(newLine)
                        Utils.selectByIndex(Utils.getNodeIndex(this.hook, newLine), this.hook)
                        // Utils.select(this.hook, this.hook.childNodes.indexOf(this.activeLine) + 1)
                        const mathElement = Math.create()
                        newLine.appendChild(mathElement.container)
                        Math.open(mathElement.id)
                    }
                }
                return
            }

            // --------------------------------------------------------------------------------------------------------------
            //
            // Patches to browser content-editable related to document manipulation ---
            //
            // --------------------------------------------------------------------------------------------------------------

            // TODO: I forget what this does...
            if (event.code === "Enter" && window.browser === "firefox") {
                const selection = document.getSelection()
                const direction = selection.anchorOffset // 0 is left, 1 is right
                if (selection.anchorNode.nodeName.toLowerCase() === "a" && selection.anchorNode.childNodes.length === 1 && selection.anchorNode.childNodes[0].nodeName.toLowerCase() === "img") {
                    event.preventDefault()
                    if (direction === 0) {
                        const line = document.createElement("div")
                        line.appendChild(document.createElement("br")) // this.activator
                        this.activeLine.before(line)
                        Utils.selectByIndex(0, line)
                    } else {
                        const line = document.createElement("div")
                        line.appendChild(document.createElement("br")) // this.activator
                        this.activeLine.after(line)
                        Utils.selectByIndex(0, line)
                    }
                    return // Forced to return
                }
            }
            // Patch: <br> appears in the beginning of a new line when using enter. This breaks things, so we shall remove it.
            if (event.key === "Enter" && this.activeMathElement === null) {
                // We can expect a new line is created here
                requestAnimationFrame(() => {
                    const newline = Utils.listToArray(this.hook.childNodes)[Utils.getNodeIndex(this.hook, this.activeLine)]
                    if (newline.childNodes.length > 1 && newline.childNodes[0].nodeName.toLowerCase() === "br") newline.childNodes[0].remove()
                })
            }

            // Patch: Manually implement shift+Enter
            if (event.shiftKey && event.key === "Enter" && this.activeMathElement === null) {
                // Causes issues at least on chromium, prevention is required
                event.preventDefault()
                // TODO: Fix this shit later
                // eslint-disable-next-line no-alert
                alert("Using shift+enter is for now disabled.")
                /* // Get nodes before the caret
                const selection = Utils.getSelectedNode()
                console.log("SELECTION")
                let append = []
                if(selection.nodeName.toLowerCase() === "#text"){
                    console.warn("Can't handle this!")
                }else {
                    const selectionIndex = Utils.getNodeIndex(this.activeLine, selection)
                    console.log("INDEX")
                    for(let i = selectionIndex; i < this.activeLine.childNodes.length; i++){
                        append.push(this.activeLine.childNodes[i])
                    }
                }
                // Create a new line normally
                const newLine = document.createElement("div")
                if(append.length === 0){
                    newLine.innerHTML = "<br>" // Activate it as an editable line
                }else {
                    for(const element of append){
                        newLine.appendChild(element)
                    }
                }
                this.activeLine.after(newLine)
                this.activeLine = newLine
                console.debug("[ EDITOR ] Active line change to", this.activeLine)
                Utils.selectByIndex(Utils.getNodeIndex(this.hook, this.activeLine), this.hook) */
                return
            }

            // Patch: Dummy text in front of math if backspace used in front of row
            if (event.key === "Backspace" && this.activeMathElement === null) {
                // event.preventDefault()
                const selection = Utils.getCaretPosition()
                if (selection.startOffset === 0) {
                    holdKeydown = true

                    const tmpElementTable = {}
                    // Callback after edit
                    const recover = async (m, timeout) => {
                        m.disconnect()
                        clearInterval(timeout)
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                // Change math back
                                for (const id of Object.keys(Math.collection)) {
                                    const dummy = document.querySelectorAll(`[dummy-id="${id}"]`)[0]
                                    if (!dummy) {
                                        console.error("Unable to recover document math element", id)
                                        // eslint-disable-next-line no-continue
                                        continue
                                    }
                                    const math = Math.collection[id]
                                    dummy.after(math.container)
                                    dummy.remove()
                                }
                                this.hook.oninput()
                                holdKeydown = false
                            })
                        })
                    }

                    let m

                    // Fallback to timeout
                    // TODO: Fallback is always triggered, mutation observer does not work?
                    const timeout = setInterval(() => {
                        console.warn("Dummy recovery fallback timeout triggered!")
                        recover(m, timeout)
                    }, 10)

                    // Mutation observer
                    m = new MutationObserver(() => recover(m, timeout))

                    // Do the edits
                    const ids = Object.keys(Math.collection)
                    let index = ids.length
                    while (index !== 0) { // Ha! You can freeze the UI thread with this!
                        index -= 1
                        const id = Object.keys(Math.collection)[index]
                        const tmpElement = Math.collection[id].image.cloneNode()
                        // When we match the size, it's impossible for the human eye to detect
                        // the math being gone for one frame, when the text does not reflow
                        // const dimensions = Math.collection[id].image.getBoundingClientRect()
                        // tmpElement.style.width = `${dimensions.width}px`
                        // tmpElement.style.height = `${dimensions.height}px`
                        // tmpElement.style.border = "unset"
                        tmpElement.style.padding = "5px"
                        tmpElement.style.margin = "0px 3px 3px 5px"
                        tmpElement.style.display = "inline-flex"
                        tmpElement.style.border = "border: 1px solid #d5e0e5"
                        tmpElement.style.verticalAlign = "middle"
                        tmpElement.setAttribute("dummy-id", id)
                        const math = Math.collection[id]
                        math.container.after(tmpElement)
                        tmpElementTable[id] = tmpElement
                        Math.domCache.appendChild(math.container)
                    }

                    // Hook to line above
                    m.observe(this.hook.childNodes[Utils.getNodeIndex(this.hook, this.activeLine) - 1] ?? this.hook.childNodes[0], { subtree: true, childList: true, characterData: true })
                }
            }
        })

        // Init math lib (creates caches and such, call once)
        Math.init()

        // Set active math element
        Math.events.addEventListener("focus", (event) => {
            this.activeMathElement = event.detail
        })

        // Unset active math element and handle next selection
        Math.events.addEventListener("blur", () => {
            // Firefox patch: Detect useless br tags in empty lines
            if (window.browser === "firefox") {
                if (this.activeMathElement !== null && this.activeMathElement.isOpen === false && this.activeMathElement.image !== null && this.activeMathElement.image.parentNode !== null) {
                    if (this.activeMathElement.image.parentNode.parentNode.childNodes[0].nodeName.toLowerCase() === "br" && this.activeMathElement.image.parentNode.parentNode.childNodes.length === 2) {
                        this.activeMathElement.image.parentNode.parentNode.childNodes[0].remove()
                    }
                }
            }

            // Select end of math element
            // Note: Chrome should override this
            // TODO: If the element is removed, what should we select? For now we select nothing
            if (this.activeMathElement && this.local.Math.collection[this.activeMathElement.id]) {
                const parentLine = Utils.getParentLine(this.activeMathElement.container)
                console.debug(
                    "Handling blur in", parentLine, "to index", Utils.getNodeIndex(parentLine, this.activeMathElement.container) + 1, "while range is", parentLine.childNodes.length
                )
                if (
                    this.watchHook && // Editor is active
                    !this.moveOutOfThisEvent// && // No move-out with arrow keys (other portion of code handles the selection)
                    // Note: Is this check needed?
                    // parentLine.childNodes.length - 1 <= Utils.getNodeIndex(parentLine, this.activeMathElement.container) + 1 // Selection exists
                ) {
                    if (parentLine.childNodes[parentLine.childNodes.length - 1] === this.activeMathElement.container) Utils.selectEndOf(this.activeMathElement.container)
                    else Utils.select(parentLine, Utils.getNodeIndex(parentLine, this.activeMathElement.container) + 1)
                }
            }

            // Unset active math element
            this.activeMathElement = null
        })

        // Handle moveOut
        Math.events.addEventListener("moveOut", () => {
            this.moveOutOfThisEvent = true
        })

        // Detect active line change with click events
        window.addEventListener("click", () => {
            // Get selection data and make sure it's valid
            const selection = document.getSelection()
            const line = selection.anchorNode.parentElement === this.hook ? selection.anchorNode : Utils.getParentLine(selection.anchorNode)

            // If we have only one line in the editor, we can focus that (as there are no other options)
            if (this.hook.childNodes.length === 1 && this.activeLine !== this.hook.childNodes[0]) {
                [this.activeLine] = this.hook.childNodes
                Utils.selectByIndex(0, this.hook)
                console.debug("[ EDITOR ] Active line change to", this.activeLine)
                return
            }

            if (!Utils.isSomeParent(selection.anchorNode, this.hook)) return

            // Update active line
            if (line === this.hook || line === this.hook.parentElement) return
            if (this.activeLine === line) return
            this.activeLine = line
            console.debug("[ EDITOR ] Active line change to", this.activeLine)
        })

        // Shift copied math back
        this.hook.addEventListener("paste", async () => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    // Fix math elements
                    for (const line of this.hook.children) {
                        // eslint-disable-next-line no-plusplus
                        for (let i = 0; i < line.childNodes.length; i++) {
                            const node = line.childNodes[i]
                            const nextNode = line.childNodes[i + 1]
                            if (node.nodeName.toLowerCase() === "math" && (nextNode && nextNode.nodeName.toLowerCase() === "img")) {
                                node.appendChild(nextNode)
                            }
                        }
                    }
                })
            })
        })

        // Document content modification listener callback
        this.observerCallback = async (e) => {
            // Enable/disable observer
            if (!this.watchHook) return

            // Patch: Make sure the editor has at least one editable line
            const reference = this.hook.innerHTML.replace(/<br>/g, "")
            if (reference === "") { // Editor is empty. We need to add an empty line
                // Add an empty line
                this.hook.innerHTML = "<div><br></div>"
                Utils.selectByIndex(0, this.hook)
            }

            // Handle active line change with the creation of a new line element
            // TODO: Required?
            const line = Utils.getSelectedNode()?.nodeName?.toLowerCase() === "div" ? Utils.getSelectedNode() : Utils.getParentLine(Utils.getSelectedNode())
            if (line !== this.activeLine && line !== this.hook) {
                console.debug("[ EDITOR ] Active line change to", this.activeLine)
                this.activeLine = line
            }

            // Text modified? What is activeLine?
            const parentLine = e && e.addedNodes && e.addedNodes[0] !== null ? Utils.getParentLine() : null
            if (parentLine && this.activeLine !== parentLine) {
                this.activeLine = parentLine
                console.debug("[ EDITOR ] Active line change to", this.activeLine)
            }

            // Handle resize observers for images
            if (!this.resizeObserver) {
                this.resizeObserver = new ResizeObserver(() => {
                    if (typeof this.hook.oninput === "function") this.hook.oninput()
                })
            }
            const newResizeList = []
            // eslint-disable-next-line no-shadow
            for (const line of this.hook.childNodes) {
                for (const node of line.childNodes) {
                    if (node.nodeName.toLowerCase() === "attachment" && node.childNodes[0].nodeName.toLowerCase() === "img") {
                        newResizeList.push(node)
                    }
                }
            }
            if (!Utils.areEqual(newResizeList, this.resizeObserverNodes)) { // We need to re-generate the observers
                this.resizeObserver.disconnect()
                for (const node of newResizeList) this.resizeObserver.observe(node)
                this.resizeObserverNodes = newResizeList
                console.debug("[ EDITOR ] Resize observer list recreated.")
            }

            // Patch: Add math elements missing from the collection back in
            // TODO: No longer required?
            for (const id of Object.keys(Math.collection)) {
                const math = Math.collection[id]
                if (!document.body.contains(math.container)) {
                    // Container has been lost
                    const container = document.querySelectorAll(`[_id="${math.id}"]`)[0]
                    if (container) {
                        math.container = container
                        math.image = math.container.firstChild
                        // math.image.setAttribute("onclick", "window.internal.ui.editor.local.Math.open(\"" + math.id + "\")")
                        console.debug("[ EDITOR ] Rebound", math)
                    }
                }
            }

            // Patch: If a math element is in the beginning/end of a line, remove textNodes from within the container
            for (const id of Object.keys(Math.collection)) {
                const math = Math.collection[id]
                if (!math.isOpen) {
                    // Double parent for "a" container (see Math.close)
                    if (math.image.parentNode !== null && math.image.parentNode.childNodes.length > 1) {
                        let before = true
                        for (const child of math.image.parentElement.childNodes) {
                            if (child.nodeName.toLowerCase() === "img") {
                                before = false
                                // eslint-disable-next-line no-continue
                                continue
                            }
                            if (child.nodeName.toLowerCase() === "#text") {
                                // Move text out of the container
                                if (before) math.image.parentElement.before(child)
                                else math.image.parentElement.after(child)
                                // We can assume the child has selection, so move the caret to it when it has been moved
                                Utils.selectEndOf(child)
                            }
                        }
                    }
                }
            }

            // Patch: If line ends with math, activate it
            if (this.activeLine.childNodes.length !== 0 && this.activeLine.childNodes.length > 1) {
                if (
                    ["math", "attachment"].includes(this.activeLine.childNodes[this.activeLine.childNodes.length - 1].nodeName.toLowerCase())
                ) {
                    this.activeLine.childNodes[this.activeLine.childNodes.length - 1].after(document.createElement("br"))
                }
            }

            // Firefox patch: Do not let lines deactivate, when they are emptied
            // TODO: Should no longer be required (see above)
            if (window.browser === "firefox") {
                // eslint-disable-next-line no-shadow
                for (const line of this.hook.childNodes) {
                    if (line.childNodes.length === 0) {
                        const activator = document.createElement("br")
                        line.appendChild(activator) // this.activator
                    }
                }
            }

            // Patch: Do not let lines deactivate, when there's only a math/image element present
            // TODO: Needed?
            if (this.activeLine.childNodes.length === 1) {
                if (
                    this.activeLine.childNodes[0].nodeName.toLowerCase() === "math" ||
                    this.activeLine.childNodes[0].nodeName.toLowerCase() === "attachment"
                ) { // Left
                    this.activeLine.childNodes[0].contentEditable = true
                }
                if (
                    this.activeLine.childNodes[this.activeLine.childNodes.length - 1].nodeName.toLowerCase() === "math" ||
                    this.activeLine.childNodes[this.activeLine.childNodes.length - 1].nodeName.toLowerCase() === "attachment"
                ) { // Right
                    this.activeLine.childNodes[this.activeLine.childNodes.length - 1].contentEditable = true
                }
            }
        }
        const observer = new MutationObserver(this.observerCallback)
        this.observerCallback()
        observer.observe(this.hook, { attributes: false, childList: true, subtree: true })

        // Drag and drop images / video / gifs
        /* const text = document.getElementById("droptext")
        let hideBlur = false
        this.hook.parentElement.ondrop = event => {
            event.preventDefault()
            for(const file of event.dataTransfer.files){
                if(file.type.startsWith("image/")){
                    const reader = new FileReader()
                    reader.onload = () => {
                        const img = document.createElement("img")
                        const container = document.createElement("attachment")
                        if(!window.browser !== "browser") container.contentEditable = false
                        img.contentEditable = false
                        container.draggable = true
                        container.appendChild(img)
                        img.src = reader.result
                        Utils.copyToCursor(container.outerHTML, [])
                    }
                    reader.readAsDataURL(file)
                }
            }
            this.hook.style.filter = ""
            if(text) text.style.display = "none"
        }
        this.hook.parentElement.ondragover = e => {
            if(e.originalTarget !== undefined && e.originalTarget.nodeName.toLowerCase() === "img") return
            if(this.resizeObserverNodes.includes(e.target.parentNode)) return
            hideBlur = false
            this.hook.style.filter = "blur(8px)"
            if(text) text.style.display = "block"
        }
        this.hook.parentElement.ondragleave = () => {
            hideBlur = true
            setTimeout(() => {
                if(!hideBlur) return
                this.hook.style.filter = ""
                if(text) text.style.display = "none"
            }, 500)
        } */
    }

    /**
     * Get editor content in the official save format
     * @returns {Array}
     */
    getContent() {
        return [`<meta "version"="${localStorage.getItem("version")}"></meta>`].concat(Utils.toEmbedded(this.hook))
    }
}

/**
 * @type {MathEditor}
 */
export default Editor
