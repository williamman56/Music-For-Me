import React, {Component} from 'react'
import Button from 'react-bootstrap/Button';

import ValueSelector from './ValueSelector.jsx';
import Visualizer from './visualizer.jsx';
import PianoRoll from './PianoRoll.jsx';

import {supportedInstruments, chords, EMPTY, BAR_LENGTH, STEPS_PER_QUARTER} from '../../variables/values.js';
import {TWINKLE_TWINKLE} from '../../media/twinkle.js';

import * as Tone from 'tone';
import WebMidi from '../../../node_modules/webmidi/webmidi.min.js'

const mm = require('@magenta/music/es6/core');
const mm_rnn = require('@magenta/music/es6/music_rnn');

const primerSeq = mm.sequences.quantizeNoteSequence(TWINKLE_TWINKLE, 1);

class Player extends Component {
  constructor(props){
    super(props)

    
    this.state = {
      selectedInstrument: supportedInstruments[0],
      selectedChords: [chords[0], chords[1], chords[2], chords[3]],
      //Array of note sequences in the sequence
      noteSequences: [EMPTY, EMPTY, EMPTY, EMPTY],
      //The entire sessionSeq in noteSeq
      sessionSeq: EMPTY,
      //The players current playing notes. Resets every player turn
      curPlayerSeq: {notes:[]},
      curAISeq: null,
      isPlaying: false,
      isRecording: false,
      isInitialized: false,
      currentNote: null,
      temperature: 1.1,
      tempo: 120,
      barCount: 0
    }
    
    this.rnn = new mm_rnn.MusicRNN(
      'https://storage.googleapis.com/download.magenta.tensorflow.org/tfjs_checkpoints/music_rnn/chord_pitches_improv'
    );

    this.player = new mm.SoundFontPlayer('https://storage.googleapis.com/magentadata/js/soundfonts/salamander');

    this.Tone = Tone;
    this.sampler = new this.Tone.Sampler({
      urls: {
        "C4": "C4.mp3",
        "D#4": "Ds4.mp3",
        "F#4": "Fs4.mp3",
        "A4": "A4.mp3",
      },
      release: 1,
      baseUrl: "https://tonejs.github.io/audio/salamander/",
    }).toDestination();
    this.Tone.Transport.bpm.value = this.state.tempo;
    this.player.setTempo(this.state.tempo);
    
    this.onSelectInstrument = this.onSelectInstrument.bind(this);
    this.onSelectChord = this.onSelectChord.bind(this);
    this.prototypeGenerateSequences = this.prototypeGenerateSequences.bind(this);
    this.playRecording = this.playRecording.bind(this);
    this.findLastNote = this.findLastNote.bind(this);
    this.stepsToSeconds = this.stepsToSeconds.bind(this);
    this.scheduleNotes = this.scheduleNotes.bind(this);

    this.Tone.start();
    console.log('audio is ready');

    //Enable WebMIDI
    WebMidi.enable((err) => {
      if (err) {
          console.log('WebMidi could not be enabled.', err);
      } else {
          //Detect first MIDI device connected. Will be default but selectable in the future
          this.inputDevice = WebMidi.inputs[0];
          if (this.inputDevice) {
            //On note press
            this.inputDevice.addListener('noteon', "all", async (e) => {
              //console.log("Received 'noteon' message (" + e.note.name + e.note.octave + ")." +this.Tone.now());
              //console.log(e);
              if (this.state.isRecording) {
                //Construct the note object
                let note = {
                    pitch: e.note.number,
                    startTime: this.Tone.Transport.seconds
                };
                //TODO: integrate note into visualizer
                //Push note onto curPlayerSeq stack
                let curPlayerSeq = this.state.curPlayerSeq;
                curPlayerSeq.notes.push(note);
                await this.setState({curPlayerSeq: curPlayerSeq});
              }
              //Play the note on the sampler
              //TODO: Restrict this to not play on AI's turn
              this.sampler.triggerAttack([e.note.name + '' + e.note.octave]);

            })
            //On note release
            this.inputDevice.addListener('noteoff', "all", async (e) => {
              //console.log("Received 'noteoff' message (" + e.note.name + e.note.octave + ').');
              if (this.state.isRecording) {
                let curPlayerSeq = this.state.curPlayerSeq;
                //Find the last note in the sequence with the note that was released
                let i = this.findLastNote(curPlayerSeq.notes, e.note.number);
                //Set the end time of the note
                curPlayerSeq.notes[i].endTime = (this.Tone.Transport.seconds);
                await this.setState({curPlayerSeq: curPlayerSeq, currentNote: curPlayerSeq.notes[i]});
              }
              //Stop playing the note on the sampler
              this.sampler.triggerRelease([e.note.name + '' + e.note.octave])
            })
          } else {
            console.log('Midi Device could not be detected');
          }
      }
    });
  }
  
  componentDidMount() {
    this.rnn.initialize().then(() => {
      this.setState({isInitialized: true});
    })
  }
  
  onSelectInstrument(e) {
    this.setState({selectedInstrument: e.target.text})
  }
  
  onSelectChord(chord, index) {
    let select_chords = this.state.selectedChords;
    select_chords[index] = chord;
    this.setState({selectedChords: select_chords});
  }
  
  async prototypeGenerateSequences() {
    let sessionSeq;
    let noteSequences;
    await this.Tone.start();
    //Init sessionSeq and noteSequences to be empty
    await this.setState({sessionSeq: EMPTY, noteSequences: [EMPTY, EMPTY, EMPTY, EMPTY], barCount: 0});
    console.log('Beginning Session');

    //BAR 1: PLAYER
    console.log('BAR 1');
    var playerSeq1 = await(this.recordPlayer());
    console.log(playerSeq1);
    playerSeq1 = mm.sequences.quantizeNoteSequence(playerSeq1, STEPS_PER_QUARTER);
    //add player seq 1 to noteSequences
    noteSequences = this.state.noteSequences;
    noteSequences[0] = playerSeq1;
    //Set session seq to playerSeq1
    await this.setState({sessionSeq: playerSeq1, noteSequences: noteSequences, barCount: this.state.barCount+1});
    
    //BAR 2: AI
    console.log('BAR 2');
    //Generate AI sequence 1
    var aiSeq1 = await this.generateNextSequence(this.state.sessionSeq, this.state.selectedChords[1]);
    //combine the note sequences
    sessionSeq = this.combineNoteSeqs(this.state.sessionSeq, aiSeq1);
    //add AI seq to noteSequences
    noteSequences[1] = aiSeq1;
    //Update the state
    await this.setState({sessionSeq: sessionSeq, noteSequences: noteSequences, curAISeq: aiSeq1, barCount: this.state.barCount+1});
    console.log(aiSeq1);
    //Play the AI seq
    this.scheduleNotes(aiSeq1);
    this.Tone.Transport.start();

    /*
    //BAR 3: PLAYER
    console.log('BAR 3');
    var playerSeq2 = await(this.recordPlayer());
    playerSeq2 = mm.sequences.quantizeNoteSequence(playerSeq2, STEPS_PER_QUARTER);
    noteSequences[2] = playerSeq2;
    sessionSeq = this.combineNoteSeqs(this.state.sessionSeq, playerSeq2);
    await this.setState({sessionSeq: sessionSeq, noteSequences: noteSequences, barCount: this.state.barCount+1});

    //BAR 4: AI
    console.log('BAR 4');
    var aiSeq2 = await this.generateNextSequence(this.state.sessionSeq, this.state.selectedChords[3]);
    sessionSeq = this.combineNoteSeqs(this.state.sessionSeq, aiSeq2);
    noteSequences[3] = aiSeq2;
    await this.setState({sessionSeq: sessionSeq, noteSequences: noteSequences, curAISeq: aiSeq2, barCount: this.state.barCount+1});
    //await this.player.start(aiSeq2, this.state.tempo);
    console.log('DONE');

  
*/
  }

  //return a new sequence of notes based off the previous notes and chord
  generateNextSequence(prevNotes, chord) {
    return new Promise(async (resolve, reject)=> {
        let nextSeq = await this.rnn.continueSequence(prevNotes, BAR_LENGTH, this.state.temperature, [chord]);
        resolve(nextSeq);
    })
  }
  
  recordPlayer() {
    return new Promise (async (resolve, reject) => {
      //If not already recording
      if(!this.state.isRecording) {
        await this.setState({curPlayerSeq: {notes:[]}});
        //Calculate record time as bar length in seconds
        let recordTime = this.stepsToSeconds(BAR_LENGTH);

        //Schedule the stopping of the recording at recordTime
        this.Tone.Transport.schedule(async (time)=>{
            this.Tone.Transport.pause();
            this.Tone.Transport.cancel(0);

            //Operate on dummy var
            let curPlayerSeq = this.state.curPlayerSeq;
            curPlayerSeq.totalTime = this.Tone.Transport.seconds;

            await this.setState({isRecording: false, curPlayerSeq: curPlayerSeq});
            
            console.log('Recording Stopped');
            //console.log(curPlayerSeq)
            //Return curPlayerSeq
            resolve(this.state.curPlayerSeq);
        }, recordTime);
        
        //curPlayerSeq.startTime = this.Tone.now();
        await this.setState({isRecording: true});

        this.Tone.Transport.start();
        console.log('Recording Started');
      } else {
        console.log('Already Recording');
        reject(EMPTY);
      }
    });
  }

  scheduleNotes(notes) {
    notes = mm.sequences.unquantizeSequence(notes, this.state.tempo);
    console.log(notes)
    notes.notes.forEach( (note) => {
      this.Tone.Transport.schedule((time)=> {
        let duration = note.endTime - note.startTime;
        let pitch = this.Tone.Midi(note.pitch).toNote();
        this.sampler.triggerAttackRelease(pitch, duration, time);
      }, note.startTime);
    });
    this.Tone.Transport.schedule((time) => {
      this.Tone.Transport.pause();
    }, notes.totalTime);
  }
  
  //Combines note_seq2 on top of note_seq1
  combineNoteSeqs(note_seq1, note_seq2) {
    let baseStep = note_seq1.totalQuantizedSteps;
    let totalSteps = note_seq1.totalQuantizedSteps + note_seq2.totalQuantizedSteps;
    for (var i = 0; i < note_seq2.notes.length; i++) {
        let note = note_seq2.notes[i];
        note.quantizedStartStep += baseStep;
        note.quantizedEndStep += baseStep;
        note_seq1.notes.push(note);
    }
    note_seq1.totalQuantizedSteps = totalSteps;
    return note_seq1
  }

  //Find the last note with the given pitch
  findLastNote(notes, pitch) {
    for (var i = notes.length-1; i >= 0; i--) {
        if (notes[i].pitch === pitch) {
            return i;
        }
    }
    return -1;
  }

  //Given steps, returns how long in seconds the number of steps are
  stepsToSeconds(steps) {
    return steps * (60/(STEPS_PER_QUARTER*this.state.tempo));
  }
  
  //Plays the entire recording of the session
  playRecording() {
    this.Tone.Transport.stop();
    this.setState({isPlaying: true}, () => {
      this.player.start(this.state.sessionSeq, this.state.tempo)
      .then(() => {
        this.setState({isPlaying: false});
      });
    })
    
  }
  
  render() {
    return (
      <div>
        <div className='Value-selector'>
          <ValueSelector 
            selectedInstrument={this.state.selectedInstrument}
            selectedChords={this.state.selectedChords}
            onSelectInstrument={this.onSelectInstrument}
            onSelectChord={this.onSelectChord}
          />
        </div>
        
        <Button className='Record-generate' onClick={this.prototypeGenerateSequences}>
          <i className="fas fa-record-vinyl" />Start Recording
        </Button>
        
        <div className='Visualizers'>
          <Visualizer noteSequence={this.state.noteSequences[0]} player="You" chord={this.state.selectedChords[0]} />
          <Visualizer noteSequence={this.state.noteSequences[1]} player="AI" chord={this.state.selectedChords[1]} />
          
          <br />
          
          <Visualizer noteSequence={this.state.noteSequences[2]} player="You" chord={this.state.selectedChords[2]} />
          <Visualizer noteSequence={this.state.noteSequences[3]} player="AI" chord={this.state.selectedChords[3]} />
        </div>
        <div className='Play-recording'>
          <p>Play your AI music collab!</p>
          <Button onClick={this.playRecording} disabled={this.state.isPlaying}>
            <i className="fas fa-play" />
          </Button>
        </div>
        <PianoRoll 
          currentNote={this.state.currentNote} 
          barTime={this.stepsToSeconds(BAR_LENGTH)} 
          isRecording={this.state.isRecording} 
          barCount={this.state.barCount}
          aiSeq={this.state.curAISeq} 
          playNote={this.playNote}
          transport={this.Tone.Transport}
          stepsToSeconds={this.stepsToSeconds} />
      </div>
    )
  }
}

export default Player