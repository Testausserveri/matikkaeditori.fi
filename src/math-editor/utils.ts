// eslint-disable-next-line import/no-cycle
import Math from "./math"

type EditorElement = {
    name: string | undefined,
    attributes: Record<any, any>,
    data: string,
    tree: EditorElement[],
    // eslint-disable-next-line no-unused-vars
    appendChild?: (child: HTMLElement | Node | null) => void,
}

type EditorElementList = EditorElement[]

/**
 * Editor utility functions
 */
const Utils = {
    /**
     * --------------------------------------------------------
     * Node handling
     * --------------------------------------------------------
     */
    /**
     * Get node index in tree
     */
    getNodeIndex(list: Node, node: HTMLAnchorElement): number {
        if (!(list instanceof HTMLElement)) throw console.error("[ EDITOR ] List provided to getNodeIndex is not an instance of HTMLElement.")
        let index = 0
        for (const childNode of list.childNodes) {
            if (childNode === node) break
            index += 1
        }
        return index
    },

    /**
     * Get a node by it's index from the DOM
     */
    getNodeByIndex(list: Node, index: number): Node | null {
        if (!(list instanceof HTMLElement)) throw console.error("[ EDITOR ] List given to getNodeByIndex is not an instance of HTMLElement.")
        if (list.childNodes.length - 1 < index) throw console.error("[ EDITOR ] Selection given to getNodeByIndex is out of range.")
        return list.childNodes[index]
    },

    /**
     * Enable/Disable anchor-ability for a set of nodes/elements
     */
    async toggleAnchorMode(list: HTMLElement[] | Node[], contentEditable: "true" | "false"): Promise<void> {
        // Todo: This is a very hacky way to do this
        //       and it WILL NOT scale well
        return new Promise((resolve) => {
            for (const item of list) {
                if ("contentEditable" in item) {
                    item.contentEditable = contentEditable
                }
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
     */
    isSomeParent(node: Node, parent: Node): boolean {
        if (!(node instanceof Node)) throw console.error("[ EDITOR ] Node given to isSomeParent is not instance of Node.")
        if (parent === null) return false
        /* const traverse = (innerNode) => {
            if(innerNode.parentNode === parent){
                return true
            }else {
                // Check other parent
                if(innerNode.parentNode !== null) return traverse(innerNode.parentNode)
                return false
            }

        }
        return traverse(node) */
        return parent.contains(node) // Faster & More efficient!
    },

    /**
     * Find the parent line of a node in content-editable
     */
    getParentLine(node: Node): Node | null {
        if (!(node instanceof Node)) throw console.error("[ EDITOR ] Node given to getParentLine is not instance of Node.")
        const traverse = (innerNode: Node): ParentNode | null => {
            if ((innerNode?.parentNode?.nodeName || "").toLowerCase() === "div") {
                return innerNode.parentNode
            }
            // Check other parent
            if (innerNode.parentNode !== null) return traverse(innerNode.parentNode)
            return null
        }
        return traverse(node)
    },

    /**
     * Insert a node in a certain range
     */
    insertNodeAt(range: Range, node: Node): void {
        if (!(range instanceof Range)) throw console.error("[ EDITOR ] Range given to insertNodeAt is not instance of Range.")
        if (!(node instanceof Node)) throw console.error("[ EDITOR ] Node given to insertNodeAt is not instance of Node.")
        range.insertNode(node)
    },

    /**
     * Convert a node list to an array
     */
    listToArray<T extends Node>(list: NodeListOf<T>): Node[] {
        const array = []
        for (const entry of list) {
            array.push(entry)
        }
        return array
    },

    /**
     * --------------------------------------------------------
     * Event & Async tools
     * --------------------------------------------------------
     */
    /**
     * Wait for an event from a given event target
     */
    waitForEvent(from: EventTarget, event: string): Promise<void> {
        if (!(from instanceof EventTarget)) throw console.error("[ EDITOR ] Event target given to waitForEvent is not instance of EventTarget.")
        if (typeof event !== "string") throw console.error("[ EDITOR ] Event name given to waitForEvent is not a type of string.")
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
     */
    async asyncTrigger(input: () => void, promise: Promise<any>): Promise<any> {
        if (typeof input !== "function") throw console.error("[ EDITOR ] Input given to asyncTrigger is not typeof function.")
        if (!(promise instanceof Promise)) throw console.error("[ EDITOR ] Promise given to asyncTrigger is not instance of Promise.")
        return new Promise((resolve, reject) => {
            promise.then((...args) => {
                resolve(...args)
            }).catch((...args) => {
                // eslint-disable-next-line prefer-promise-reject-errors
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
     */
    getSelectedNode(): Node | null | undefined {
        const node = document.getSelection()?.focusNode
        if (node === null || node === undefined) return node // No selection
        return (node.nodeType === 3 ? node.parentNode : node)
    },

    /**
     * Select a part of the given element
     */
    // eslint-disable-next-line consistent-return
    select(element: HTMLElement | Node, index: number): void {
        if (!(element instanceof HTMLElement) && !(element instanceof Node)) throw console.error("[ EDITOR ] Element/Node given to select is not instance of HTMLElement/Node.")
        if (typeof index !== "number") throw console.error("[ EDITOR ] Index given to select is not type of number.")
        if (element.childNodes.length - 1 < index) return console.error("[ EDITOR ] Selection given to select is out of range!")
        const range = document.createRange()
        const selection = window.getSelection()
        range.setStart(element, index)
        range.collapse(true)
        if (selection) {
            selection.removeAllRanges()
            selection.addRange(range)
        }
    },

    /**
     * Select an element by it's index in the DOM (contents)
     */
    selectByIndex(
        index: number, element: HTMLElement, collapse?: boolean
    ): void {
        if (element.childNodes.length - 1 < index) throw console.error("[ EDITOR ] Selection given to selectByIndex is out of range!")
        const range = document.createRange()
        const sel = document.getSelection()
        range.selectNodeContents(element.childNodes[index])
        range.collapse(collapse ?? true)
        if (sel) {
            sel.removeAllRanges()
            sel.addRange(range)
        }
    },

    /**
     * Move caret to the end within an element
     */
    selectEndOf(node: Node) {
        const range = document.createRange()
        const sel = document.getSelection()
        range.setStartAfter(node)
        range.setEndAfter(node)
        if (sel) {
            sel.removeAllRanges()
            sel.addRange(range)
        }
    },

    /**
     * Get current caret position
     */
    getCaretPosition(): Range {
        const selection = window.getSelection()
        let range: Range
        if (selection) {
            range = selection.getRangeAt(0)
            range.deleteContents()
        } else {
            range = document.createRange()
        }
        return range
    },

    /**
     * Copy HTML to the cursor position
     */
    /* async _copyToCursor(html: string, files: File[]): Promise<void> {
        return new Promise(resolve => {
            // Get cursor position as a range
            const sel = document.getSelection()
            const offset = sel.anchorOffset
            const range = document.createRange()
            range.setStart(sel.anchorNode, offset)
            range.collapse(true)
            sel.removeAllRanges()
            sel.addRange(range)
            if(html !== ""){
                // This is copied content
                const dummy = document.createElement("div")
                // Todo: Huge XSS vulnerability here! Fix later...
                dummy.innerHTML = html.includes("<!--StartFragment-->") ? html.split("<!--StartFragment-->")[1].split("<!--EndFragment-->")[0] : html
                // Todo: Test the HTML for valid data
                // Todo: I have no fucking idea why this works and why we need to do this.
                //       Don't you fucking dare touch this badness I won't help you fix it!!!
                let last = null
                const tmp = [...dummy.childNodes]
                let fileIterator = 0
                for(let elem of tmp){
                    // Correct image urls
                    if(elem.nodeName.toLowerCase() === "img"){
                        const blob = files[fileIterator]
                        ++fileIterator
                        const container = document.createElement("attachment")
                        container.contentEditable = false
                        container.draggable = true
                        elem.contentEditable = false
                        const img = elem
                        elem = container
                        container.appendChild(img)
                        const reader = new FileReader()
                        reader.onload = () => {
                            img.src = reader.result
                        }
                        if(img.src.toString().includes(".gif")){
                            alert("GIFs cannot be copied at the moment :( Take this image instead!")
                        }
                        reader.readAsDataURL(blob)
                    }

                    // Correct text nodes
                    if(elem.nodeName.toLowerCase() === "span"){
                        elem = document.createTextNode(elem.innerText)
                    }
                    if(!last) range.insertNode(elem)
                    else last.after(elem)
                    last = elem
                }
                sel.collapseToEnd()
                dummy.remove()
                resolve()
            }else {
                // Only a copied file, if anything
                let last = null
                for(const file of files){
                    if(file.type.startsWith("image/")){
                        // We can copy this
                        const reader = new FileReader()
                        reader.onload = () => {
                            const img = document.createElement("img")
                            const container = document.createElement("article")
                            container.contentEditable = false
                            if(!window.browser !== "browser") img.contentEditable = false
                            container.draggable = true
                            container.appendChild(img)
                            img.src = reader.result
                            if(!last) range.insertNode(container)
                            else last.after(container)
                            last = container
                        }
                        reader.readAsDataURL(file)
                    }
                }
                sel.collapseToEnd()
                resolve()
            }
        })
    }, */

    copyToCursor(text: string, files: File[]): Promise<void> {
        return new Promise((resolve) => {
            // Get cursor position as a range
            const sel = document.getSelection()
            const offset = sel?.anchorOffset
            const range = document.createRange()
            if (sel && sel.anchorNode && offset !== undefined) {
                range.setStart(sel.anchorNode, offset)
            }
            range.collapse(true)
            if (sel) {
                sel.removeAllRanges()
                sel.addRange(range)
            }
            if (files.length !== 0) {
                let last: HTMLElement | null = null
                for (const file of files) {
                    if (file.type.startsWith("image/")) {
                        // We can copy this
                        const reader = new FileReader()
                        // eslint-disable-next-line no-loop-func
                        reader.onload = () => {
                            const img = document.createElement("img")
                            const container = document.createElement("attachment")
                            container.contentEditable = "false"
                            if (window.browser !== "browser") img.contentEditable = "false"
                            container.draggable = true
                            container.appendChild(img)
                            if (typeof reader.result === "string") {
                                img.src = reader.result
                            }
                            if (!last) range.insertNode(container)
                            else last.after(container)
                            last = container
                        }
                        reader.readAsDataURL(file)
                    }
                }
                if (sel) {
                    sel.collapseToEnd()
                }
                resolve()
            } else {
                const node = document.createTextNode(text)
                range.insertNode(node)
                if (sel) {
                    sel.collapseToEnd()
                }
                resolve()
            }
        })
    },

    /**
     * Check if the parent was clicked. In this case, the parent inherits all of the child node click events.
     *
     * NOTE: This function forces 3 animation frames!
     */
    async wasParentClicked(parent: HTMLElement | Node) {
        return new Promise((resolve) => {
            requestAnimationFrame(() => {
                const activeElement = Utils.getSelectedNode()
                // console.log("ACTIVE", activeElement)
                console.log(
                    "Was parent clicked?", activeElement, parent
                )
                if ((activeElement && this.isSomeParent(activeElement, parent)) || activeElement === parent) {
                    resolve(true)
                } else {
                    resolve(false)
                }
            })
        })
    },

    /**
     * --------------------------------------------------------
     * Object & Array handling
     * --------------------------------------------------------
     */
    /**
     * Read value of object's objects and return them as an array
     */
    getObjectPropertyArray(obj: Record<string, any>, property: string): any[] {
        if (typeof obj !== "object") throw console.error("[ EDITOR ] Object given to getObjectPropertyArray is not type of object.")
        if (typeof property !== "string") throw console.error("[ EDITOR ] Property given to getObjectPropertyArray is not type of string.")
        const keys = Object.keys(obj)
        const list = []
        for (const key of keys) {
            if (obj[key][property] !== undefined) list.push(obj[key][property])
        }
        return list
    },

    /**
     * Read a value of array's object and return them as an array
     */
    getArrayItemPropertyArray(array: any[], property: string): any[] {
        if (!Array.isArray(array)) throw console.error("[ EDITOR ] Array given to getArrayItemPropertyArray is not an array.")
        if (typeof property !== "string") throw console.error("[ EDITOR ] Property given to getArrayItemPropertyArray is not type of string.")
        const list = []
        for (const entry of array) {
            if (entry[property] !== undefined) list.push(entry[property])
        }
        return list
    },

    /**
     * Find next instance of a string in an array
     */
    findNextOf(
        string: string, array: string[], index: number
    ): number {
        if (typeof string !== "string") throw console.error("[ EDITOR ] String given to findNextOf is not type of string.")
        if (!Array.isArray(array)) throw console.error("[ EDITOR ] Array given to findNextOf is not an array.")
        if (typeof index !== "number") throw console.error("[ EDITOR ] Index given to findNextOf is not type of number.")
        // -1 is already also false
        return index ? array.slice(index).indexOf(string) : array.indexOf(string)
    },

    // TODO: Indexes or what?
    /**
     * Read data between two array indexes
     */
    readBetweenIndexes(
        array: string[], start: number, end: number
    ): any[] {
        if (!Array.isArray(array)) throw console.error("[ EDITOR ] Array given to readBetweenIndexes is not an array.")
        if (typeof start !== "number") throw console.error("[ EDITOR ] Start given to readBetweenIndexes is not type of number.")
        if (typeof end !== "number") throw console.error("[ EDITOR ] End given to readBetweenIndexes is not type of number.")
        const arrayClone = JSON.parse(JSON.stringify(array))
        return arrayClone.splice(start, end - start)
    },

    /**
     * Get new clone of an array with a start index
     */
    getCloneFromIndex(array: string[], index: number): any[] {
        if (!Array.isArray(array)) throw console.error("[ EDITOR ] Array given to getCloneFromIndex is not an array.")
        if (typeof index !== "number") throw console.error("[ EDITOR ] Index given to getCloneFromIndex is not type of number.")
        const arrayClone = JSON.parse(JSON.stringify(array))
        return arrayClone.slice(index)
    },

    /**
     * Compare 2 arrays
     */
    areEqual<T>(array1: T[], array2: T[]): boolean {
        if (
            Array.isArray(array1) &&
            Array.isArray(array2)
        ) {
            return array1.length === array2.length && array1.every((val, i) => array2[i] === val)
        }
        return false
    },

    /**
     * --------------------------------------------------------
     * String management & tools
     * --------------------------------------------------------
     */
    /**
     * Remove double quotes from the start & end of the string while maintaining \""
     */
    removeDoubleQuotes(string: string): string {
        return string.replace(/\\"/g, "\\'").replace(/"/g, "").replace(/\\'/g, "\"")
    },

    /**
     * --------------------------------------------------------
     * Save format parser & encoder
     * --------------------------------------------------------
     */
    /**
     * Read embedded element data from the official save format
     */
    parseEmbedded(data: string): EditorElementList {
        if (typeof data !== "string") throw console.error("[ EDITOR ] Data given to parseEmbedded is not type of string.")
        // eslint-disable-next-line no-param-reassign
        const dataSplit = data.split("")
        const elements: {
            name: string | undefined;
            attributes: {};
            data: string;
            tree: never[];
        }[] = []
        let raw: string[] = []
        let i = 0

        // Read function
        // Yes, we could use an XML parser, but the overhead here should be minimal
        // and the simplicity of it makes it secure. We don't want any sort of
        // code injection or XSS vulnerabilities due to XML parser related issues
        const read = () => {
            const char = dataSplit[i]
            // New element?
            if (char === "<") {
                // Dump cache
                if (raw.length !== 0) {
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
                const nextTagIndex = i + this.findNextOf(
                    ">", this.getCloneFromIndex(dataSplit, 0), i
                )
                let tagData; let tagName; let attributeData
                const attributes: Record<string, string> = {}
                try {
                    // Read and format element tag data
                    tagData = this.readBetweenIndexes(
                        dataSplit, i + 1, nextTagIndex
                    ).join("");
                    [tagName] = tagData.split(" ")
                    attributeData = tagData.replace(tagName, "")
                    if (attributeData !== "") {
                        // Remove possible leading space
                        if (attributeData.startsWith(" ")) attributeData = attributeData.replace(" ", "")
                        attributeData = attributeData.split(" ")
                        for (const val of attributeData) {
                            const parts = val.split("=")
                            attributes[this.removeDoubleQuotes(parts[0])] = this.removeDoubleQuotes(parts[1])
                        }
                    }
                } catch (e) {
                    console.error(
                        "[ EDITOR ] ParseEmbedded failed to read tag data that started at", i, "of", dataSplit, "err:", e
                    )
                }

                // Find closing element tag
                const splitByTag = this.getCloneFromIndex(dataSplit, nextTagIndex + 1).join("").split(`</${tagName}>`)
                const [elementData] = splitByTag

                // Update index number
                i += (`<${tagData}>${elementData}</${tagName}>`).length - 1

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
            } else {
                // No element qualification, dump to cache
                raw.push(char)
            }

            // Return updated index
            return i
        }

        // Reader loop
        const reader = (): boolean => {
            const readToIndex = read()
            if (readToIndex < dataSplit.length) {
                // More to read
                i += 1
                return reader()
            }
            return true
        }

        reader()
        return elements
    },

    /**
     * Format HTML editor data to the official save format
     */
    toEmbedded(elements: HTMLElement): string {
        const format: string[] = []
        let redo = false
        if (!(elements instanceof HTMLElement)) throw console.error("[ EDITOR ] Element given to toEmbedded is not instance of HTMLElement.")
        // eslint-disable-next-line no-plusplus
        for (let i = 0; i < elements.childNodes.length; i++) {
            const line = elements.childNodes[i]
            // Create line
            format.push("")
            for (const element of line.childNodes) {
                switch (element.nodeName.toLowerCase()) {
                case "#text": {
                    // This is plain text
                    format[format.length - 1] += `<text>${btoa(element.textContent || "")}</text>`
                    break
                }
                case "math": {
                    // Math container
                    // TODO: Escape this
                    if (element instanceof HTMLElement) {
                        format[format.length - 1] += `<math>${element.getAttribute("math")}</math>`
                    }
                    break
                }
                case "br": {
                    // Manual line-break
                    // Only handled as an activator now
                    if (window.browser !== "firefox" && element.parentNode?.childNodes.length !== 1) {
                        // No meaning for firefox & does not change anything on chromium if by itself in a line
                        format.push("")
                    }
                    break
                }
                case "img": {
                    console.warn("[ EDITOR ] IMG parsing is disabled.")
                    /*
                    // Rendered math or image
                    const data = element.getAttribute("data")
                    if(data){ // Math
                        format[format.length - 1] += "<math>" + btoa(element.getAttribute("data")) + "</math>"
                    }else {
                        format[format.length - 1] += "<img>" + (element.src ?? "unset") + "</img>"
                    }
                    */
                    break
                }
                case "attachment": {
                    // Responsive image
                    if (element.childNodes[0].nodeName.toLowerCase() === "img") {
                        if (element instanceof HTMLElement && element.children.length > 0 && element.children[0] instanceof HTMLImageElement) {
                            format[format.length - 1] += `<img height="${element.style.height}" width="${element.style.width}">${element.children[0].src ?? "unset"}</img>`
                        }
                    } else {
                        console.warn("[ EDITOR ] Unknown attachment type")
                    }

                    break
                }
                case "div": {
                    // Line within a line
                    // This may be caused by a bug, or a browser content editable related inconsistency
                    for (const child of line.childNodes) line.after(child)
                    line.remove()
                    i = 0
                    console.warn("[ Editor ] Line structure changes were required! Redoing the getContent...")
                    redo = true
                    break
                }
                default: {
                    console.warn("[ EDITOR ] Unknown element in editor", element)
                }
                }
            }
        }
        if (redo) return this.toEmbedded(elements)
        return format.length === 0 ? "" : format.join()
    },

    /**
     * Convert editor element to a HTML element
     */
    fill(element: EditorElement): HTMLElement | Node | null {
        let html = null
        switch (element.name) {
        case "meta": {
            // Not an element
            break
        }
        case "text": {
            // Basic text
            if (element.data === "") {
                html = document.createElement("br")
            } else {
                html = document.createTextNode(atob(element.data))
            }
            break
        }
        case "math": {
            // Math element
            const mathElement = Math.create()
            console.debug("READ DATA", element.data)
            Math.write(mathElement.id, atob(element.data))
            html = mathElement.container
            break
        }
        case "img": {
            // Image attachment
            const img = document.createElement("img")
            const container = document.createElement("attachment")
            container.contentEditable = "false"
            img.contentEditable = "false"
            container.appendChild(img)
            img.src = element.data
            if (element.attributes.height) container.style.height = element.attributes.height
            if (element.attributes.width) container.style.width = element.attributes.width
            container.draggable = true
            html = container
            break
        }
        default: {
            console.error(
                "[ EDITOR ]", `Unknown element type of "${element.name}" cannot be processed. Raw:`, element
            )
        }
        }
        if (element.tree !== undefined && element.tree.length !== 0) {
            // This element has children
            for (const child of element.tree) {
                if (element.appendChild) {
                    element.appendChild(this.fill(child))
                }
            }
        }
        return html
    }
}
export default Utils
