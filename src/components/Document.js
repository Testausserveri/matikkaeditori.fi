import React from "react"
import { useRef, useEffect } from "react"

import "../css/editor.css"
import Editor from "../js/editor/editor.js"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faDownload } from "@fortawesome/free-solid-svg-icons"

import Dropdown from "./Dropdown"


export default function Document() {
    const answerRef = useRef()
    const resultRef = useRef()

    const exportDropdown = [
        {
            text: "Tallenna PDF",
            action: () => {alert("moi")}
        },
        {
            text: "Tallenna kuvana",
            action: () => {alert("moi")}
        },
        {
            text: "Tallenna HTML",
            action: () => {alert("moi")}
        }
    ]
    // Editor result content is available inside resultRef, the answerRef is just an visual editor with extra stuff

    useEffect(() => {
        answerRef.current.innerHTML = ""
        window.editor = new Editor(answerRef.current)
        window.editor.init()
        answerRef.current.contentEditable = true
        answerRef.current.focus() // Focus on page load
    }, [resultRef])
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
                <h2 spellCheck={false} contentEditable={true} id="documentTitle" suppressContentEditableWarning={true} onKeyDown={onDocumentTitleKeyUp}>MAA05 T. 12 S. 8</h2>
                <Dropdown data={exportDropdown}>
                    <button className="secondary">
                        <FontAwesomeIcon icon={faDownload} /> Vie
                    </button>
                </Dropdown>
            </div>
            <div className="page" spellCheck={false}>
                <div ref={answerRef} className="editor" id="editor-element" contentEditable="true"></div>
            </div>
        </div>
    )
}