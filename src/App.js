/* eslint-disable react/react-in-jsx-scope */
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

// Main app function
function App() {
	// Declare globals
	G()

	// Check browser compatibility
	if(c.c()){
		console.log("Browser compatibility checks passed!")
		// Handle workers
		Workers.default()
		return (
			<div>
				Matikkaeditori.fi, testi 1
			</div>
		)
	}else {
		console.log("Incompatible browser!")
		// TODO: Make a cleaner unsupported message.
		return (
			<p>
				Your browser is incompatible (Supported: Chrome, Firefox, Edge... basically any modern browser, except any version of non-chromium IE).
				<br></br>
				Some required components are missing.
			</p>
		)
	}
	
	// Return base page
	//return (
	//	<div>
	//		Matikkaeditori.fi, testi 10/02
	//	</div>
	//)
}

export default App
