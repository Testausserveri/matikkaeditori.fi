/**
 * Error logging utility
 * 
 * By: @Esinko
 * @param {*} source 
 * @param {*} message 
 */
export default async function error(source, message){
    let css = "color: #d42c2c; font-size: 33px; font-family: Inconsolata, monospace; font-weight: bold;"
    console.log("%c-------------------------\nError (" + source + "):", css)
    console.log(message)
    console.log("%c-------------------------", css)
}