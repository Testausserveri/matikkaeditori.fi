/* eslint-disable react/prop-types */
import React from "react"
import { useRef, useEffect } from "react"

import "../css/editor.css"
import "../css/tooltip.css"
import Editor from "../js/editor/editor.js"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faDownload } from "@fortawesome/free-solid-svg-icons"

import Dropdown from "./Dropdown"

import Export from "../js/export"


// eslint-disable-next-line react/prop-types
export default function Document(props) {
    const answerRef = useRef()
    const resultRef = useRef()
    const titleRef = useRef()

    const exportDropdown = [
        {
            text: "Tallenna leikepöydälle",
            action: () => {Export("image-clipboard")}
        },
        {
            text: "Tallenna PDF",
            action: () => {Export("pdf")}
        },
        {
            text: "Tallenna kuvana",
            action: () => {Export("image")}
        }
        
    ]
    // Editor result content is available inside resultRef, the answerRef is just an visual editor with extra stuff

    useEffect(() => {
        // Load answer into editor here
        answerRef.current.innerHTML = props.selectedItem?.data
        window.editor = new Editor(answerRef.current)
        window.editor.init()
        answerRef.current.contentEditable = true
        answerRef.current.focus() // Focus on page load
    }, [resultRef, props.selectedItem])

    function onDocumentTitleKeyUp(event) {
        if (event.key == "Enter") {
            event.target.blur()
            event.preventDefault()

            let temp = props.selectedItem
            temp.name = event.target.innerText
            props.setSelectedItem({...temp})

            if (event.target.innerHTML.trim() == "") {
                event.target.innerHTML = "Nimetön vastaus"
            }
        }
    }

    return (
        <div className="document">
            <div className="head">
                <h2 spellCheck={false} contentEditable={true} id="documentTitle" suppressContentEditableWarning={true} onKeyDown={onDocumentTitleKeyUp} ref={titleRef}>{props.selectedItem?.name}</h2>
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