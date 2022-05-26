// Handy global tools for debugging purposes

/* eslint-disable no-unused-vars */
window.reset = async () => {
    // This deletes everything
    localStorage.clear()
    sessionStorage.clear()
    document.cookie = ""
    if (typeof window.indexedDB.databases === "function") {
        // Chromium
        window.indexedDB.databases().then((r) => {
            // eslint-disable-next-line no-plusplus
            for (let i = 0; i < r.length; i++) window.indexedDB.deleteDatabase(r[i].name)
        }).then(() => {
            window.location.reload()
        })
    } else {
        // Everything else
        // eslint-disable-next-line no-alert
        alert("Please clear indexDB manually.")
    }
}

// Implement embedded worker api
window.api = async (
    worker, type, message
) => {
    const req = await window.internal.workers.api(
        worker, type, message
    )
    console.log("Response:", req)
}
