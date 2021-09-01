/**
 * --------------------------------------------
 * Upgrade older save version to newer versions
 * --------------------------------------------
 */
export default {
    // Process to upgrade the beta version to latest
    "beta": async function () {
        // Nothing to convert
        return true
    },
    "3.0.0": async function () {
        // Convert from legacy
        alert("You cannot yet use v3 with legacy saves.")
        window.location.reload()
    }
}