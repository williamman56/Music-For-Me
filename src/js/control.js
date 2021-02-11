let rnn = new mm.MusicRNN(
    'https://storage.googleapis.com/download.magenta.tensorflow.org/tfjs_checkpoints/music_rnn/chord_pitches_improv'
);

const chords = ['C', 'Am', 'F', 'G'];
const BAR_LENGTH = 16;

TWINKLE_TWINKLE = {
    notes: [
      {pitch: 60, startTime: 0.0, endTime: 0.5},
      {pitch: 60, startTime: 0.5, endTime: 1.0},
      {pitch: 67, startTime: 1.0, endTime: 1.5},
      {pitch: 67, startTime: 1.5, endTime: 2.0},
      {pitch: 69, startTime: 2.0, endTime: 2.5},
      {pitch: 69, startTime: 2.5, endTime: 3.0},
      {pitch: 67, startTime: 3.0, endTime: 4.0},
      {pitch: 65, startTime: 4.0, endTime: 4.5},
      {pitch: 65, startTime: 4.5, endTime: 5.0},
      {pitch: 64, startTime: 5.0, endTime: 5.5},
      {pitch: 64, startTime: 5.5, endTime: 6.0},
      {pitch: 62, startTime: 6.0, endTime: 6.5},
      {pitch: 62, startTime: 6.5, endTime: 7.0},
      {pitch: 60, startTime: 7.0, endTime: 8.0},  
    ],
    totalTime: 8
};
EMPTY = {
    notes: [],
    totalTime: 8
}

let player = new mm.SoundFontPlayer('https://storage.googleapis.com/magentadata/js/soundfonts/salamander');
let Tone = mm.Player.tone;
let temperature = 1.1;
let tempo = 150;
player.setTempo(tempo);
window.onload = function(){

config = {
    noteHeight: 6,
    pixelsPerTimeStep: 30,  // like a note width
    noteSpacing: 1,
    noteRGB: '8, 41, 64',
    activeNoteRGB: '240, 84, 119',
}
let viz1 = new mm.Visualizer(TWINKLE_TWINKLE, document.getElementById('seq1'), config);
let viz2 = new mm.Visualizer(EMPTY, document.getElementById('seq2'), config);
let viz3 = new mm.Visualizer(EMPTY, document.getElementById('seq3'), config);
let viz4 = new mm.Visualizer(EMPTY, document.getElementById('seq4'), config);

let vizualizers = [viz1, viz2, viz3, viz4];

let currentBar = 0;
let currentStep = 0;


function generateNextSequence(prevNotes, chord) {
    return new Promise(async (resolve, reject)=> {
        console.log('Generating next sequence');
        let nextSeq = await rnn.continueSequence(prevNotes, BAR_LENGTH, temperature, [chord]);
        console.log(nextSeq);
        resolve(nextSeq);
    })
}
//note_seq2 added on top of note_seq1
function combineNoteSeqs(note_seq1, note_seq2) {
    console.log('Combining Sequences');
    let baseStep = note_seq1.totalQuantizedSteps;
    let totalSteps = note_seq1.totalQuantizedSteps + note_seq2.totalQuantizedSteps;
    for (var i = 0; i < note_seq2.notes.length; i++) {
        let note = note_seq2.notes[i];
        note.quantizedStartStep += baseStep;
        note.quantizedEndStep += baseStep;
        note_seq1.notes.push(note);
    }
    note_seq1.totalQuantizedSteps = totalSteps;
    console.log('Done Combining')
    return note_seq1
}

async function startPlaySession() {
    let sessionSeq;
    let primerSeq = TWINKLE_TWINKLE;
    primerSeq = mm.sequences.quantizeNoteSequence(primerSeq, 1);
    for (var i = 0; i < chords.length; i++) {
        currentBar = i;
        //First turn (Player's)
        if (i === 0) {
            //play the primer melody
            await player.start(primerSeq, tempo);
            sessionSeq = primerSeq;
        //Machine's turn
        } else if (i % 2 === 1) {
            let newSeq = await generateNextSequence(sessionSeq, chords[i]);
            vizualizers[i] = new mm.Visualizer(newSeq, document.getElementById('seq' + (i+1)), config);
            console.log(document.getElementById('user-seq2'));

            await player.start(newSeq, tempo);
            sessionSeq = combineNoteSeqs(sessionSeq, newSeq);
        //Player's turn (Machine generated for now)
        } else if (i % 2 === 0) {
            let newSeq = await generateNextSequence(sessionSeq, chords[i]); 
            vizualizers[i] = new mm.Visualizer(newSeq, document.getElementById('seq' + (i+1)), config);

            await player.start(newSeq, tempo);
            sessionSeq = combineNoteSeqs(sessionSeq, newSeq);
        }
    }
    //Play final Melody
    player.start(sessionSeq, tempo);
}

const startProgram = async () => {
  try {
    await rnn.initialize();
    document.getElementById('start-button').onclick = () => {
        console.log('pressed')
        startPlaySession();
    }
  } catch (error) {
    console.error(error)
  }
}

startProgram();
};