import React, { useState, useEffect } from "react"
import PropTypes from "prop-types"
import "../css/dropdown.css"

export default function Dropdown(props) {
    const [dropdownOpened, setDropdownOpened] = useState(false)
    function toggleDropdown() {
        setDropdownOpened(!dropdownOpened)
    }
    useEffect(() => {
        function handleWindowClickEvent(event) {
            if (dropdownOpened && !event.target.closest(".dropdownContainer")) {
                setDropdownOpened(false)
            }
        }

        document.addEventListener("mousedown", handleWindowClickEvent)
        return () => {
            document.removeEventListener("mousedown", handleWindowClickEvent)
        }
    }, [dropdownOpened])
    return (
        <span className="dropdownContainer">
            <div className="dropdown" style={dropdownOpened ? {transform: "scale(1)", opacity: "1"} : {transform: "scale(0)", opacity: "0"}}>
                <ul>
                    {props.data.map(option => (
                        <li key={option.text} onClick={() => {
                            setDropdownOpened(false)
                            option.action()
                        }}>{option.text}</li>
                    ))}
                </ul>
            </div>
            <span onClick={toggleDropdown}>{props.children}</span>
        </span>
    )
}
Dropdown.propTypes = {
    children: PropTypes.any,
    data: PropTypes.any
}