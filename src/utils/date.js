Date.prototype.getWeek = function () {
    const onejan = new Date(this.getFullYear(),0,1)
    const today = new Date(this.getFullYear(),this.getMonth(),this.getDate())
    const dayOfYear = ((today - onejan + 86400000)/86400000)
    return Math.ceil(dayOfYear/7)
}

export default function formatDate(date) {
    date = new Date(date)
    let today = new Date()
    let pretty
    if (today.getDate() == date.getDate() && today.getMonth() == date.getMonth() && today.getFullYear() == date.getFullYear()) {
        pretty = "Tänään"
    } else if (today.getDate() + 1 == date.getDate() && today.getMonth() == date.getMonth() && today.getFullYear() == date.getFullYear()) { // This will not work when month changes, but that's minor stuff
        pretty = "Eilen"
    } else if (today.getWeek() == date.getWeek() && today.getFullYear() == date.getFullYear()) {
        pretty = ["Sunnuntai", "Maanantai", "Tiistai", "Keskiviikko", "Torstai", "Perjantai", "Lauantai"][date.getDay()]
    } else {
        pretty = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`
    }
    // to-do: check if the following makes sense
    pretty += ` ${date.getHours().toString().padEnd(1, "0")}:${date.getMinutes().toString().padEnd(1, "0")}`
    return {
        pretty: pretty.trim()
    }
}