import { Buffer } from "buffer"

// Check compatibility and availability of required browser supplied components
export default () => {
    // Set browser type
    const browser = navigator.userAgent.toLowerCase()
    if (browser.includes("chrome")) {
        window.browser = "chrome"
    } else if (browser.includes("firefox")) {
        window.browser = "firefox"
    } else if (browser.includes("safari")) {
        console.warn("SAFARI WILL BE TREATED AS CHROMIUM UNTIL FURTHER NOTICE")
        window.browser = "chrome" // "safari"
    } else {
        // eslint-disable-next-line no-alert
        alert("You are using an unknown browser. Chrome's configuration will be automatically loaded. It is recommended to use Chromium based browsers with this website.")
        window.browser = "chrome"
    }

    // BTOA & ATOB
    // eslint-disable-next-line no-undef
    if (Buffer !== undefined) {
        console.log("[ Compatibility ] Using Buffer instead of btoa/atob...")
        // eslint-disable-next-line no-global-assign
        window.btoa = (string) => Buffer.from(string, "utf8").toString("base64")

        window.atob = (string) => Buffer.from(string, "base64").toString("utf8")
    // eslint-disable-next-line max-len, no-alert, no-restricted-globals
    } else if (confirm("Your browser does not support the \"Buffer class\". Which is a required component for this application to handle not LATIN-1 (ISO-8859) characters. Please update your browser. The application will continue to function, but unexpected behavior and at the risk of data integrity it is not recommended.")) {
        console.warn("[ Compatibility ] Running in Buffer compatibility mode")
    } else {
        // We shall never return true and cause the app to freeze
        return false
    }

    return (
        window.Worker && // Worker support
        crypto.subtle !== undefined // Crypto package available
    )
}
