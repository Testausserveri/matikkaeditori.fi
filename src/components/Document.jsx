import React, { useRef, useEffect } from "react"

import "../css/editor.css"
import "../css/tooltip.css"
import "../css/scrollbar.css"
import "../math-editor/input.css"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faDownload } from "@fortawesome/free-solid-svg-icons"
import Skeleton from "react-loading-skeleton"
import Editor from "../math-editor/editor"

import Dropdown from "./Dropdown.jsx"

import exportUtil from "../utils/export"
import useActiveItem from "../utils/useActiveItem"
import "react-loading-skeleton/dist/skeleton.css"

// eslint-disable-next-line react/prop-types
export default function Document({
    // eslint-disable-next-line no-unused-vars
    createdItem, setActiveItem, activeItem, level, setLevel, setMobileViewState, isMobile, fsPath, openFolder
}) {
    const answerRef = useRef()
    const resultRef = useRef()
    const titleRef = useRef()
    const [activeItemData, saveActiveItemData] = useActiveItem(
        activeItem, level, setLevel
    )

    const exportDropdown = [
        {
            text: "Tallenna kuva leikepöydälle",
            action: () => { exportUtil("image-clipboard") }
        },
        {
            text: "Kopioi teksti leikepöydälle",
            action: () => { exportUtil("txt-clipboard") }
        },
        {
            text: "Tallenna PDF",
            action: () => { exportUtil("pdf") }
        },
        {
            text: "Tallenna Tekstinä",
            action: () => { exportUtil("txt-file") }
        },
        {
            text: "Tallenna kuvana",
            action: () => { exportUtil("image") }
        }

    ]

    useEffect(async () => {
        // Load answer into editor here
        answerRef.current.contentEditable = false

        if (!window.internal.ui.editor) {
            // Initialize editor
            window.internal.ui.editor = new Editor(answerRef.current)
            await window.internal.ui.editor.init()
        }
        answerRef.current.contentEditable = true

        // Load active item
        window.internal.ui.activeLocation = activeItem
        if (activeItemData?.i) {
            await window.internal.ui.editor.setContent(activeItemData.data)
            window.internal.ui.saved = true
        }
    }, [resultRef, activeItemData?.i])

    const save = async () => {
        // TODO: Getting the content on every oninput causes massive lag
        const format = await window.internal.ui.editor.getContent()
        document.getElementById("saveIndicator").className = "saveIndicator"

        const copy = { ...activeItemData }
        copy.data = format
        copy.date = new Date().getTime()

        saveActiveItemData(copy)
    }

    useEffect(() => {
        window.internal.ui.editor.hook.oninput = save
    }, [activeItemData])

    async function saveTitle(event) {
        event.target.blur()
        answerRef.current.focus()
        event.preventDefault()

        const copy = activeItemData
        copy.name = event.target.innerText
        saveActiveItemData({ ...copy })

        if (event.target.innerHTML.trim() === "") {
            event.target.innerHTML = "Nimetön vastaus"
        }
        console.log("[ EDITOR ] Updating document title...")
        await window.internal.workers.api(
            "Filesystem", "write", {
                instance: window.internal.ui.activeFilesystemInstance,
                id: window.internal.ui.activeLocation,
                write: {
                    name: event.target.innerText.trim(),
                    type: 0
                }
            }
        )
    }

    useEffect(() => {
        if (createdItem === activeItem && activeItemData?.t === 0) {
            titleRef.current.focus()
            document.execCommand(
                "selectAll", false, null
            )
        }
    }, [createdItem, activeItemData?.i])

    return (
        <div className="document">
            <div className="head">
                <div className="headMain">
                    {/* isMobile ?
                        <button className="mobileBack" onClick={() => {
                            setMobileViewState(0)
                        }}>
                            <FontAwesomeIcon icon={faChevronLeft} />
                        </button>
                    : null */}

                    <span className={`documentPath${fsPath.length > 1 ? " expanded" : ""}`}>{fsPath.map((item) => (
                        <>
                            <span className="documentPathItem" onClick={() => openFolder(item.id)}>{item.name}</span>
                            &nbsp;›&nbsp;
                        </>
                    ))}</span>

                    <h2
                        spellCheck={false}
                        contentEditable={true}
                        className={fsPath.length > 1 ? "slimmer" : ""}
                        id="documentTitle"
                        suppressContentEditableWarning={true}
                        onClick={() => {
                            document.execCommand(
                                "selectAll", false, null
                            )
                        }}
                        onKeyDown={(event) => { if (event.key === "Enter") { saveTitle(event) } } }
                        onBlur={(event) => { saveTitle(event) }}
                        ref={titleRef}>
                        {activeItemData?.name ?? <Skeleton style={{ width: "12rem", height: "2rem", background: "white" }}/>}
                    </h2>

                </div>
                <div className="headSecondary">
                    <p>Tallenne:</p>
                    <div className="savedIndicator" id="saveIndicator"></div>
                    <Dropdown data={exportDropdown}>
                        <button className="secondary">
                            <FontAwesomeIcon icon={faDownload} /> Vie
                        </button>
                    </Dropdown>
                </div>
            </div>
            <h1 className="droptext" id="droptext" >Pudota kuva tai gif ja lisää se editoriin!</h1>
            <div className="page" spellCheck={false}>
                <div autoFocus="true" ref={answerRef} className="editor clean-scrollbar add-scrollbar-padding-with-border" id="editor-element" contentEditable="false"></div>
            </div>
        </div>
    )
}
