/**
 * Implement hashing functionality
 * 
 * By: @Esinko
 */
export default class hash {
    /**
     * The input for the hashing algorithm
     * @param {String} input The string to hash
     */
    constructor(input){
        this.input = input
    }

    /**
     * Hash the data with the SHA1 algorithm
     */
    async sha1(){
        if(this._inputIsValid()){
            return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-1", new TextEncoder("utf-8").encode(this.input)))).map(b => ("00" + b.toString(16)).slice(-2)).join("")
        } 
    }
}