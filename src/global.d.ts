/* eslint-disable no-unused-vars */
declare global {
  interface Window {
    reset: () => void,
    api: (worker: any, type: any, message: any) => void,
    internal: {
      workers: {
        api: (worker: any, type: any, message: any) => Promise<any>
      },
      ui: {
        saved: boolean,
        activeFilesystemInstance: any,
        activeLocation: any
      }
    },
    browser: string
  }
}

export { }
