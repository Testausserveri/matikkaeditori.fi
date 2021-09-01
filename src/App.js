/* eslint-disable react/react-in-jsx-scope */
// Main app function
import "./css/main.css"
import Document from "./components/Document"
import Sidebar from "./components/Sidebar"
import MathTools from "./components/MathTools"
import EquationSidebar from "./components/EquationSidebar"
import logo from "./assets/icon.svg"
import { useEffect, useState } from "react"
import useWindowDimensions from "./utils/useWindowDimensions"

function App() {
    // Return base page
    // eslint-disable-next-line no-unused-vars
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
            console.log("[ APP ] Created database instance:", instance)
            console.warn("[ WARNING ] Cannot set fs level due to incomplete react components.")
            //setfsLevel(instance.index)
        }
        catch(e){
            console.error("[ APP ] Failed to initialize filesystem")
            console.debug(e)
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
            <MathTools></MathTools>
        </>
    )
}

export default App
