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
import testausserveriLogo from "./assets/testausserveri.svg"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faDiscord } from "@fortawesome/free-brands-svg-icons"

function App() {
    // Return base page
    // eslint-disable-next-line no-unused-vars
    const [fsLevel, setFsLevel] = useState([])
    const [activeItem, setActiveItem] = useState("")

    const { width: windowWidth } = useWindowDimensions()

    async function newDocument(event, newLevel) {
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

        let l = newLevel || fsLevel
        let copy = [...l]
        copy.push(fsItem)
        setFsLevel(copy)

        setActiveItem(fsItem.i)
    }

    async function deleteDocument(documentId) {
        await window.internal.workers.api("Filesystem", "remove", {
            instance: window.internal.ui.activeFilesystemInstance,
            id: documentId
        })

        let copy = [...fsLevel]
        let i = copy.findIndex(item => item.i === documentId)
        copy = copy.filter(item => item.i !== documentId)
        setInitialActiveItem(copy)
        setFsLevel(copy)
    }

    useEffect(() => {
        setMobileViewState(1)
    }, [activeItem])

    // select first item - we need this usually only just in the first run
    async function setInitialActiveItem(level) {
        if (level.length === 0) {
            await newDocument(null, level)
            return
        }
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
        setMobileViewState(1)
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

    const isMobile = windowWidth < 800
    // 0: file tree
    // 1: editor
    // 2: equations
    const [mobileViewState, setMobileViewState] = useState(0)

    return (
        <>
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
                </div>
            </div>
            <div className="app">
                { (isMobile && mobileViewState === 0) || !isMobile ?
                    <Sidebar style={(isMobile ? {flex: "1"} : {})} newDocument={newDocument} deleteDocument={deleteDocument} level={fsLevel} setLevel={setFsLevel} activeItem={activeItem} setActiveItem={setActiveItem} />
                    : null }
                
                { (isMobile && mobileViewState === 1) || !isMobile ?
                    <>
                        <Document isMobile={isMobile} setMobileViewState={setMobileViewState} activeItem={activeItem} level={fsLevel} setActiveItem={setActiveItem} setLevel={setFsLevel} />
                        {!isMobile ? 
                            <EquationSidebar />
                            : 
                            <MobileEquationToolbar /> }
                    </>
                    
                    : null }
                
                { (isMobile && mobileViewState === 2) ?
                    <div>Something</div>
                    : null}
            </div>

            <MathTools></MathTools>
        </>
    )
}

export default App
