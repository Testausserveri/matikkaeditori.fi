import uuid from "./uuid.js"

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
        return new Promise(async (resolve, reject) => {
            const id = uuid.v4()
            const timeout = setTimeout(async () => {
                reject("Timeout")
            }, 30000)
            // Send message
            postMessage(JSON.stringify({ type, content, id: content.id | id }))

            // Listen for response
            message_target.addEventListener("message", async function (e){
                if(e.message.id !== null && e.message.id === id){
                    message_target.removeEventListener("message", e)
                    clearTimeout(timeout)
                    resolve(e.message.content)
                }
            })
        })
    },
    onMessage: message_target
}