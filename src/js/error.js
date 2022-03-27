/**
 * Error logging utility
 *
 * By: @Esinko
 * @deprecated Use console.error or console.warn
 * @param {*} source
 * @param {*} message
 */
export default async function error(source, message) {
    console.warn("[ Deprecation ] The error component will soon be removed.")
    const css = "color: #d42c2c; font-size: 33px; font-family: Inconsolata, monospace; font-weight: bold;"
    console.log(
        `%c-------------------------\nError (${source}):\n\n%c%s\n%c-------------------------`, css, "color: unset;", message, css
    )
    // eslint-disable-next-line no-console
    console.trace()
}
