/**
 * ------------------------------------------
 * Matikkaeditori.fi's Math editor component
 * 
 * By: @Esinko 08.09.2021
 * ------------------------------------------
 */

// Type definitions 

/**
 * @typedef {{}} MathElement Matikkaeditori math element
 * @param {HTMLElement} container The main element (container) of the math element
 * @param {*} input Latex input interface (MathQuill)
 * @param {HTMLElement} inputElement The math input element
 * @param {*} image Image data of rendered latex
 * @param {boolean} isOpen Is the math element open?
 * @param {string} id Math element's id
 */

// Imports
import * as uuid from "../worker-components/uuid.js"

// Utils
const Utils = new (class _Utils {
    /**
     * Get node index in tree
     * @param {HTMLAnchorElement} node Node to get the index of
     */
    getNodeIndex(node){

    }

    /**
     * Enable/Disable anchors for a set of nodes/elements
     * @param {HTMLElement[]} list List of elements
     */
    toggleAnchorMode(list){

    }

    /**
     * Insert a node in a certain position
     * @param {number} index Position
     * @param {HTMLAnchorElement} node Node on instert
     */
    insertNodeAt(index, node){

    }

    /**
     * Get current caret position
     */
    getCaretPosition(){

    }
})

// Math utilities (wrapper for MathQuill)
const Math = new (class _Math {
    
    /**
     * Create a new math element
     * @returns {MathElement}
     */
    async create(){

    }

    async open(id){

    }

    async close(id){

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

        // Constant variables
        this.events = new EventTarget()
        this.activator = "" // Activator element to fool the browser to enable caret control, for now empty

        // Dynamic variables
        this.mathElements = []
        this.activeMathElement = false
        this.activeLine = null // Active line element (div)
        this.watchDocument = true // Enable flow logic
    }

    /**
     * Set editor contents
     */
    async setContent(){

    }

    /**
     * Get editor contents
     */
    async getContent(){

    }

    /**
     * Initialize the editor
     */
    async init(){
        return new Promise((resolve, reject) => {
            try {
                // Global keyboard listener
                document.addEventListener("keydown", async event => {
                    // --- Math controls ---

                    // Open math element
                    if(event.ctrlKey && event.key === "e"){
                        event.preventDefault()
                        const mathElement = Math.create()
                        this.hook.appendChild(mathElement)
                        return
                    }

                    // Close math
                    if(event.code === "Escape"){
                        event.preventDefault()
                        if(this.activeMathElement) Math.close(this.activeMathElement.id)
                        return
                    }

                    // Use enter to create new math
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
                    }
                }

                // Activate document content modification listener
                const observer = new MutationObserver(observerCallback)
                observer.observe(this.hook, { attributes: false, childList: true, subtree: true })
                resolve()
            }
            catch(e){
                reject(e)
            }
        })
    }
}