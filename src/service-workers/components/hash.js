/* eslint-disable no-restricted-globals */
/**
 * Implement hashing functionality
 *
 * By: @Esinko
 */
import com from "./com"

export default class hash {
    /**
     * The input for the hashing algorithm
     * @param {String} input The string to hash
     */
    constructor(input) {
        (async () => {
            let id = null
            if (typeof window === "undefined") {
                // Get window object from main
                const salt = (await com.send("window")).window.id
                self.id = salt.id
                id = salt.id
            } else if (self.id !== undefined) {
                id = self.id
            } else {
                id = window.id
            }
            this.input = `${input}-${id}`
        })()
    }

    /**
     * Hash the data with the SHA1 algorithm
     */
    async sha1() {
        try {
            return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-1", new TextEncoder("utf-8").encode(this.input)))).map((b) => (`00${b.toString(16)}`).slice(-2)).join("")
        } catch (err) {
            throw `Failed to hash data: ${err.stack}` !== undefined ? err.stack : err
        }
    }
}
