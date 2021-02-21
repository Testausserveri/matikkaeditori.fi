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
			handlers: {},
			shared: {}
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

// Render
ReactDOM.render(
	<React.StrictMode>
		<App></App>
	</React.StrictMode>,
	document.getElementById("root")
)

// Declare globals
G()

// Check browser compatibility
if(c.c()){
	console.log("Browser compatibility checks passed!")
	// --- This is where the actual application code begins ---
	// Handle workers
	Workers.default();
	(async () => {
		// UI is now visible
		// Load FS
		let load_fs = async () => {
			if(localStorage.getItem("fs_type") == null){
				// No FS present
				console.log("[ Filesystem ] No previous save found.")
				localStorage.setItem("fs_type", "0")
				Workers.api("filesystem", "init", 0)
			}else {
				// Load FS that's present
				console.log("[ Filesystem ] Previous save found.")
				Workers.api("filesystem", "init", parseInt(localStorage.getItem("fs_type")))
			}
		}
		// Trigger load_fs when the Filesystem worker is ready
		let e = setInterval(async () => {
			if(window.fs_ready == true){
				clearInterval(e)
				load_fs()
			}
		}, 50)
	})()
}else {
	console.log("Incompatible browser!")
	ReactDOM.render(
		<React.StrictMode>
			<p>Incompatible browser!</p>
		</React.StrictMode>,
		document.getElementById("root")
	)
}