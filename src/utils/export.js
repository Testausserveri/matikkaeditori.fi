/* globals html2canvas, ClipboardItem, html2pdf */

/**
 * Save files (utility)
 * @param {*} url
 * @param {*} filename
 */
export async function saveAs(url, filename) {
    try {
        const link = document.createElement("a")
        if (typeof link.download === "string") {
            link.href = url
            link.download = filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        } else {
            window.open(url)
        }
    } catch (err) {
        console.error("[ EXPORT ] Failed to save", err)
    }
}

/**
 * Export loaded answer
 * By: @Esinko
 * @param {*} format
 */
export default async (format) => {
    // TODO: Implement watermark
    switch (format) {
    case "image-clipboard": {
        const canvas = await html2canvas(document.getElementById("editor-element"), { useCORS: true })
        canvas.toBlob(async (blob) => {
            const item = new ClipboardItem({
                "image/png": blob
            })
            navigator.clipboard.write([item])
        })
        break
    }
    case "image": {
        const canvas = await html2canvas(document.getElementById("editor-element"), { useCORS: true })
        saveAs(canvas.toDataURL(), "vastaus.png")
        break
    }
    case "txt-clipboard": {
        // TODO: Read raw save
        break
    }
    case "txt-file": {
        const data = await window.internal.ui.editor.getContent()

        data.shift()
        let parsedData = ""
        data.forEach((line) => {
            const strippedLine = line.replace(/<[^>]*>/g, "")
            parsedData = `${parsedData}\n${atob(strippedLine)}`
        })
        parsedData = parsedData.slice(1)

        const element = document.createElement("a")
        element.setAttribute("href", `data:text/plain;charset=utf-8,${encodeURIComponent(parsedData)}`)
        element.setAttribute("download", "vastaus.txt")
        element.style.display = "none"
        document.body.appendChild(element)
        element.click()

        break
    }
    case "pdf": {
        html2pdf(document.getElementById("editor-element"), {
            margin: 10,
            filename: "vastaus.pdf",
            html2canvas: { useCORS: true }
        })
        break
    }
    default:
        console.error("[ EXPORT ] Unknown export format.")
    }
}
