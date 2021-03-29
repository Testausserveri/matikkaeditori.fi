/* eslint-disable react/react-in-jsx-scope */
// Main app function
import "./css/main.css"
import Document from "./components/Document"
import Sidebar from "./components/Sidebar"
import logo from "./assets/icon.svg"
import { useEffect, useState } from "react"

// Temporarily for fake new document IDs
function uuidv4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == "x" ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}

function App() {
    // Return base page
    const [fsLevel, setfsLevel] = useState([
        {
            type: "folder",
            id: uuidv4(),
            name: "Esimerkkikansio"
        },
        {
            type: "answer",
            id: uuidv4(),
            name: "Nimetön vastaus",
            lastModified: new Date()
        },
        {
            type: "folder",
            id: uuidv4(),
            name: "Toinen kansio"
        }
    ])
    const [selectedItem, setSelectedItem] = useState("")

    function newDocument() {
        setfsLevel([ 
            {
                type: "answer",
                id: uuidv4(),
                name: "Nimetön vastaus",
                lastModified: new Date()
            },
            ...fsLevel
        ])
    }

    useEffect(() => {
        newDocument()
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
