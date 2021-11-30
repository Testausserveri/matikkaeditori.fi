//import * as uuid from "./worker-components/uuid.js"

/**
 * Console wrapper to collect logs to an internal variable.
 * By: @Esinko (11.02.2021)
 */
export default function (window){
    // Don't rewrite twice
    //console.debug("[ Console ] Rewriting console functions...")
    if(console.rewritten === true) return
    //console.debug("[ Console ] Can rewrite")

    // Workers don't have window available
    // So here we create a dummy object
    if(window === undefined || window.console === undefined) window = { internal: { console: console_config() }, isDummy: true }

    // Redefine all the functions
    for(let func of window.internal.console.list){
        window.internal.console.cache[func] = console[func]
        const color = window.internal.console.color // I feel lazy
        console[func] = (...args) => {
            // Apply colors
            if(args[0] != undefined && typeof args[0].startsWith == "function" && args[0].startsWith("[") && args[0].includes("]")){
                let args0 = args[0].split("]")[0] + "]"
                args[0] = args[0].split("]")[1]
                args0 = "%c" + args0
                if(args[0] != ""){
                    args[0] = args[0].trimLeft()
                    args.splice(0,0,"")
                }
                //window.internal.console.cache[func](args, args.length)
                window.internal.console.cache[func](args0+"%s", "color: " + color[func] ?? color.default + ";", ...args)
            }else if(!args.includes("%c")){ // Ignore if we already have styling
                // Execute the actual function from cache
                let args0 = "%c[ ❓ ] " // Unknown or prefix not specified
                window.internal.console.cache[func](args0, "color: " + color[func] ?? color.default + ";", ...args)
            }else {
                window.internal.console.cache[func](...args)
            }
            // Write the data to the cache
            // TODO: Parse css (style) code from the args?
            //console.warn("[ " + (new Date().getTime() - window.internal.time_at_live) + "s - " + func.toUpperCase() + " ]" + args)
            if(window.isDummy === true){
                //const id = uuid.v4()
                // Send message
                //postMessage(JSON.stringify({ type: "log", content: args, id }))
            }else {
                window.internal.console.logs.push("[ " + (new Date().getTime() - window.internal.time_at_live) + "s - " + func.toUpperCase() + " ] " + args)
            }
        }
    }

    // Define marker for rewritten functions
    //console.debug("[ Console ] Console functions rewritten")
    console.rewritten = true
}

/**
 * Generate console component configuration
 */
export function console_config(){
    // No actions to be done here, just return the base tree
    return {
        list: [
            // These values will be put behind a wrapper for log collection
            "log",
            "error",
            "info",
            "trace",
            "warn"
        ],
        cache: {},
        logs: [],
        color: {
            "warn": "yellow",
            "error": "red",
            "log": "limegreen",
            "default": "limegreen"
        }
    }
}