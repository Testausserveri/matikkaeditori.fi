/* eslint-disable react/prop-types */
import React, { useState, useEffect, useRef } from "react"
import "../css/dropdown.css"

export default function Dropdown(props, deconstructable) {
    const [dropdownOpened, setDropdownOpened] = useState(false)
    const dropdownRef = useRef()
    function toggleDropdown(event, atCursor = false) {
        event.stopPropagation()
        setDropdownOpened(!dropdownOpened)

        let pos, left, top
        if (atCursor) pos = "unset", left = event.pageX + "px", top = event.pageY + "px"

        dropdownRef.current.style.position = pos || null
        dropdownRef.current.querySelector(".dropdown").style.left = left || null
        dropdownRef.current.querySelector(".dropdown").style.top = top || null
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

    const DropdownComponent = (
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
    if (deconstructable) {
        return [DropdownComponent, toggleDropdown]
    } else {
        return DropdownComponent
    }
}