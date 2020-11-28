import React, {Component} from 'react'
import Button from 'react-bootstrap/Button';

import ValueSelector from './ValueSelector.jsx';
import Visualizer from './visualizer.jsx';

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
      
      noteSequences: [primerSeq, EMPTY, EMPTY, EMPTY],
      sessionSeq: {},
      curPlayerSeq: {notes:[]},
      isPlaying: false,
      isRecording: false,
      isInitialized: false,
      
      temperature: 1.1,
      tempo: 150,
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
    this.player.setTempo(this.state.tempo);
    
    this.onSelectInstrument = this.onSelectInstrument.bind(this);
    this.onSelectChord = this.onSelectChord.bind(this);
    this.prototypeGenerateSequences = this.prototypeGenerateSequences.bind(this);
    this.playRecording = this.playRecording.bind(this);
    this.findLastNote = this.findLastNote.bind(this);
    this.stepsToSeconds = this.stepsToSeconds.bind(this);

    this.Tone.start();
    console.log('audio is ready');
    WebMidi.enable((err) => {
      if (err) {
          console.log('WebMidi could not be enabled.', err);
      } else {
          this.inputDevice = WebMidi.inputs[0];
          if (this.inputDevice) {
            this.inputDevice.addListener('noteon', "all", async (e) => {
              console.log("Received 'noteon' message (" + e.note.name + e.note.octave + ")." +this.Tone.now());
              if (this.state.isRecording) {
                let note = {
                    pitch: e.note.number,
                    startTime: (this.Tone.now()-this.state.curPlayerSeq.startTime)
                };
                let curPlayerSeq = this.state.curPlayerSeq;
                curPlayerSeq.notes.push(note);
                await this.setState({curPlayerSeq: curPlayerSeq});
              }

              this.sampler.triggerAttack([e.note.name + '' + e.note.octave])

            })

            this.inputDevice.addListener('noteoff', "all", async (e) => {
              console.log("Received 'noteoff' message (" + e.note.name + e.note.octave + ').');
              if (this.state.isRecording) {
                let curPlayerSeq = this.state.curPlayerSeq;
                let i = this.findLastNote(curPlayerSeq.notes, e.note.number);
                curPlayerSeq.notes[i].endTime = (this.Tone.now()-this.state.curPlayerSeq.startTime);
                await this.setState({curPlayerSeq: curPlayerSeq});
              }

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
    let newNotes;

    console.log('Beginning Session');
    //var playerSeq1 = await(this.recordPlayer())
    
    /*this.setState({isRecording: true, sessionSeq: primerSeq}, () => {
      this.generateNextSequence(this.state.noteSequences[0], this.state.selectedChords[1])
      .then((newSeq) => {
        sessionSeq = this.combineNoteSeqs(this.state.sessionSeq, newSeq);
        newNotes = this.state.noteSequences;
        newNotes[1] = newSeq;
        this.setState({noteSequences: newNotes, sessionSeq: sessionSeq}, () => {
          this.generateNextSequence(this.state.sessionSeq, this.state.selectedChords[2])
          .then((newSeq) => {
            sessionSeq = this.combineNoteSeqs(this.state.sessionSeq, newSeq);
            newNotes = this.state.noteSequences;
            newNotes[2] = newSeq;
            this.setState({noteSequences: newNotes, sessionSeq: sessionSeq}, () => {
              this.generateNextSequence(this.state.sessionSeq, this.state.selectedChords[3])
              .then((newSeq) => {
                sessionSeq = this.combineNoteSeqs(this.state.sessionSeq, newSeq);
                newNotes = this.state.noteSequences;
                newNotes[3] = newSeq;
                this.setState({noteSequences: newNotes, sessionSeq: sessionSeq});
              })
            })
          })
        })
      });
    }); */
  }
  
  generateNextSequence(prevNotes, chord) {
    return new Promise(async (resolve, reject)=> {
        let nextSeq = await this.rnn.continueSequence(prevNotes, BAR_LENGTH, this.state.temperature, [chord]);
        resolve(nextSeq);
    })
  }
  
  recordPlayer() {
    return new Promise (async (resolve, reject) => {
      if(!this.state.isRecording) {
        await this.setState({curPlayerSeq: {notes:[]}});

        let recordTime = this.stepsToSeconds(BAR_LENGTH);

        this.Tone.Transport.schedule(async function(time){
            this.Tone.Transport.stop();
            let endTime = time;
            //Operate on dummy var
            let curPlayerSeq = this.state.curPlayerSeq;
            curPlayerSeq.totalTime = endTime - this.state.curPlayerSeq.startTime;

            await this.setState({isRecording: false, curPlayerSeq: curPlayerSeq});
            
            console.log('Recording Stopped');
            resolve(this.state.curPlayerSeq);
        }, recordTime);
        
        this.Tone.Transport.scheduleRepeat((time)=>{
            //use the time argument to schedule a callback with Tone.Draw
            this.Tone.Draw.schedule(() => {
                console.log((recordTime - this.Tone.Transport.seconds).toFixed(2));
            }, time)
        }, 0.1, 0, recordTime);
        //Operate on dummy var
        let curPlayerSeq = this.state.curPlayerSeq;
        curPlayerSeq.startTime = this.Tone.now();
        await this.setState({isRecording: true, curPlayerSeq: curPlayerSeq});

        this.Tone.Transport.start();
        console.log('Recording Started');
      }
    });
  }
  
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
  
  playRecording() {
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
      </div>
    )
  }
}

export default Player