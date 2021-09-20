// Check compatibility and availability of required browser supplied components
export function c(){
    // Set browser type
    const browser = navigator.userAgent.toLowerCase()
    if(browser.includes("chrome")){
        window.browser = "chrome"
    }else if(browser.includes("firefox")){
        window.browser = "firefox"
    }else if(browser.includes("safari")){
        console.warn("SAFARI WILL BE TREATED AS CHROMIUM UNTIL FURTHER NOTICE")
        window.browser = "chrome" //"safari"
    }else {
        alert("You are using an unknown browser. Chrome's configuration will be automatically loaded. It is recommended to use Chromium based browsers with this website.")
        window.browser = "chrome"
    }

    // BTOA & ATOB
    // eslint-disable-next-line no-undef
    if(Buffer !== undefined){
        // eslint-disable-next-line no-global-assign
        window.btoa = (string) => {
            // eslint-disable-next-line no-undef
            return new Buffer.from(string, "utf8").toString("base64")
        }
        window.atob = (string) => {
            // eslint-disable-next-line no-undef
            return new Buffer.from(string, "base64").toString("utf8")
        }
    }

    return (
        window.Worker && // Worker support
        crypto.subtle != undefined // Crypto package available
    )
}