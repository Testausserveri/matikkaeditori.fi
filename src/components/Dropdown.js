/* eslint-disable react/prop-types */
import React, { useState, useEffect, useRef } from "react"
import "../css/dropdown.css"

export default function Dropdown(props) {
    const [dropdownOpened, setDropdownOpened] = useState(false)
    const dropdownRef = useRef()
    function toggleDropdown(event) {
        event.stopPropagation()
        setDropdownOpened(!dropdownOpened)
    }
    useEffect(() => {
        function handleWindowClickEvent(event) { 
            if (dropdownOpened && dropdownRef.current !== event.target.closest(".dropdownContainer")) {
                setDropdownOpened(false)
            }
        }

        document.addEventListener("mousedown", handleWindowClickEvent)
        return () => {
            document.removeEventListener("mousedown", handleWindowClickEvent)
        }
    }, [dropdownOpened])
    return (
        <span ref={dropdownRef} className="dropdownContainer">
            <div className={"dropdown" + (props.origin === "left" ? " leftOrigin" : "")} style={dropdownOpened ? {transform: "scale(1)", opacity: "1"} : {transform: "scale(0)", opacity: "0"}}>
                <ul>
                    {props.data.map(option => (
                        <li key={option.text} onClick={(event) => {
                            event.stopPropagation()
                            setDropdownOpened(false)
                            option.action(props.context)
                        }}>{option.text}</li>
                    ))}
                </ul>
            </div>
            <span onClick={toggleDropdown}>{props.children}</span>
        </span>
    )
}