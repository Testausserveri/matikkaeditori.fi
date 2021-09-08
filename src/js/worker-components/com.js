import * as uuid from "./uuid.js"

// Create the global onMessage handler
const message_target = new EventTarget()
// eslint-disable-next-line no-undef
self.addEventListener("message", e => {
    if(typeof e.data !== "string") return
    const message_emitter = new CustomEvent("message", {
        detail: JSON.parse(e.data)
    })
    message_target.dispatchEvent(message_emitter)
})
export default {
    send: async function (type, content){
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve) => {
            const id = uuid.v4()
            // Send message
            if(!content) content = {}
            postMessage(JSON.stringify({ type, content, id: content.id || id }))

            // Listen for response
            message_target.addEventListener("message", async function (e){
                if(e.detail.id !== null && e.detail.id === id){
                    message_target.removeEventListener("message", e)
                    resolve(e.detail.content)
                }
            })
        })
    },
    sendToWorker: async function (target, content){
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            const id = uuid.v4()
            // Send message
            if(!content) content = {}
            if(content.id !== undefined) content.callback = true
            if(!target) return reject("Target must be specified")
            postMessage(JSON.stringify({ type: "relay", target, content, id: content.id || id }))

            // Listen for response
            message_target.addEventListener("message", async function (e){
                if(e.detail.id !== null && e.detail.id === id){
                    message_target.removeEventListener("message", e)
                    resolve(e.detail.content)
                }
            })
        })
    },
    onMessage: message_target
}