import React, { useEffect, useState } from "react"
import "../css/sidebar.css"
import "../css/equationsidebar.css"
import PropTypes from "prop-types"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSquareRootAlt } from "@fortawesome/free-solid-svg-icons"

import specialCharacters from "../js/editor/specialChars"
import latexCommands from "../js/editor/commands"

function writeSymbol(event, data) {
    event.preventDefault()
    if (window.internal.ui.editor.activeMathElement != null) {
        if (data.action) {
            if (data.useWrite) {
                window.internal.ui.editor.activeMathElement.dynamicInterface.write(data.action)
            } else if (Array.isArray(data.action)) {
                for (const action of data.action) {
                    window.internal.ui.editor.activeMathElement.dynamicInterface.cmd(action)
                }
            } else {
                window.internal.ui.editor.activeMathElement.dynamicInterface.cmd(data.action)
            }
        } else {
            window.internal.ui.editor.activeMathElement.dynamicInterface.typedText(data.character)
        }
    } else {
        document.execCommand(
            "insertText", false, data.character
        )
    }
}

// if (character.popular == true || 1 === 1)

function SymbolGroup({ symbols, hidden }) {
    return (
        <div className="symbolGroup" style={{ maxHeight: hidden ? "0" : "500px", marginBottom: hidden ? "0" : "1rem" }} id="symbols">
            <h3>{symbols.label}</h3>
            <div className="symbols">
                {symbols.characters.map((character) => (
                    <div key={character.character || character.action} x-tooltip={character.label} onMouseDown={(event) => { writeSymbol(event, character) }}>
                        {character.character || <img src={character.svg} />}
                    </div>))}
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
        window.setLatexCommandsVisibility = (state) => {
            if (state) document.getElementById("symbols").style.overflow = "visible"
            else document.getElementById("symbols").style.overflow = ""
            setLatexCommandsVisible(state)
        }
    }, [])

    return (
        <div className="sidebar equationSidebar">
            <div className="head">
                <button className="primary" onClick={async () => {
                    window.internal.ui.editor.hook.focus() // Force focus
                    const { Math } = window.internal.ui.editor.local
                    const mathElement = await Math.create()
                    let target = window.internal.ui.editor.activeLine
                    if (target === null) target = window.internal.ui.editor.hook
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

                {specialCharacters.map((group) => (
                    <SymbolGroup key={`${group.label}group`} symbols={group} />
                ))}
            </div>
        </div>
    )
}
