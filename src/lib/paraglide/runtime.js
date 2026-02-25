// @ts-nocheck
/* eslint-disable */
/** @type {((tag: AvailableLanguageTag) => void) | undefined} */
let _onSetLanguageTag

/**
 * The project's source language tag.
 */
export const sourceLanguageTag = "de"

/**
 * The project's available language tags.
 */
export const availableLanguageTags = /** @type {const} */ (["de","en","es","fr","it"])

/**
 * Get the current language tag.
 * @type {() => AvailableLanguageTag}
 */
export let languageTag = () => sourceLanguageTag

/**
 * Set the language tag.
 * @param {AvailableLanguageTag | (() => AvailableLanguageTag)} tag
 */
export const setLanguageTag = (tag) => {
    if (typeof tag === "function") {
        languageTag = enforceLanguageTag(tag)
    } else {
        languageTag = enforceLanguageTag(() => tag)
    }
    if (_onSetLanguageTag !== undefined) {
        _onSetLanguageTag(languageTag())
    }
}

function enforceLanguageTag(unsafeLanguageTag) {
    return () => {
        const tag = unsafeLanguageTag()
        if(!isAvailableLanguageTag(tag)) {
            throw new Error(`languageTag() didn't return a valid language tag. Check your setLanguageTag call`)
        }
        return tag
    }
}

/**
 * @param {(languageTag: AvailableLanguageTag) => void} fn
 */
export const onSetLanguageTag = (fn) => {
    _onSetLanguageTag = fn
}

/**
 * @param {any} thing
 * @returns {thing is AvailableLanguageTag}
 */
export function isAvailableLanguageTag(thing) {
    return availableLanguageTags.includes(thing)
}

/**
 * @typedef {typeof availableLanguageTags[number]} AvailableLanguageTag
 */
