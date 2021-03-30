import React from "react"
import "../css/sidebar.css"
import "../css/equationsidebar.css"
import PropTypes from "prop-types"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSquareRootAlt } from "@fortawesome/free-solid-svg-icons"

import specialCharacters from "./editor/specialCharacters"
import latexCommands from "./editor/latexCommands"

function writeSymbol(event) {
    event.preventDefault()
    const symbol = event.target.dataset.latexcommand
    if (document.activeElement.classList.contains("page")) {
        document.execCommand("insertText", false, symbol)
    }
}

function SymbolGroup({symbols}) {
    return (
        <div className="symbolGroup">
            <h3>{symbols.label}</h3>
            <div className="symbols">
                {symbols.characters.map((character) => {
                    if (character.popular == true || 1 == 1) {
                        return (
                            <div key={character.character || character.action} onMouseDown={writeSymbol} data-latexCommand={character.latexCommand || character.action}>
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
    }
}

export default function EquationSidebar() {
    return (
        <div className="sidebar">
            <div className="head">
                <button className="primary">
                    <FontAwesomeIcon icon={faSquareRootAlt} />&nbsp;
                    Lisää kaava
                </button>
            </div>
            <div>
                <SymbolGroup key={"eqgroup"} symbols={{
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