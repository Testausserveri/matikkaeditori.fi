/* eslint-disable react/react-in-jsx-scope */
// Main app function
import "./css/main.css"
import Document from "./components/Document"
import Sidebar from "./components/Sidebar"
import logo from "./assets/icon.svg"
import { useEffect, useState } from "react"

// Import static components
import error from "./js/error.js"
import * as Workers from "./js/workers.js"

function loadFilesystem() {
    return new Promise((resolve) => {
        // UI is now visible
        // Load FS
        let load_fs = async () => {
            if(localStorage.getItem("fs_type") == null){
                // No FS present
                console.log("[ Filesystem ] No previous save found. Creating one...")
                localStorage.setItem("fs_type", "0")
                await Workers.api("filesystem", "set", {name: "id", value: window.id})
                Workers.api("filesystem", "init", "0").then(async id => {
                    // TODO: UI stuff, such as render
                    Workers.api("filesystem", "index", id).then(index => {
                        resolve(index)
                    })
                }).catch((e) => {
                    error(e)
                })
            }else {
                // Load FS that's present
                console.log("[ Filesystem ] Previous save found. Loading it...")
                await Workers.api("filesystem", "set", {name: "id", value: window.id})
                await Workers.api("filesystem", "init", localStorage.getItem("fs_type")).then(async id => {
                    // TODO: UI stuff, such as render
                    Workers.api("filesystem", "index", id).then(index => {
                        resolve(index)
                    })
                }).catch((e) => {
                    error(e)
                })
            }
        }
        // Trigger load_fs when the Filesystem worker is ready
        let e = setInterval(async () => {
            if(window.fs_ready == true){
                clearInterval(e)
                load_fs()
            }
        }, 50)
    })
}
function App() {
    // Return base page
    const [fsLevel, setfsLevel] = useState({})
    const [selectedItem, setSelectedItem] = useState("")

    function newDocument() {
        console.log("Placeholder")
    }
    
    useEffect(() => {
        Workers.api("filesystem", "ready", "").then(async () => {
            // Now ready!
            loadFilesystem()
                .then((data) => {
                    console.log(data)
                    setfsLevel(data)
                })
        })
    }, [])

    return (
        <>
            <div className="navigation">
                <img src={logo} alt="Matikkaeditori.fi" />
            </div>
            <div className="app">
                <Sidebar newDocument={newDocument} level={fsLevel} selectedItem={selectedItem} openItem={setSelectedItem} />
                <Document />
            </div>
        </>
    )
}

export default App
