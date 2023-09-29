/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
/* eslint-disable no-unreachable */
import React, { useRef, useEffect } from "react"
import PropTypes from "prop-types"
import "../css/sidebar.css"
import "../css/scrollbar.css"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
    faPlus, faFolder, faEllipsisH, faLevelUpAlt
} from "@fortawesome/free-solid-svg-icons"
import { faFolder as faOutlineFolder } from "@fortawesome/free-regular-svg-icons"
import Skeleton from "react-loading-skeleton"
import useActiveItem from "../utils/useActiveItem"
import dropdown from "./Dropdown.jsx"
import formatDate from "../utils/date"
import "react-loading-skeleton/dist/skeleton.css"

function FilesystemItem(props) {
    if (!props.data) return null

    const itemRef = useRef()
    const folderTitleRef = useRef()

    useEffect(() => {
        if (props.createdItem === props.data.i) {
            itemRef.current.dataset.animation = "fadeInDown"
            setTimeout(() => {
                itemRef.current.dataset.animation = ""
            }, 300)

            if (props.data.t === 1) {
                folderTitleRef.current.focus()
                document.execCommand(
                    "selectAll", false, null
                )
            }
        }
    }, [props.createdItem])

    async function saveFolderTitle(event) {
        event.target.blur()
        document.getElementById("editor-element").focus()
        event.preventDefault()

        console.log("[ SIDEBAR ] Updating folder title...")

        if (event.target.innerText.trim() === "") {
            event.target.innerText = "Nimetön kansio"
        }

        const copy = [...props.level]
        const i = copy.findIndex((item) => item.i === props.data.i)
        copy[i].name = event.target.innerText
        props.setLevel(copy) // save client-side

        await window.internal.workers.api(
            "Filesystem", "write", {
                instance: window.internal.ui.activeFilesystemInstance,
                id: props.data.i,
                write: {
                    name: event.target.innerText,
                    type: 1
                }
            }
        )
    }
    const dropdownData = [
        // TODO: Lots of features are missing from here!
        {
            text: "Uudelleennimeä",
            action: () => {
                if (props.data.t === 0) {
                    document.getElementById("documentTitle").focus()
                    document.execCommand(
                        "selectAll", false, null
                    )
                } else {
                    folderTitleRef.current.focus()
                    document.execCommand(
                        "selectAll", false, null
                    )
                }
            }
        },
        /* {
            text: "Monista",
            action: async () => {
                await window.internal.workers.api(
                    "Filesystem", "write", {
                        instance: window.internal.ui.activeFilesystemInstance,
                        id: props.data.i,
                        write: {
                            name: `${props.data.name}-kopio`,
                            type: 0,
                            data: props.data.name
                        }
                    }
                )
                // TODO: refresh filesystem view
            }
        }, */
        /* {
            text: "Siirrä",
            action: () => {}
        }, */
        {
            text: "Poista",
            action: () => {
                // Note: Should there be a dialog to ask if you are sure?
                // eslint-disable-next-line no-restricted-globals, no-alert
                if (confirm(`Haluatko varmasti poistaa "${props.data.name}"?`)) {
                    props.deleteDocument(props.data.i)
                }
            }
        },
        /* {
            text: "Eliminoi", // tähä sellane hauska jekku et se tekee saman ku poista mut antaa full screen räjähdyksen äänen kaa
            action: () => {}
        }, */
        {
            text: "Näytä ID",
            // eslint-disable-next-line no-alert
            action: () => { alert(props.data.i) }
        }
    ]

    const [DropdownComponent, toggleDropdown] = dropdown({
        data: dropdownData,
        origin: "right",
        children: <button className="ellipsis">
            <FontAwesomeIcon icon={faEllipsisH} />
        </button>
    }, true)

    const handleClick = (event) => {
        if (event.type === "contextmenu") {
            event.preventDefault()
            toggleDropdown(event, true)
        } else {
            props.onClick(event)
        }
    }
    if (props.data.t === 1) { // folder
        return (
            <li ref={itemRef}
                className={`fsFolder${props.selected ? " selected" : ""}`}
                onKeyPress={(event) => { if (event.key === "Enter") { handleClick(event) } }}
                onClick={handleClick}
                onContextMenu={handleClick}
                tabIndex="-1">
                {<div className="fsIcon">
                    <FontAwesomeIcon icon={faOutlineFolder} />
                </div>}
                <div className="content">
                    <span
                        className="editableName"
                        spellCheck={false}
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        ref={folderTitleRef}
                        onKeyDown={(event) => { if (event.key === "Enter") { saveFolderTitle(event) } } }
                        onBlur={(event) => { saveFolderTitle(event) }}
                    >{props.data.name}</span>
                </div>
                <div className="action">
                    {DropdownComponent}
                </div>
            </li>
        )
    } if (props.data.t === 0) { // file
        return (
            <li ref={itemRef} className={(props.selected ? "selected" : "")} onClick={handleClick} onContextMenu={handleClick} tabIndex="-1">
                <div className="content">
                    <span>{props.data.name}</span>
                    <span className="date">{props.data.date ? formatDate(props.data.date).pretty : ""}</span>

                </div>
                <div className="action">
                    {DropdownComponent}
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

    const [activeItemData] = useActiveItem(
        props.activeItem, props.level, props.setLevel
    )

    if (level) level.reverse()

    if (document.getElementById("sidebar") && document.getElementById("sidebar").childNodes[0].nodeName.toLowerCase() !== "span") {
        document.getElementById("sidebar").childNodes.forEach((node) => {
            if (node.nodeName.toLowerCase() === "span" && level !== null) node.style.display = "none"
        })
    }

    const treeRef = useRef()
    const currentLevelId = props.fsPath[props.fsPath.length - 1].id
    useEffect(() => {
        treeRef.current.classList.add("fadeInDown")
        setTimeout(() => {
            if (treeRef.current) treeRef.current.classList.remove("fadeInDown")
        }, 300)
    }, [currentLevelId])

    const open = async (item, event) => {
        // to-do: save document before unload.
        if (item.t === 0) {
            props.setCreatedItem("")
            props.setActiveItem(item.i)
            window.internal.ui.activeLocation = item.id // Todo: Move to place
            if (event?.isTrusted) window.internal.ui.editor.hook.focus()
        } else if (item.t === 1) {
            props.openFolder(item.i, item.name)
        }
    }
    const fsSort = (data) => (data
        .sort((a, b) => (b.date - a.date)) // sort by date
        .sort((a, b) => (a.t === 1 ? -1 : 0))) // folders first

    return (
        <div className="sidebar" style={props.style}>
            <div className="head">
                <button id="newAnswerBtn" className="primary" onClick={() => { props.newFsItem(0) }}>
                    <FontAwesomeIcon icon={faPlus} />&nbsp;
                    Uusi vastaus
                </button>
                <button id="newFolderBtn" className="folderSmall" onClick={() => { props.newFsItem(1) }}>
                    <FontAwesomeIcon icon={faFolder} />
                </button>
            </div>
            <div ref={treeRef} className="filesystemLevelParent clean-scrollbar">
                <ul className="filesystemLevel" id="sidebar">
                    {props.fsPath.length > 1 ?
                        <button className="folderUpButton" onClick={() => {
                            props.openFolder(props.fsPath[props.fsPath.length - 2].id)
                        }} tabIndex="-1">
                            <FontAwesomeIcon icon={faLevelUpAlt} />&nbsp;&nbsp;
                            {props.fsPath[props.fsPath.length - 2].name}
                        </button> :
                        null}
                    {level ? fsSort(level).map((item) => {
                        const selected = activeItemData?.i === item.i
                        return <FilesystemItem
                            createdItem={props.createdItem}
                            level={props.level}
                            setLevel={props.setLevel}
                            deleteDocument={props.deleteDocument}
                            key={item.i}
                            data={selected ? activeItemData : item}
                            selected={selected}
                            onClick={(event) => open(item, event)}
                        />
                    }) : null}
                    <Skeleton count={20}/>
                </ul>
            </div>
        </div>
    )
}
