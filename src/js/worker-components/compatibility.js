// Check compatibility and availability of required browser supplied components
export function c(){
	return (
		window.Worker && // Worker support
		crypto.subtle != undefined // Crypto package available
	)
}