/**
 * Error logging utility
 * 
 * By: @Esinko
 * @param {*} source 
 * @param {*} message 
 */
export default async function error(source, message){
    let css = "color: #d42c2c; font-size: 33px; font-family: Inconsolata, monospace; font-weight: bold;"
    console.log("%c-------------------------\nError (" + source + "):\n\n"+ "%c" + "%s\n" + "%c-------------------------", css, "color: unset;", message, css)
}