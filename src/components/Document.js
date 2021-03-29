import React from "react"

export default function Document() {
    function onDocumentTitleKeyUp(event) {
        if (event.key == "Enter") {
            event.target.blur()
            event.preventDefault()
            if (event.target.innerHTML.trim() == "") {
                event.target.innerHTML = "Nimetön vastaus"
            }
        }
    }

    return (
        <div className="document">
            <div className="head">
                <h2 spellCheck={false} contentEditable={true} id="documentTitle" onKeyDown={onDocumentTitleKeyUp}>MAA05 T. 12 S. 8</h2>
            </div>
            <div className="page" contentEditable={true} spellCheck={false}>
                <p>bbbb</p>
            </div>
        </div>
    )
}