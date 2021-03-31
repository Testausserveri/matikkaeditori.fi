/* eslint-disable react/react-in-jsx-scope */
// Main app function
import "./css/main.css"
import Document from "./components/Document"
import Sidebar from "./components/Sidebar"
import EquationSidebar from "./components/EquationSidebar"
import logo from "./assets/icon.svg"
import { useEffect, useState } from "react"
import useWindowDimensions from "./utils/useWindowDimensions"

// Import static components
import error from "./js/error.js"
import * as Workers from "./js/workers.js"

function loadFilesystem() {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
        // Load FS
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
    })
}
function App() {
    // Return base page
    const [fsLevel, setfsLevel] = useState({})
    const [selectedItem, setSelectedItem] = useState("")
    const { width: windowWidth } = useWindowDimensions()

    function newDocument() {
        console.log("Placeholder")
    }
    
    useEffect(() => {
        Workers.api("filesystem", "ready", "").then(async () => {
            // Now ready!
            loadFilesystem()
                .then((data) => {
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
                {(windowWidth > 800 ?
                    <>
                        <Sidebar newDocument={newDocument} level={fsLevel} selectedItem={selectedItem} openItem={setSelectedItem} />
                        <Document />
                        <EquationSidebar />
                    </>
                    :
                    <>
                        <Sidebar style={{flex: "1"}} newDocument={newDocument} level={fsLevel} selectedItem={selectedItem} openItem={setSelectedItem} />
                    </>
                )}
                
            </div>
        </>
    )
}

export default App
