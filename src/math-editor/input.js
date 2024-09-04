/** Dynamic editor input element component */
/**
 * @typedef MathInput
 * @property {HTMLElement} container
 * @property {HTMLElement} inputElement
 * @property {HTMLElement} image
 *
 */

import { faEye, faCode } from "@fortawesome/free-solid-svg-icons"

/**
 * Simple utility to create a new element with a few arbitrary parameters
 * @param {string} type
 * @param {string} className
 * @param {HTMLElement} parent
 * @returns {HTMLElement}
 */
function createElement(
    type, className, parent
) {
    try {
        const element = document.createElement(type)
        element.className = className
        if (parent) parent.appendChild(element)
        return element
    } catch (e) {
        console.error("[ EDITOR - INPUT ] CreateElement utility failed (this is most likely a bug...):", e)
        return null
    }
}

/**
 * Create a dynamic editor input element
 * @returns {MathInput}
 */
export default () => {
    // Parent
    const container = createElement("math", "inputContainer")
    container.contentEditable = false

    // Sections
    const section1 = createElement(
        "section", "inputSection inputs", container
    )
    section1.contentEditable = false
    // eslint-disable-next-line no-unused-vars
    const limit = createElement(
        "section", "inputSection limit", container
    )
    const section0 = createElement(
        "section", "inputSection labels", container
    )
    section0.contentEditable = false

    // Notification bar (text)
    const info = createElement(
        "p", "inputSection info", container
    )
    info.contentEditable = false

    // Dynamic latex input field & label
    const dynamicLatex = createElement(
        "span", "mathQuillField", section1
    ) // TODO: Class name?
    const dynamicLatexLabel = createElement(
        "p", "inputLabel active", section0
    )
    dynamicLatexLabel.innerHTML =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" height="30px">
        <path fill="#2FA3CF" d="${faEye.icon[4]}"/>
    </svg>`

    // Raw latex input field & label
    const rawLatex = createElement(
        "input", "rawLatex", section1
    )
    rawLatex.type = "text"
    rawLatex.style.display = "none"
    const rawLatexLabel = createElement(
        "p", "inputLabel", section0
    )
    rawLatexLabel.innerHTML =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${faCode.icon[0]} ${faCode.icon[1]}" height="20px">
        <path fill="#2FA3CF" d="${faCode.icon[4]}"/>
    </svg>`

    // Clicks
    rawLatexLabel.onclick = async () => {
        dynamicLatex.style.display = "none"
        rawLatexLabel.className = "inputLabel active"
        dynamicLatexLabel.className = "inputLabel"
        rawLatex.style.display = ""
    }
    dynamicLatexLabel.onclick = async () => {
        dynamicLatex.style.display = ""
        dynamicLatexLabel.className = "inputLabel active"
        rawLatexLabel.className = "inputLabel"
        rawLatex.style.display = "none"
    }

    // Create dummy interface for raw latex, as that's simply a text input
    const interfaceDummy = {
        latex: (data) => {
            rawLatex.value = data
        }
    }

    return {
        container,
        dynamicInput: dynamicLatex,
        latexInput: rawLatex,
        latexInterface: interfaceDummy,
        labels: [rawLatexLabel, dynamicLatexLabel],
        infoElement: info
    }
}
