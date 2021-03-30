Date.prototype.getWeek = function () {
    const onejan = new Date(this.getFullYear(),0,1)
    const today = new Date(this.getFullYear(),this.getMonth(),this.getDate())
    const dayOfYear = ((today - onejan + 86400000)/86400000)
    return Math.ceil(dayOfYear/7)
}

export default function formatDate(date) {
    date = new Date(date)
    let pretty
    if (new Date().getWeek() == date.getWeek()) {
        pretty = ["Sunnuntaina", "Maanantaina", "Tiistaina", "Keskiviikkona", "Torstaina", "Perjantaina", "Lauantaina"][date.getDay()]
        pretty += ` ${date.getHours()}:${date.getMinutes().toString().padEnd(1, "0")}`
    }
    return {
        pretty: pretty
    }
}