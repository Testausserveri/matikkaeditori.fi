/* global MathJax */

import React from "react"
import { useRef, useEffect } from "react"

import "../rich-text-editor/rich-text-editor.css"
import "../css/editor.css"
import { makeRichText } from "../rich-text-editor/rich-text-editor"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faDownload } from "@fortawesome/free-solid-svg-icons"

import Dropdown from "./Dropdown"

const ERROR_SVG_BASE_64 = window.btoa(`<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="17px" height="15px" viewBox="0 0 17 15" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <title>Group 2</title>
  <defs></defs>
  <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
      <g transform="translate(-241.000000, -219.000000)">
          <g transform="translate(209.000000, 207.000000)">
              <rect x="-1.58632797e-14" y="0" width="80" height="40"></rect>
              <g transform="translate(32.000000, 12.000000)">
                  <polygon id="Combined-Shape" fill="#9B0000" fill-rule="nonzero" points="0 15 8.04006 0 16.08012 15"></polygon>
                  <polygon id="Combined-Shape-path" fill="#FFFFFF" points="7 11 9 11 9 13 7 13"></polygon>
                  <polygon id="Combined-Shape-path" fill="#FFFFFF" points="7 5 9 5 9 10 7 10"></polygon>
              </g>
          </g>
      </g>
  </g>
</svg>`)

MathJax.Hub.Config({
    jax: ["input/TeX", "output/SVG"],
    extensions: [
        "toMathML.js",
        "tex2jax.js",
        "MathMenu.js",
        "MathZoom.js",
        "fast-preview.js",
        "AssistiveMML.js",
        "a11y/accessibility-menu.js",
    ],
    TeX: {
        extensions: [
            "AMSmath.js",
            "AMSsymbols.js",
            "noErrors.js",
            "noUndefined.js",
            "mhchem.js",
        ],
    },
    SVG: {
        useFontCache: true,
        useGlobalCache: false,
        EqnChunk: 1000000,
        EqnDelay: 0,
        font: "STIX-Web",
    },
})

const encodeMultibyteUnicodeCharactersWithEntities = (str) =>
    /* eslint-disable-next-line no-control-regex */
    str.replace(/[^\x00-\xFF]/g, (c) => `&#${c.charCodeAt(0).toString(10)};`)

const transformMath = (callback, svgNodes) => {
    if (svgNodes.length) {
        svgNodes.forEach((node) => {
            node.setAttribute("xmlns", "http://www.w3.org/2000/svg")

            node.querySelectorAll("use").forEach((useNode) => {
                if (useNode.outerHTML.indexOf("xmlns:xlink") === -1) {
                    useNode.setAttribute(
                        "xmlns:xlink",
                        "http://www.w3.org/1999/xlink" // Add for safari
                    )
                }
            })

            let svgHtml = node.outerHTML

            svgHtml = svgHtml.replace(" xlink=", " xmlns:xlink=") // Firefox fix
            svgHtml = svgHtml.replace(/ ns\d+:href/gi, " xlink:href") // Safari xlink ns issue fix

            callback(
                `data:image/svg+xml;base64,${window.btoa(
                    encodeMultibyteUnicodeCharactersWithEntities(svgHtml)
                )}`
            )
        })
    } else {
        callback(`data:image/svg+xml;base64,${ERROR_SVG_BASE_64}`)
    }
}

const trim = (latex) => (latex.replace(/(\\|\s)*/g, "") === "" ? "" : latex)

const setServerSideSvg = ($img, latex) => {
    const trimmedLatex = trim(latex)

    $img.prop({
        src: `/math.svg?latex=${encodeURIComponent(trimmedLatex)}`,
        alt: trimmedLatex,
    })

    $img.closest("[data-js=\"answer\"]").trigger("input")
}

const updateClientSideMath = function (latex, callback, resultNode) {
    const math = MathJax.Hub.getAllJax("MathOutput")[0]
    MathJax.Hub.queue.Push(["Text", math, "\\displaystyle{" + latex + "}"])

    MathJax.Hub.Queue(() =>
        transformMath(callback, resultNode.querySelectorAll("svg"))
    )
}

const setClientSideSvg = ($img, latex, resultNode) => {
    updateClientSideMath(
        latex,
        (svg) => {
            $img.prop({
                src: svg,
                alt: latex
            })
            $img.closest("[data-js=\"answer\"]").trigger("input")
        },
        resultNode
    )
}

/*
const onUpdateAnswer = debounce((answer) => {
    const selectedAnswerId = useAnswersStore.getState().selectedAnswerId
    const updateAnswer = useAnswersStore.getState().updateAnswer

    updateAnswer(selectedAnswerId, answer)
}, 800)
*/
const onUpdateAnswer = (answer) => {
    console.log(answer)
}

/* eslint-disable-next-line no-unused-vars */
const initRichTextEditor = (answerNode, resultNode) => {
    const rt = makeRichText(
        answerNode, {
            screenshot: {
                saver: ({
                    data
                }) =>
                    new Promise((resolve) => {
                        const reader = new FileReader()
                        reader.onload = (evt) =>
                            resolve(
                                evt.target.result.replace(/^(data:image)(\/[^;]+)(;.*)/, "$1$3")
                            )
                        reader.readAsDataURL(data)
                    }),
            },
            baseUrl: process.env.REACT_APP_URL,
            updateMathImg($img, latex) {
                if (process.env.REACT_APP_SVG_RENDERING === "server") {
                    setServerSideSvg($img, latex)
                } else {
                    setClientSideSvg($img, latex, resultNode)
                }
            },
        },
        onUpdateAnswer
    )
    console.log("rt", rt)
}

export default function Document() {
    const answerRef = useRef()
    const resultRef = useRef()

    const exportDropdown = [
        {
            text: "Tallenna PDF",
            action: () => {alert("moi")}
        },
        {
            text: "Tallenna kuvana",
            action: () => {alert("moi")}
        },
        {
            text: "Tallenna HTML",
            action: () => {alert("moi")}
        }
    ]
    // Editor result content is available inside resultRef, the answerRef is just an visual editor with extra stuff

    useEffect(() => {
        console.log("refa", resultRef.current)
        
        answerRef.current.innerHTML = ""
        answerRef.current.dispatchEvent(new Event("input"))

        // this bitch looks like to be throwing errors if I have chrome developer tools open
        // weird behaviour that's for sure
        initRichTextEditor(answerRef.current, resultRef.current)
        answerRef.current.focus() // Focus on page load
    }, [resultRef])

    function onDocumentTitleKeyUp(event) {
        if (event.key == "Enter") {
            event.target.blur()
            event.preventDefault()
            if (event.target.innerHTML.trim() == "") {
                event.target.innerHTML = "Nimetön vastaus"
            }
        }
    }

    return (
        <div className="document">
            <div className="head">
                <h2 spellCheck={false} contentEditable={true} id="documentTitle" suppressContentEditableWarning={true} onKeyDown={onDocumentTitleKeyUp}>MAA05 T. 12 S. 8</h2>
                <Dropdown data={exportDropdown}>
                    <button className="secondary">
                        <FontAwesomeIcon icon={faDownload} /> Vie
                    </button>
                </Dropdown>
            </div>
            <div className="page" spellCheck={false}>
                <div ref={answerRef} className="editor"></div>
                <div ref={resultRef} style={{display: "none"}}>{"\\({}\\)"}</div>
            </div>
        </div>
    )
}