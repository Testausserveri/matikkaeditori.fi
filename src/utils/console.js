/* eslint-disable no-param-reassign, no-console */
// import * as uuid from "./worker-components/uuid.js"

/**
 * Generate console component configuration
 */
export function consoleConfig() {
    // No actions to be done here, just return the base tree
    return {
        list: [
            // These values will be put behind a wrapper for log collection
            "log",
            "error",
            "info",
            "trace",
            "warn",
            "debug"
        ],
        cache: {},
        logs: [],
        color: {
            warn: "yellow",
            error: "red",
            log: "limegreen",
            default: "limegreen"
        }
    }
}

/**
 * Try to stringify an object
 * @param {Object} obj
 */
function tryStringify(obj) {
    try {
        const str = JSON.stringify(obj)
        return str
    } catch (e) {
        return "{ stringify failed }"
    }
}

function argsToString(args) {
    if (typeof args === "string") return [args]
    if (typeof args === "object" && !Array.isArray(args)) return [tryStringify(args)]
    return args
        // eslint-disable-next-line no-nested-ternary
        .map((arg) => (typeof arg === "object" && !Array.isArray(arg) ? tryStringify(arg) : Array.isArray(arg) ? argsToString(arg) : arg))
        .filter((arg) => arg.length !== 0)
        .map((arg) => arg.toString())
        .map((arg) => arg.replace(/\\"/g, "\""))
}

/**
 * Console wrapper to collect logs to an internal variable.
 * By: @Esinko (11.02.2021)
 */
export default (window) => {
    // Don't rewrite twice
    // console.debug("[ Console ] Rewriting console functions...")
    if (console.rewritten === true) return
    // console.debug("[ Console ] Can rewrite")

    // Workers don't have window available
    // So here we create a dummy object
    if (window === undefined || window.console === undefined) window = { internal: { console: consoleConfig() }, isDummy: true }

    // Redefine all the functions
    for (const func of window.internal.console.list) {
        window.internal.console.cache[func] = console[func]
        const { color } = window.internal.console // I feel lazy
        console[func] = (...args) => {
            // Apply colors
            if (args[0] !== undefined && typeof args[0].startsWith === "function" && args[0].startsWith("[") && args[0].includes("]")) {
                let args0 = `${args[0].split("]")[0]}]`
                // eslint-disable-next-line prefer-destructuring
                args[0] = args[0].split("]")[1]
                args0 = `%c${args0}`
                if (args[0] !== "") {
                    args[0] = args[0].trimLeft()
                    args.splice(
                        0, 0, ""
                    )
                }
                // window.internal.console.cache[func](args, args.length)
                window.internal.console.cache[func](
                    `${args0}%s`, `color: ${color[func]}` ?? `${color.default};`, ...args
                )
            } else if (!args.includes("%c")) { // Ignore if we already have styling
                // Execute the actual function from cache
                const args0 = "%c[ ❓ ] " // Unknown or prefix not specified
                window.internal.console.cache[func](
                    args0, `color: ${color[func]}` ?? `${color.default};`, ...args
                )
            } else {
                window.internal.console.cache[func](...args)
            }
            // Write the data to the cache
            // TODO: Parse css (style) code from the args?
            if (!window.isDummy) { // True for workers
                const formattedArgs = argsToString(args)
                window.internal.console.logs.push(`[ ${new Date().getTime() - window.internal.timeAtLive}s - ${func.toUpperCase()} ] ${formattedArgs.join(" ")}`)
                // Max length is 1000 messages
                if (window.internal.console.logs.length > 1000) window.internal.console.logs.shift()
            }
        }
    }

    // Define marker for rewritten functions
    // console.debug("[ Console ] Console functions rewritten")
    console.rewritten = true
}
