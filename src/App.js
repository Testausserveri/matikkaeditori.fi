/* eslint-disable react/react-in-jsx-scope */
// Main app function
import "./css/main.css"
import Document from "./components/Document"
import Sidebar from "./components/Sidebar"
import EquationSidebar from "./components/EquationSidebar"
import logo from "./assets/icon.svg"
import { useEffect, useState } from "react"
import useWindowDimensions from "./utils/useWindowDimensions"

function App() {
    // Return base page
    const [fsLevel, setfsLevel] = useState({})
    const [selectedItem, setSelectedItem] = useState("")
    const { width: windowWidth } = useWindowDimensions()

    function newDocument() {
        console.log("Placeholder")
    }
    
    useEffect(async () => {
        // eslint-disable-next-line no-async-promise-executor
        try {
            await window.internal.workers.essential
            let fs_type = localStorage.getItem("fs_type")
            if(fs_type === null) fs_type = 0
            const instance = await window.internal.workers.api("Filesystem", "init", { type: fs_type })
            setfsLevel(instance.index)
        }
        catch(e){
            console.debug(e)
            console.error("Failed to initialize filesystem")
        }
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
