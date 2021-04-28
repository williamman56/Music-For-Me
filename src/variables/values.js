export const supportedInstruments = [
    'Piano',
    'Acoustic Guitar',
    'Church Organ', 
    'Honky Tonk Piano',
    'Harpsichord'
]

export const chords = [
    "A",
    "Am",
    "Bb",
    "Bbm",
    "B",
    "Bm",
    "C",
    "Cm",
    "Db",
    "Dbm",
    "D",
    "Dm",
    "Eb",
    "Ebm",
    "E",
    "Em",
    "F",
    "Fm",
    "Gb",
    "Gbm",
    "G",
    "Gm",
    "Ab",
    "Abm"
]
export const BAR_LENGTH = 64;
export const STEPS_PER_QUARTER = 4;

export const config = {
    noteHeight: 6,
    pixelsPerTimeStep: 30,  // like a note width
    noteSpacing: 1,
    noteRGB: '8, 41, 64',
    activeNoteRGB: '240, 84, 119',
}

export const EMPTY = {
    notes: [],
    totalTime: 8
}

export const chordToNotes = {
    "A":    ["A2", "C#3", "E3"],
    "Am":   ["A2", "C3", "E3"],
    "Bb":   ["Bb2", "D3", "F3"],
    "Bbm":  ["Bb2", "Db2", "F3"],
    "B":    ["B2", "D#3", "F#3"],
    "Bm":   ["B2", "D3", "F#3"],
    "C":    ["C3", "E3", "G3"],
    "Cm":   ["C3", "Eb3", "G3"],
    "Db":   ["Db3", "F3", "Ab3"],
    "Dbm":  ["Db3", "E3", "Ab3"],
    "D":    ["D3", "F#3", "A3"],
    "Dm":   ["D3", "F3", "A3"],
    "Eb":   ["Eb3", "G3", "Bb3"],
    "Ebm":  ["Eb3", "Gb3", "Bb3"],
    "E":    ["E3", "G#3", "B3"],
    "Em":   ["E3", "G3", "B3"],
    "F":    ["F2", "A2", "C3"],
    "Fm":   ["F2", "Ab2", "C3"],
    "Gb":   ["Gb2", "Bb2", "Db3"],
    "Gbm":  ["Gb2", "A2", "Db3"],
    "G":    ["G2", "B2", "D3"],
    "Gm":   ["G2", "Bb2", "D3"],
    "Ab":   ["Ab2", "C3", "Eb3"],
    "Abm":  ["Ab2", "B3", "Eb3"]
}