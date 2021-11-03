/**
 * Generate a universally unique identifier (v4-like, not up to standard)
 * 
 * By: @Esinko
*/
export function v4(){
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0,
            v = c == "x" ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}