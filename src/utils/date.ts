export default function formatDate(dateInput: string | number | Date) {
    const date = new Date(dateInput) // To object
    const today = new Date()
    let pretty
    if (today.getDate() === date.getDate() && today.getMonth() === date.getMonth() && today.getFullYear() === date.getFullYear()) {
        pretty = "Tänään"
    } else if (today.getDate() - 1 === date.getDate() && today.getMonth() === date.getMonth() && today.getFullYear() === date.getFullYear()) { // This will not work when month changes, but that's minor stuff
        pretty = "Eilen"
    } else if (today.getFullYear() === date.getFullYear()) { // TODO: Check if this is correct. See the changes that happened in the Typescript pull request (https://github.com/Testausserveri/matikkaeditori.fi-v3/pull/47)
        pretty = ["Sunnuntai", "Maanantai", "Tiistai", "Keskiviikko", "Torstai", "Perjantai", "Lauantai"][date.getDay()]
    } else {
        pretty = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`
    }
    // to-do: check if the following makes sense
    pretty += ` ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
    return {
        pretty: pretty.trim()
    }
}
