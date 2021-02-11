/* global internal*/
/**
 * Console wrapper to collect logs to an internal variable.
 * By: @Esinko (11.02.2021)
 */
export function C() {
	// Get the values from the internal memory
	let cache = internal.console
	let functions = Object.keys(cache)
	for(let i = 0; i < functions.length; i++){
		let f = functions[i]
		internal.console.cache[f] = console[f] // Cache the real function
		console[f] = (...args) => {
			// Execute the actual function from cache
			internal.console.cache[f](...args)
			// Write the data to the cache
			// TODO: Parse css (style) code from the args?
			internal.console.logs.push("[ " + (new Date().getTime() - internal.time_at_live) + "s - " + f.toUpperCase() + " ]", ...args)
		}
	}
}