import React, { useEffect, useState } from "react"
import "../css/sidebar.css"
import "../css/equationsidebar.css"
import PropTypes from "prop-types"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSquareRootAlt } from "@fortawesome/free-solid-svg-icons"

import specialCharacters from "../js/editor/specialChars.js"
import latexCommands from "../js/editor/commands.js"

function writeSymbol(event, data) {
    event.preventDefault()
    if(window.internal.ui.editor.activeMathElement != null){
        if(data.action != undefined){
            window.internal.ui.editor.activeMathElement.input.cmd(data.action)
        }else {
            window.internal.ui.editor.activeMathElement.input.typedText(data.character)
        }
    }else {
        document.execCommand("insertText", false, data.character)
    }
}

function SymbolGroup({symbols, hidden}) {
    return (
        <div className="symbolGroup" style={{maxHeight: hidden ? "0" : "500px", marginBottom: hidden ? "0" : "1rem"}}>
            <h3>{symbols.label}</h3>
            <div className="symbols">
                {symbols.characters.map((character) => {
                    if (character.popular == true || 1 == 1) {
                        return (
                            <div key={character.character || character.action} onMouseDown={(event) => {writeSymbol(event, character)}}>
                                {character.character
                                || <img src={character.svg} />}
                            </div>
                        )
                    }
                })}
            </div>
        </div>
    )
}
SymbolGroup.propTypes = {
    symbols: {
        label: PropTypes.string,
        characters: PropTypes.any
    },
    hidden: PropTypes.any
}

export function MobileEquationToolbar() {
    return (
        <div className="mobileToolbar">
            hello
        </div>
    )
}

export function EquationSidebar() {
    const [latexCommandsVisible, setLatexCommandsVisible] = useState(false)
    useEffect(() => {
        window.setLatexCommandsVisibility = function (state) {
            setLatexCommandsVisible(state)
        }
    }, [])

    return (
        <div className="sidebar equationSidebar">
            <div className="head">
                <button className="primary" onClick={async () => {
                    window.internal.ui.editor.hook.focus() // Force focus
                    const Math = window.internal.ui.editor.local.Math
                    const mathElement = await Math.create()
                    let target = window.internal.ui.editor.activeLine
                    if(target === null) target = window.internal.ui.editor.hook
                    target.appendChild(mathElement.container)
                    Math.open(mathElement.id)
                }}>
                    <FontAwesomeIcon icon={faSquareRootAlt} />&nbsp;
                    Lisää kaava
                </button>
            </div>
            <div>
                <SymbolGroup hidden={!latexCommandsVisible} symbols={{
                    label: "Kaavat",
                    characters: latexCommands
                }} />
                
                {specialCharacters.map(group => (
                    <SymbolGroup key={group.label + "group"} symbols={group} />
                ))}
            </div>
        </div>
    )
}