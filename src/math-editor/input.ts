import { faEye, faCode } from "@fortawesome/free-solid-svg-icons"
/** Dynamic editor input element component */

type MathInput = {
    container: HTMLElement | undefined,
    dynamicInput: HTMLElement | undefined,
    latexInput: HTMLElement | undefined,
    latexInterface: {
        // eslint-disable-next-line no-unused-vars
        latex: (data: any) => void;
    },
    labels: (HTMLElement | undefined)[],
    infoElement: HTMLElement | undefined
}

/**
 * Simple utility to create a new element with a few arbitrary parameters
 */
function createElement(
    type: string, className: string, parent?: HTMLElement
): HTMLElement | undefined {
    try {
        const element = document.createElement(type)
        element.className = className
        if (parent) parent.appendChild(element)
        return element
    } catch (e) {
        console.error("[ EDITOR - INPUT ] CreateElement utility failed (this is most likely a bug...):", e)
        return undefined
    }
}

/**
 * Create a dynamic editor input element
 */
export default (): MathInput => {
    // Parent
    const container = createElement("math", "inputContainer")
    if (container) {
        container.contentEditable = "true"
    }

    // Sections
    const section1 = createElement(
        "section", "inputSection inputs", container
    )
    // eslint-disable-next-line no-unused-vars
    const limit = createElement(
        "section", "inputSection limit", container
    )
    const section0 = createElement(
        "section", "inputSection labels", container
    )

    // Notification bar (text)
    const info = createElement(
        "p", "inputSection info", container
    )

    // Dynamic latex input field & label
    const dynamicLatex = createElement(
        "span", "mathQuillField", section1
    ) // TODO: Class name?
    const dynamicLatexLabel = createElement(
        "p", "inputLabel active", section0
    )
    if (dynamicLatexLabel) {
        dynamicLatexLabel.innerHTML =
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" height="30px">
        <path fill="#2FA3CF" d="${faEye.icon[4]}"/>
        </svg>`
    }

    // Raw latex input field & label
    const rawLatex = createElement(
        "input", "rawLatex", section1
    )
    if (rawLatex) {
        rawLatex.style.display = "none"
    }
    const rawLatexLabel = createElement(
        "p", "inputLabel", section0
    )
    if (rawLatexLabel) {
        rawLatexLabel.innerHTML =
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${faCode.icon[0]} ${faCode.icon[1]}" height="20px">
        <path fill="#2FA3CF" d="${faCode.icon[4]}"/>
        </svg>`

        // Clicks
        rawLatexLabel.onclick = async () => {
            if (dynamicLatex) {
                dynamicLatex.style.display = "none"
            }
            rawLatexLabel.className = "inputLabel active"
            if (dynamicLatexLabel) {
                dynamicLatexLabel.className = "inputLabel"
            }
            if (rawLatex) {
                rawLatex.style.display = ""
            }
        }
    }

    if (dynamicLatexLabel) {
        dynamicLatexLabel.onclick = async () => {
            if (dynamicLatex) {
                dynamicLatex.style.display = ""
            }
            dynamicLatexLabel.className = "inputLabel active"
            if (rawLatexLabel) {
                rawLatexLabel.className = "inputLabel"
            }
            if (rawLatex) {
                rawLatex.style.display = "none"
            }
        }
    }

    // Create dummy interface for raw latex, as that's simply a text input
    const interfaceDummy = {
        latex: (data: any) => {
            if (rawLatex) {
                (rawLatex as any).value = data
            }
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
