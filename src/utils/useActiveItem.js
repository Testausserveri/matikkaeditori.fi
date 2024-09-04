/* eslint-disable no-unreachable */
import { useEffect, useState, useCallback } from "react"
import { debounce } from "lodash"

export default function useActiveItem(
    activeItem, level, setLevel
) {
    const [data, setData] = useState({})

    useEffect(() => {
        if (!level || activeItem.length === 0) return
        const item = level.find((itemEntry) => itemEntry.i === activeItem)
        setData(item)
    }, [activeItem, level])

    const fsSave = useCallback(debounce((newData, targetId) => {
        if (!newData) return
        console.log("Saving ...")
        window.internal.workers.api(
            "Filesystem", "write", {
                instance: window.internal.ui.activeFilesystemInstance,
                id: targetId,
                write: {
                    data: newData.data,
                    type: 0
                }
            }
        ).then((msg) => {
            if (msg.error) {
                console.error("Failed to save:", msg.error)
                console.debug("Target:", targetId)
                console.debug("Data:", newData.data)
                // eslint-disable-next-line no-alert
                alert("Dokumentti on virheellinen ja sitä ei voitu tallentaa! Ota yhteys kehittäjiin ja lähetä heille loki: Kehittäjä -> Vie loki -osiosta!")
                return
            }

            // Save success
            window.internal.ui.saved = true
            document.getElementById("saveIndicator").className = "savedIndicator"
        }).catch(() => {
            // eslint-disable-next-line no-alert
            alert("Tallentaminen epäonnistui.")
        })
    }, 1000), [activeItem])

    const modify = async (newData) => {
        const copy = [...level]
        const i = copy.findIndex((item) => item.i === activeItem)
        copy[i] = newData
        setLevel(copy) // save client-side
        window.internal.ui.saved = false
        fsSave(newData, window.internal.ui.activeLocation) // save fs (debounced, see above)
    }

    return [data, modify]
}
