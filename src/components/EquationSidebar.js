import React, { useEffect, useState } from "react"
import "../css/sidebar.css"
import "../css/equationsidebar.css"
import PropTypes from "prop-types"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSquareRootAlt } from "@fortawesome/free-solid-svg-icons"

import specialCharacters from "../rich-text-editor/specialCharacters"
import latexCommands from "../rich-text-editor/latexCommandsWithSvg"

function writeSymbol(event) {
    event.preventDefault()
    const data = JSON.parse(event.target.closest("div[data-data]").dataset.data)

    if (!window.math.focus.equationField && !data.action && document.activeElement.classList.contains("editor")) {
        document.execCommand("insertText", false, data.character)
    }

    if (data.action) {
        // math equation
        window.math.insertMath(data.action, data.latexCommand, data.useWrite)
    } else {
        window.math.insertMath(data.latexCommand || data.character, undefined, !data.noWrite)
    }
    
}

function SymbolGroup({symbols, hidden}) {
    return (
        <div className="symbolGroup" style={{maxHeight: hidden ? "0" : "500px"}}>
            <h3>{symbols.label}</h3>
            <div className="symbols">
                {symbols.characters.map((character) => {
                    if (character.popular == true || 1 == 1) {
                        return (
                            <div key={character.character || character.action} onMouseDown={writeSymbol} data-data={JSON.stringify(character)}>
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

export default function EquationSidebar() {
    const [latexCommandsVisible, setLatexCommandsVisible] = useState(false)
    useEffect(() => {
        window.setLatexCommandsVisibility = function (state) {
            setLatexCommandsVisible(state)
        }
    }, [])

    return (
        <div className="sidebar">
            <div className="head">
                <button className="primary" onClick={(e) => {window.math.insertNewEquationSafe(e)}}>
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