/* eslint-disable no-unreachable */
import { useEffect, useState, useCallback } from "react"
import { debounce } from "lodash"

export default function useActiveItem(
    // eslint-disable-next-line no-unused-vars
    activeItem: any, level: any, setLevel: (newLevel: any) => void
) {
    const [data, setData] = useState({})

    useEffect(() => {
        if (!level || activeItem.length === 0) return
        const item = level.find((itemEntry: any) => itemEntry.i === activeItem)
        setData(item)
    }, [activeItem, level])

    const fsSave = useCallback(debounce((newData, targetId) => {
        if (!newData) return
        window.internal.workers.api(
            "Filesystem", "write", {
                instance: window.internal.ui.activeFilesystemInstance,
                id: targetId,
                write: {
                    data: newData.data,
                    type: 0
                }
            }
        ).then(() => {
            // Save success
            window.internal.ui.saved = true
            const saveIndicatorElement = document.getElementById("saveIndicator")
            if (saveIndicatorElement) {
                saveIndicatorElement.className = "savedIndicator"
            }
        }).catch(() => {
            // eslint-disable-next-line no-alert
            alert("Tallentaminen epäonnistui.")
        })
    }, 1000), [activeItem])

    const modify = async (newData: any) => {
        const copy = [...level]
        const i = copy.findIndex((item) => item.i === activeItem)
        copy[i] = newData
        setLevel(copy) // save client-side
        window.internal.ui.saved = false
        fsSave(newData, window.internal.ui.activeLocation) // save fs (debounced, see above)
    }

    return [data, modify]
}
