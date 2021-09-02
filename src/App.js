/* eslint-disable react/prop-types */
/* eslint-disable react/react-in-jsx-scope */
// Main app function
import "./css/main.css"
import Document from "./components/Document"
import Sidebar from "./components/Sidebar"
import { EquationSidebar, MobileEquationToolbar } from "./components/EquationSidebar"
import MathTools from "./components/MathTools"
import logo from "./assets/icon.svg"
import { useEffect, useState } from "react"
import useWindowDimensions from "./utils/useWindowDimensions"

function DesktopView(props) {
    return (
        <>
            <Sidebar newDocument={props.newDocument} level={props.level} selectedItem={props.selectedItem} setSelectedItem={props.setSelectedItem} />

            <Document selectedItem={props.selectedItem} setSelectedItem={props.setSelectedItem} />

            <EquationSidebar />
        </>
    )
}

function MobileView({newDocument, level, selectedItem, setSelectedItem}) {
    // 0: file tree
    // 1: editor
    // 2: equations
    const [viewState] = useState(1)

    switch (viewState) {
    case 0:
        return (
            <>
                <Sidebar style={{flex: "1"}} newDocument={newDocument} level={level} selectedItem={selectedItem} setSelectedItem={setSelectedItem} />
            </>
        )
    case 1:
        return (
            <>
                <Document selectedItem={selectedItem} setSelectedItem={setSelectedItem} />
                <MobileEquationToolbar />
            </>
        )
    }
    
}

function App() {
    // Return base page
    // eslint-disable-next-line no-unused-vars
    const [fsInstance, setFsInstance] = useState([])
    const [selectedItem, setSelectedItem] = useState({})

    const { width: windowWidth } = useWindowDimensions()

    async function newDocument() {
        await window.internal.workers.api("Filesystem", "write", {
            instance: window.internal.ui.activeFilesystemInstance,
            write: {
                type: 0,
                name: "unset"
            }
        })
        const newIndex = (await window.internal.workers.api("Filesystem", "index", {
            id: window.internal.ui.activeLocation,
            level: 1, // Only load current location data,
            instance: window.internal.ui.activeFilesystemInstance
        })).index
        setInitialSelectedItem(newIndex)
    }

    function setInitialSelectedItem(level) {
        const item = level.find(item => item.t == 0)
        setSelectedItem(item)
    }

    // eslint-disable-next-line no-unused-vars
    async function loadFsDetails(instance) {
        console.log("[ APP ] Loading fs details")
        
        let promises = instance.index.map(async (item) => {
            const data = (await window.internal.workers.api("Filesystem", "read", {
                id: item.i,
                instance: instance.instance
            })).read

            // concatenate index data with more detailed data
            return {
                ...data,
                ...item
            }
        })

        let level = await Promise.all(promises)
        console.log("[ APP ] Done loading fs details", level)
        
        let copy = {...instance}
        copy.index = level
        setFsInstance(copy)
        
        setInitialSelectedItem(level)
    }
    
    useEffect(async () => {
        // eslint-disable-next-line no-async-promise-executor
        try {
            await window.internal.workers.essential
            let fs_type = localStorage.getItem("fs_type")
            if(fs_type === null) fs_type = 0
            const instance = await window.internal.workers.api("Filesystem", "init", { type: fs_type })
            window.internal.ui.activeFilesystemInstance = instance.id
            console.log("[ APP ] Created database instance:", instance)
            // quick and rough file tree, no names
            console.log("[ APP ] Instance UUID ", instance.instance)
            setFsInstance(instance)

            // more in detail file tree, with names, dates and data
            // loaded later by its own pace
            loadFsDetails(instance)
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
                    <DesktopView newDocument={newDocument} level={fsInstance.index} selectedItem={selectedItem} setSelectedItem={setSelectedItem} />
                    :
                    <MobileView newDocument={newDocument} level={fsInstance.index} selectedItem={selectedItem} setSelectedItem={setSelectedItem} />
                )}
                
            </div>
            <MathTools></MathTools>
        </>
    )
}

export default App
