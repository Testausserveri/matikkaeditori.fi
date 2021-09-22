/* eslint-disable react/react-in-jsx-scope */

import testausserveriLogo from "../assets/testausserveri.svg"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faDiscord } from "@fortawesome/free-brands-svg-icons"
import Dropdown from "../components/Dropdown"
import logo from "../assets/icon.svg"
import { faExclamationTriangle, faPray } from "@fortawesome/free-solid-svg-icons"
import { useState } from "react"

export function Navigation() {
    const [thanksDisabled, setThanksDisabled] = useState(false)
    return (
        <div className="navigation">
            <div>
                <img src={logo} alt="Matikkaeditori.fi" />
            </div>
            <div>
                <a href="https://discord.gg/testaus" target="_blank" rel="noreferrer" className="iconLink">
                    <FontAwesomeIcon icon={faDiscord} />
                </a>
                <a href="https://testausserveri.fi" target="_blank" rel="noreferrer" className="iconLink">
                    <img src={testausserveriLogo} />
                </a>
                <a className="navLink">
                    <Dropdown className="navLink" data={[
                        {
                            text: "Tyhjennä data",
                            action: async () => {
                                await window.internal.workers.api("Filesystem", "reset")
                                window.reset()
                            },
                            icon: <FontAwesomeIcon icon={faExclamationTriangle} />
                        },
                        {
                            text: "Kiitä kehittäjiä",
                            action: async () => {
                                const thanksFrom = prompt("Keneltä kiitokset?").trim() || "nimetön"
                                await fetch("https://takahuone.matikkaeditori.fi/shawarma", {
                                    method: "POST",
                                    mode: "no-cors",
                                    headers: {
                                        "Content-Type": "application/x-www-form-urlencoded"
                                    },
                                    body: `from=${encodeURIComponent(thanksFrom)}`
                                })
                                alert(`Olet ihana, ${thanksFrom} 💖`)
                                setThanksDisabled(true)
                            },
                            icon: <FontAwesomeIcon icon={faPray} />,
                            disabled: thanksDisabled
                        }
                    ]}>
                        Kehittäjä
                    </Dropdown>
                </a>
                <a className="navLink">
                    Kaavakirja
                </a>
                <a className="navLink">
                    Asetukset
                </a>
            </div>
        </div>
    )
}