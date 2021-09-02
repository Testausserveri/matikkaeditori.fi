/* eslint-disable no-unreachable */
import React from "react"
import PropTypes from "prop-types"
import "../css/sidebar.css"
import formatDate from "../utils/date"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlus, faFolder } from "@fortawesome/free-solid-svg-icons"
import { faFolder as faOutlineFolder } from "@fortawesome/free-regular-svg-icons"

function FilesystemItem(props) {
    if (props.data.t == 1) { // folder
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
    } else if (props.data.t == 0) { // file
        return (
            <li className={(props.selected ? "selected" : "")} onClick={props.onClick}>
                <div className="content">
                    <span>{props.data.name}</span>
                    <span className="date">{formatDate(props.data.date).pretty}</span>
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
    const level = (props.level ? [...props.level] : null)
    if (level) level.reverse()

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
                {level ? level.map((item) => {
                    const selected = props.selectedItem?.i == item.i

                    return <FilesystemItem key={item.i} data={selected ? props.selectedItem : item} selected={selected} onClick={() => props.setSelectedItem(item)}
                    />
                }) : null}
            </ul>
        </div>
    )
}

Sidebar.propTypes = {
    level: PropTypes.array,
    newDocument: PropTypes.func,
    selectedItem: PropTypes.string,
    setSelectedItem: PropTypes.func,
    style: PropTypes.any
}
