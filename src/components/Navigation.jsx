/* eslint-disable react/react-in-jsx-scope */

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faDiscord } from "@fortawesome/free-brands-svg-icons"
import { faExclamationTriangle, faFileText, faPray } from "@fortawesome/free-solid-svg-icons"
import { useState } from "react"
import Dropdown from "./Dropdown"
import logo from "../assets/icon.svg"
import testausserveriLogo from "../assets/testausserveri.svg"
import { saveAs } from "../utils/export"

export default function Navigation() {
    const [thanksDisabled, setThanksDisabled] = useState(false)
    return (
        <div className="navigation">
            <div>
                <img src={logo} alt="Matikkaeditori.fi" />
            </div>
            <div>
                <p>{window.internal.versionHash}</p>
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
                                // eslint-disable-next-line no-alert
                                const thanksFrom = prompt("Keneltä kiitokset?").trim() || "nimetön"
                                await fetch("https://takahuone.matikkaeditori.fi/shawarma", {
                                    method: "POST",
                                    mode: "no-cors",
                                    headers: {
                                        "Content-Type": "application/x-www-form-urlencoded"
                                    },
                                    body: `from=${encodeURIComponent(thanksFrom)}`
                                })
                                // eslint-disable-next-line no-alert
                                alert(`Olet ihana, ${thanksFrom} 💖`)
                                setThanksDisabled(true)
                            },
                            icon: <FontAwesomeIcon icon={faPray} />,
                            disabled: thanksDisabled
                        }, {
                            text: "Vie loki",
                            action: async () => {
                                saveAs(`data:text/plain;charset=utf-8,${encodeURIComponent(window.internal.console.logs.join("\n"))}`, "logs.txt")
                            },
                            icon: <FontAwesomeIcon icon={faFileText} />
                        }
                    ]}>
                        Kehittäjä
                    </Dropdown>
                </a>
                <a href="https://kaava.matikkaeditori.fi" target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                    <a className="navLink">
                        Kaavakirja
                    </a>
                </a>
                {/* <a className="navLink">
                    Asetukset
                </a> */}
            </div>
        </div>
    )
}
