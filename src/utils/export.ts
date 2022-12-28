import { Buffer } from "buffer"
import html2canvas from "html2canvas"
// TODO: html2pdf.js doesn't have typescript definitions. We should probably consider using another library for pdf generation.
// @ts-ignore
import html2pdf from "html2pdf.js"

/**
 * Save files (utility)
 */
export async function saveAs(url: string, filename: string) {
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

type ExportFormat = "image-clipboard" | "image" | "txt-clipboard" | "txt-file" | "pdf"

/**
 * Export loaded answer
 * By: @Esinko and @antoKeinanen
 */
export default async (format: ExportFormat) => {
    // TODO: Implement watermark
    switch (format) {
    case "image-clipboard": {
        const editorElement = document.getElementById("editor-element")
        if (editorElement) {
            const canvas = await html2canvas(editorElement, { useCORS: true })
            canvas.toBlob(async (blob) => {
                if (blob) {
                    const item = new ClipboardItem({
                        "image/png": blob
                    })
                    navigator.clipboard.write([item])
                }
            })
        }
        break
    }
    case "image": {
        const editorElement = document.getElementById("editor-element")
        if (editorElement) {
            const canvas = await html2canvas(editorElement, { useCORS: true })
            saveAs(canvas.toDataURL(), "vastaus.png")
        }
        break
    }
    case "txt-clipboard": {
        // @ts-ignore
        const data = await window.internal.ui.editor.getContent()

        data.shift()
        let parsedData = ""
        // @ts-ignore
        data.forEach((line) => {
            const strippedLine = line.replace(/<[^>]*>/g, "")
            parsedData = `${parsedData}\n${Buffer.from(strippedLine, "base64")}`
        })
        parsedData = parsedData.slice(1)

        console.debug("[ EXPORT ] Data to be copied to clipboard:\n", parsedData)

        navigator.clipboard.writeText(parsedData)

        break
    }
    case "txt-file": {
        // @ts-ignore
        const data = await window.internal.ui.editor.getContent()

        data.shift()
        let parsedData = ""
        // @ts-ignore
        data.forEach((line) => {
            const strippedLine = line.replace(/<[^>]*>/g, "")
            parsedData = `${parsedData}\n${Buffer.from(strippedLine, "base64")}`
        })
        parsedData = parsedData.slice(1)

        console.debug("[ EXPORT ] Data to be saved to text file:\n", parsedData)

        saveAs(`data:text/plain;charset=utf-8,${encodeURIComponent(parsedData)}`, "vastaus.txt")

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
