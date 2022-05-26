/* eslint-disable no-restricted-globals */
import * as uuid from "./uuid"

// Create the global onMessage handler
const messageTarget = new EventTarget()
// eslint-disable-next-line no-undef
self.addEventListener("message", (e) => {
    if (typeof e.data !== "string") return
    const messageEmitter = new CustomEvent("message", {
        detail: JSON.parse(e.data)
    })
    messageTarget.dispatchEvent(messageEmitter)
})
export default {
    async send(type, content = {}) {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve) => {
            const id = uuid.v4()
            // Send message
            postMessage(JSON.stringify({ type, content, id: content.id || id }))

            // Listen for response
            messageTarget.addEventListener("message", async (e) => {
                if (e.detail.id !== null && e.detail.id === id) {
                    messageTarget.removeEventListener("message", e)
                    resolve(e.detail.content)
                }
            })
        })
    },
    async sendToWorker(target, content = {}) {
        // eslint-disable-next-line consistent-return
        return new Promise((resolve, reject) => {
            const id = uuid.v4()
            // Send message
            if (content.id !== undefined) content.callback = true
            if (!target && content.id === undefined) {
                reject(new Error("Target must be specified"))
                return
            }
            postMessage(JSON.stringify({
                type: "relay", target, content, id: content.id || id
            }))

            // Listen for response
            messageTarget.addEventListener("message", async (e) => {
                if (e.detail.id !== null && e.detail.id === id) {
                    messageTarget.removeEventListener("message", e)
                    resolve(e.detail.content)
                }
            })
        })
    },
    onMessage: messageTarget
}
