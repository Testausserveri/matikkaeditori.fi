import React from "react"
import PropTypes from "prop-types"
import "../css/sidebar.css"
import formatDate from "../utils/date"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlus, faFolder } from "@fortawesome/free-solid-svg-icons"
import { faFolder as faOutlineFolder } from "@fortawesome/free-regular-svg-icons"

function FilesystemItem(props) {
    if (props.data.type == "folder") {
        return (
            <li className={"fsFolder" + (props.selected ? " selected" : "")} onClick={props.onClick}>
                <div className="fsIcon">
                    <FontAwesomeIcon icon={faOutlineFolder} />
                </div>
                <div className="fsContent">
                    <span>{props.data.name}</span>
                </div>
            </li>
        )
    } else if (props.data.type == 1) {
        return (
            <li className={(props.selected ? "selected" : "")} onClick={props.onClick}>
                <div className="content">
                    <span>{props.data.name}</span>
                    <span className="date">{formatDate(props.data.edited).pretty}</span>
                </div>
            </li>
        )
    }
}

const filesystemItemType = {
    selected: PropTypes.bool,
    data: PropTypes.object
}
FilesystemItem.propTypes = filesystemItemType

export default function Sidebar(props) {
    // todo implement subtrees
    return (
        <div className="sidebar" style={props.style}>
            <div className="head">
                <button className="primary" onClick={props.newDocument}>
                    <FontAwesomeIcon icon={faPlus} />&nbsp;
                    Uusi vastaus
                </button>
                <button className="folderSmall">
                    <FontAwesomeIcon icon={faFolder} />
                </button>
            </div>
            <ul className="filesystemLevel">
                {Object.keys(props.level).map(key => {
                    const value = props.level[key]
                    return <FilesystemItem key={value.uuid} data={value} />
                    /*
                    return <FilesystemItem key={item.id} data={item} selected={(props.selectedItem == item.id)} onClick={() => {
                        if (item.type == "answer") {
                            props.openItem(item.id)
                            // open answer
                        } else if (item.type == "folder") {
                            // open folder
                        }
                    }}
                     />*/
                })}
            </ul>
        </div>
    )
}

Sidebar.propTypes = {
    level: PropTypes.array,
    newDocument: PropTypes.func,
    selectedItem: PropTypes.string,
    openItem: PropTypes.func,
    style: PropTypes.any
}
