import React from "react"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faEdit } from "@fortawesome/free-regular-svg-icons"
import { faPaintBrush, faEllipsisH } from "@fortawesome/free-solid-svg-icons"

export default function MathTools() {
    return (
        <div className="mathTools" id="mathTools">
            <ul>
                <li x-tooltip="Mode"><FontAwesomeIcon icon={faEdit} fill="currentColor"></FontAwesomeIcon></li>
                <li x-tooltip="Style"><FontAwesomeIcon icon={faPaintBrush} fill="currentColor"></FontAwesomeIcon></li>
                <li x-tooltip="More"><FontAwesomeIcon icon={faEllipsisH} fill="currentColor"></FontAwesomeIcon></li>
            </ul>
        </div>
    )
}
