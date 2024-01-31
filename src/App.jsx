/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
/* eslint-disable react/react-in-jsx-scope */
// Main app function
import "./css/main.css"
import { useEffect, useState } from "react"
import Document from "./components/Document.jsx"
import Sidebar from "./components/Sidebar.jsx"
import { EquationSidebar, MobileEquationToolbar } from "./components/EquationSidebar.jsx"
import MathTools from "./components/MathTools.jsx"
import useWindowDimensions from "./utils/useWindowDimensions"
import Navigation from "./components/Navigation.jsx"

function App() {
    // Return base page
    // eslint-disable-next-line no-unused-vars
    const [fsLevel, setFsLevel] = useState([])
    const [fsPath, setFsPath] = useState([{
        id: true,
        name: "Juuri"
    }])
    // id of active item e.g. open in the editor
    const [activeItem, setActiveItem] = useState("")

    // id of lastly created item
    const [createdItem, setCreatedItem] = useState("")

    const { width: windowWidth } = useWindowDimensions()

    const isMobile = windowWidth < 800
    // 0: file tree
    // 1: editor
    // 2: equations
    const [mobileViewState, setMobileViewState] = useState(0)

    async function newFsItem(
        type, newLevel, location
    ) {
        const documentId = (await window.internal.workers.api(
            "Filesystem", "write", {
                instance: window.internal.ui.activeFilesystemInstance,
                write: {
                    type,
                    name: (type === 0 ? "Uusi vastaus" : "Uusi kansio"),
                    data: ""
                },
                location: location || fsPath[fsPath.length - 1].id
            }
        )).write

        const data = (await window.internal.workers.api(
            "Filesystem", "read", {
                id: documentId,
                instance: window.internal.ui.activeFilesystemInstance
            }
        )).read

        const fsItem = {
            ...data,
            type,
            t: type,
            i: documentId
        }

        const l = newLevel || fsLevel
        const copy = [...l]
        copy.push(fsItem)
        setFsLevel(copy)

        setCreatedItem(fsItem.i)
        if (type === 0) setActiveItem(fsItem.i)
    }

    // select first item - we need this usually only just in the first run
    async function setInitialActiveItem(level) {
        if (level.length === 0) {
            await newFsItem(0, level)
            return
        }
        const l = [...level]
        l.reverse()
        const item = l.find((innerItem) => innerItem.t === 0)
        setActiveItem(item.i)
    }

    async function deleteDocument(documentId) {
        await window.internal.workers.api(
            "Filesystem", "remove", {
                instance: window.internal.ui.activeFilesystemInstance,
                id: documentId
            }
        )

        let copy = [...fsLevel]
        const i = copy.findIndex((item) => item.i === documentId)
        copy = copy.filter((item) => item.i !== documentId)
        setInitialActiveItem(copy)
        setFsLevel(copy)
    }

    useEffect(() => {
        setMobileViewState(1)
    }, [activeItem])

    // eslint-disable-next-line no-unused-vars
    async function loadFsDetails(index) {
        console.log("[ APP ] Loading FS details...")

        const promises = index.map(async (item) => {
            const data = (await window.internal.workers.api(
                "Filesystem", "read", {
                    id: item.i,
                    instance: window.internal.ui.activeFilesystemInstance
                }
            )).read

            // concatenate index data with more detailed data
            return {
                ...data,
                ...item
            }
        })

        const level = await Promise.all(promises)
        console.log("[ APP ] Done loading FS details", level)

        setFsLevel(level)

        setInitialActiveItem(level)
        setMobileViewState(1)
    }

    async function openFolder(id, name) {
        const { index } = await window.internal.workers.api(
            "Filesystem", "index", {
                instance: window.internal.ui.activeFilesystemInstance,
                id,
                level: 1
            }
        )

        let copy = [...fsPath]

        const itemIndex = fsPath.findIndex((item) => item.id === id)

        if (itemIndex >= 0) { // found in file tree, we need to go higher
            copy = copy.splice(0, itemIndex + 1)
        } else { // not found in file tree, we go lower
            copy.push({
                id,
                name
            })
        }
        setFsPath(copy)

        if (index.length === 0) {
            newFsItem(
                0, index, id
            )
        } else {
            setFsLevel(index)
            loadFsDetails(index)
        }
    }

    useEffect(async () => {
        // eslint-disable-next-line no-async-promise-executor
        try {
            await window.internal.workers.essential
            let fsType = localStorage.getItem("fs_type")
            if (fsType === null) fsType = 0
            const instance = await window.internal.workers.api(
                "Filesystem", "init", { type: fsType }
            )
            window.internal.ui.activeFilesystemInstance = instance.id
            console.log("[ APP ] Created database instance:", instance)
            // quick and rough file tree, no names
            console.log("[ APP ] Instance UUID ", instance.instance)
            setFsLevel(instance.index)

            // more in detail file tree, with names, dates and data
            // loaded later by its own pace
            loadFsDetails(instance.index)
        } catch (e) {
            console.error("[ APP ] Failed to initialize filesystem")
            console.debug(e)
        }

        // Register global key bindings
        document.addEventListener("keydown", (event) => {
            // Disable if math is open
            if (window.internal.ui.editor.activeElement !== null) return

            if (event.ctrlKey && event.key.toLowerCase() === "n") {
                event.preventDefault()
                document.querySelector("#newAnswerBtn").click()
            } else if (event.ctrlKey && event.key.toLowerCase() === "b") {
                event.preventDefault()
                document.querySelector("#newFolderBtn").click()
            } else if (event.key.toLowerCase() === "f2") {
                event.preventDefault()
                if (!document.activeElement.classList.contains("fsFolder")) {
                    document.querySelector("#documentTitle").focus()
                } else {
                    document.activeElement.querySelector(".editableName").focus()
                }
                document.execCommand(
                    "selectAll", false, null
                )
            } else if (event.key === "Tab") {
                event.preventDefault()
                const sel = document.activeElement?.classList?.contains("fsFolder") || document.activeElement?.classList?.contains("folderUpButton") ? document.activeElement : document.querySelector(".filesystemLevel li.selected")

                const selTarget = sel[event.shiftKey ? "previousSibling" : "nextSibling"] || sel.parentNode[event.shiftKey ? "lastChild" : "firstChild"]

                if (selTarget.classList.contains("fsFolder") || selTarget.classList.contains("folderUpButton")) {
                    selTarget.focus()
                } else {
                    sel.blur()
                    selTarget.click()

                    const x = window.scrollX; const
                        y = window.scrollY
                    window.internal.ui.editor.hook.focus()
                    window.scrollTo(x, y)
                }
            }
        })
    }, [])

    return (
        <>
            <Navigation />
            <div className="app">
                { (isMobile && mobileViewState === 0) || !isMobile ?
                    <Sidebar
                        setCreatedItem={setCreatedItem}
                        createdItem={createdItem}
                        style={(isMobile ? { flex: "1" } : {})}
                        newFsItem={newFsItem}
                        deleteDocument={deleteDocument}
                        level={fsLevel}
                        fsPath={fsPath}
                        setLevel={setFsLevel}
                        activeItem={activeItem}
                        setActiveItem={setActiveItem}
                        openFolder={openFolder} /> :
                    null }

                { (isMobile && mobileViewState === 1) || !isMobile ?
                    <>
                        <Document
                            createdItem={createdItem}
                            isMobile={isMobile}
                            setMobileViewState={setMobileViewState}
                            activeItem={activeItem}
                            level={fsLevel}
                            setActiveItem={setActiveItem}
                            setLevel={setFsLevel}
                            openFolder={openFolder}
                            fsPath={fsPath} />
                        {!isMobile ?
                            <EquationSidebar /> :
                            <MobileEquationToolbar /> }
                    </> :

                    null }

                { (isMobile && mobileViewState === 2) ?
                    <div>Something</div> :
                    null}
            </div>

            <MathTools></MathTools>
        </>
    )
}

export default App
