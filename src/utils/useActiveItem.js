/* eslint-disable no-unreachable */
import { useEffect, useState } from "react"

export default function useActiveItem(activeItem, level, setLevel) {
    const [data, setData] = useState({})

    useEffect(() => {
        if (!level || activeItem.length == 0) return
        let item = level.find(item => item.i === activeItem)
        setData(item)
    }, [activeItem, level])

    function modify(newData) {
        let i = level.findIndex(item => item.i === activeItem)
        let copy = [...level]
        copy[i] = newData
        setLevel(copy)
    }

    return [data, modify]
}
