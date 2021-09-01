/* eslint-disable react/react-in-jsx-scope */
// Main app function
import "./css/main.css"
import Document from "./components/Document"
import Sidebar from "./components/Sidebar"
import { EquationSidebar, MobileEquationToolbar } from "./components/EquationSidebar"
import MathTools from "./components/MathTools"
import logo from "./assets/icon.svg"
import PropTypes from "prop-types"
import { useEffect, useState } from "react"
import useWindowDimensions from "./utils/useWindowDimensions"

function DesktopView({newDocument, level, selectedItem, openItem}) {
    return (
        <>
            <Sidebar newDocument={newDocument} level={level} selectedItem={selectedItem} openItem={openItem} />
            <Document />
            <EquationSidebar />
        </>
    )
}

function MobileView({newDocument, level, selectedItem, openItem}) {
    // 0: file tree
    // 1: editor
    // 2: equations
    const [viewState] = useState(1)

    switch (viewState) {
    case 0:
        return (
            <>
                <Sidebar style={{flex: "1"}} newDocument={newDocument} level={level} selectedItem={selectedItem} openItem={openItem} />
            </>
        )
    case 1:
        return (
            <>
                <Document />
                <MobileEquationToolbar />
            </>
        )
    }
    
}

const viewPropTypes = {
    newDocument: PropTypes.func,
    level: PropTypes.object,
    selectedItem: PropTypes.string,
    openItem: PropTypes.func
}
MobileView.propTypes = viewPropTypes
DesktopView.propTypes = viewPropTypes

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
                    <DesktopView newDocument={newDocument} level={fsLevel} selectedItem={selectedItem} openItem={setSelectedItem} />
                    :
                    <MobileView newDocument={newDocument} level={fsLevel} selectedItem={selectedItem} openItem={setSelectedItem} />
                )}
                
            </div>
            <MathTools></MathTools>
        </>
    )
}

export default App
