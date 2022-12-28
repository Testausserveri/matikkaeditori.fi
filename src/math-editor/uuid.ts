/* eslint-disable no-bitwise, no-mixed-operators */
/**
 * Generate a universally unique identifier (v4-like, not up to standard)
 * By: @Esinko
*/
// eslint-disable-next-line import/prefer-default-export
export function v4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0
        const v = c === "x" ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}
