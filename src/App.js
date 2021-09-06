/* eslint-disable no-unused-vars */
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

function DesktopView({newDocument, level, setLevel, setActiveItem, activeItem}) {
    return (
        <>
            <Sidebar newDocument={newDocument} level={level} setLevel={setLevel} activeItem={activeItem} setActiveItem={setActiveItem} />
            {level && activeItem.length > 0 ? 
                <Document activeItem={activeItem} level={level} setActiveItem={setActiveItem} setLevel={setLevel} />
                : null}
            

            <EquationSidebar />
        </>
    )
}

function MobileView({newDocument, level, activeItem, setActiveItem, setLevel}) {
    // 0: file tree
    // 1: editor
    // 2: equations
    const [viewState] = useState(1)

    switch (viewState) {
    case 0:
        return (
            <>
                <Sidebar style={{flex: "1"}} newDocument={newDocument} setLevel={setLevel} level={level} activeItem={activeItem} setActiveItem={setActiveItem} />
            </>
        )
    case 1:
        return (
            <>
                <Document activeItem={activeItem} setActiveItem={setActiveItem} />
                <MobileEquationToolbar />
            </>
        )
    }
    
}

function App() {
    // Return base page
    // eslint-disable-next-line no-unused-vars
    const [fsLevel, setFsLevel] = useState([])
    const [activeItem, setActiveItem] = useState("")

    const { width: windowWidth } = useWindowDimensions()

    async function newDocument() {
        const documentId = (await window.internal.workers.api("Filesystem", "write", {
            instance: window.internal.ui.activeFilesystemInstance,
            write: {
                type: 0,
                name: "New answer",
                data: ""
            }
        })).write

        const data = (await window.internal.workers.api("Filesystem", "read", {
            id: documentId,
            instance: window.internal.ui.activeFilesystemInstance
        })).read

        const fsItem = {
            ...data,
            type: 0,
            t: 0,
            i: documentId
        }

        let copy = [...fsLevel]
        copy.push(fsItem)
        setFsLevel(copy)

        setActiveItem(fsItem.i)
    }

    // select first item - we need this usually only just in the first run
    function setInitialActiveItem(level) {
        const l = [...level]
        l.reverse()
        const item = l.find(item => item.t == 0)
        setActiveItem(item.i)
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
        
        setFsLevel(level)
        
        setInitialActiveItem(level)
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
            setFsLevel(instance.index)

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
                    <DesktopView newDocument={newDocument} level={fsLevel} activeItem={activeItem} setActiveItem={setActiveItem} setLevel={setFsLevel} />
                    :
                    <MobileView newDocument={newDocument} level={fsLevel} activeItem={activeItem} setActiveItem={setActiveItem} setLevel={setFsLevel} />
                )}
                
            </div>
            <MathTools></MathTools>
        </>
    )
}

export default App
