// eslint-disable-next-line no-extend-native
Date.prototype.getWeek = () => {
    const baseDate = new Date()
    const onejan = new Date(
        baseDate.getFullYear(), 0, 1
    )
    const today = new Date(
        baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate()
    )
    const dayOfYear = ((today - onejan + 86400000) / 86400000)
    return Math.ceil(dayOfYear / 7)
}

export default function formatDate(dateInput) {
    const date = new Date(dateInput) // To object
    const today = new Date()
    let pretty
    if (today.getDate() === date.getDate() && today.getMonth() === date.getMonth() && today.getFullYear() === date.getFullYear()) {
        pretty = "Tänään"
    } else if (today.getDate() - 1 === date.getDate() && today.getMonth() === date.getMonth() && today.getFullYear() === date.getFullYear()) { // This will not work when month changes, but that's minor stuff
        pretty = "Eilen"
    } else if (today.getWeek() === date.getWeek() && today.getFullYear() === date.getFullYear()) {
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
