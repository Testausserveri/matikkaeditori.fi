// TODO: Filesystem worker
//onmessage = function(e) {
//	// Message handler
//
//}

// Send loaded log
postMessage(JSON.stringify({type: "log", content: "Filesystem worker loaded!"}))