/* eslint-disable no-unreachable */
import { useEffect, useState, useCallback } from "react"
import { debounce } from "lodash"

export default function useActiveItem(activeItem, level, setLevel) {
    const [data, setData] = useState({})

    useEffect(() => {
        if (!level || activeItem.length == 0) return
        let item = level.find(item => item.i === activeItem)
        setData(item)
    }, [activeItem, level])

    const fsSave = useCallback(debounce((newData, targetId) => {
        if (!newData) return
        window.internal.workers.api("Filesystem", "write", {
            instance: window.internal.ui.activeFilesystemInstance,
            id: targetId,
            write: {
                data: newData.data,
                type: 0
            }
        })
    }, 3000), [activeItem])

    const modify = async (newData) => {
        let copy = [...level]
        let i = copy.findIndex(item => item.i === activeItem)
        copy[i] = newData
        setLevel(copy)  // save client-side
        fsSave(newData, window.internal.ui.activeLocation) // save fs (debounced, see above)
    }

    return [data, modify]
}
