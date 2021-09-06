/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import React from "react"
import { useRef, useEffect, useCallback } from "react"
import { debounce } from "lodash"

import "../css/editor.css"
import "../css/tooltip.css"
import Editor from "../js/editor/editor.js"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faDownload } from "@fortawesome/free-solid-svg-icons"

import Dropdown from "./Dropdown"

import Export from "../js/export"
import useActiveItem from "../utils/useActiveItem"


// eslint-disable-next-line react/prop-types
export default function Document(props) {
    const answerRef = useRef()
    const resultRef = useRef()
    const titleRef = useRef()
    const [activeItemData, setActiveItemData] = useActiveItem(props.activeItem, props.level, props.setLevel)

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

    const save = async (item) => {
        console.log("[ SAVE ] Hey bitches we're saving")
        const format = await window.internal.ui.editor.format()
        console.log(titleRef.current.innerText, format)
        
        await window.internal.workers.api("Filesystem", "write", {
            instance: window.internal.ui.activeFilesystemInstance,
            id: window.internal.ui.editor.target.i,
            write: {
                data: format,
                type: 0
            }
        })
        //window.internal.ui.editor.events.dispathEvent(new CustomEvent("saved"))
    }

    const debouncedSave = useCallback(debounce(save, 2000), [])

    /*
window.internal.ui.editor.save()
    */
    // Editor result content is available inside resultRef, the answerRef is just an visual editor with extra stuff

    useEffect(async () => {
        // Load answer into editor here
        answerRef.current.contentEditable = false
        if(!window.internal.ui.editor){
            window.internal.ui.editor = new Editor(answerRef.current)
            //window.internal.ui.editor.oninput = debouncedSave
            window.internal.ui.editor.oninput = () => {
                //window.internal.ui.editor.events.dispathEvent(new CustomEvent("modified"))
                debouncedSave()
            }
            await window.internal.ui.editor.init()
        }
        answerRef.current.contentEditable = true

        console.log(activeItemData)
        if(activeItemData.i) await window.internal.ui.editor.load(activeItemData, activeItemData.i)
        answerRef.current.focus() // Focus on page load
    }, [resultRef, activeItemData])

    async function saveTitle(event) {
        event.target.blur()
        event.preventDefault()

        let temp = activeItemData
        temp.name = event.target.innerText
        //props.setSelectedItem({...temp})
        setActiveItemData({...temp})

        if (event.target.innerHTML.trim() == "") {
            event.target.innerHTML = "Nimetön vastaus"
        }
        console.log("[ EDITOR ] Updating document title...")
        await window.internal.workers.api("Filesystem", "write", {
            instance: window.internal.ui.activeFilesystemInstance,
            id: window.internal.ui.editor.target.i,
            write: {
                name: event.target.innerText,
                type: 0
            }
        })
    }

    return (
        <div className="document">
            <div className="head">
                <h2 
                    spellCheck={false} 
                    contentEditable={true} 
                    id="documentTitle" 
                    suppressContentEditableWarning={true} 
                    onClick={() => {document.execCommand("selectAll",false,null)}} 
                    onKeyDown={(event) => {if (event.key == "Enter") {saveTitle(event)}} } 
                    onBlur={(event) => {saveTitle(event)}}
                    ref={titleRef}>
                    {activeItemData?.name}
                </h2>

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