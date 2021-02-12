// React libs
import React from "react"
import ReactDOM from "react-dom"
import "./css/index.css"
import App from "./App"

// Import static components
import * as C from "./js/console.js"
import * as c from "./js/worker-components/compatibility.js"
import * as Workers from "./js/workers.js"
// eslint-disable-next-line no-unused-vars
import * as uuid from "./js/worker-components/uuid.js" // This is used globally, not here though

// Global handler
function G(){
	// Declare globals
	// eslint-disable-next-line no-unused-vars
	window.internal = {
		workers: {
			list: {},
			components: [
				// List of files loadable by workers in src/js/worker-components
				"compress.js",
				"export.js",
				"google-drive.js",
				"hash.js",
				"onedrive.js",
				"uuid.js"
			],
			handlers: {}
		},
		ui: {},
		console: {
			list: [
				// These values will be put behind a wrapper for log collection
				"log",
				"error",
				"info",
				"trace",
				"warn"
			],
			cache: {},
			logs: []
		},
		time_at_live: new Date().getTime(), // Time since code first started to run
		bundle: null
	}
	// Public libs
	window.public = {
		uuid: uuid,
		Workers: Workers
	}
	// Run the console component here
	C.C()
}

// DOM renderer
function Render(){
	ReactDOM.render(
		<React.StrictMode>
			<App></App>
		</React.StrictMode>,
		document.getElementById("root")
	)
}

// Declare globals
G()

// Check browser compatibility
if(c.c()){
	console.log("Browser compatibility checks passed!")
	// --- This is where the actual application code begins ---
	// Handle workers
	Workers.default()
	Render()
}else {
	console.log("Incompatible browser!")
}