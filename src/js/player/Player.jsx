import React, {Component} from 'react'
import Button from 'react-bootstrap/Button';

import ValueSelector from './ValueSelector.jsx';
import PianoRoll from './PianoRoll.jsx';
import Settings from '../UI/Settings.jsx';

import {supportedInstruments, chords, chordToNotes, EMPTY, BAR_LENGTH, STEPS_PER_QUARTER} from '../../variables/values.js';
import {TWINKLE_TWINKLE} from '../../media/twinkle.js';

import metronome_sound from '../../media/woodblock.wav';

import * as Tone from 'tone';
import WebMidi from '../../../node_modules/webmidi/webmidi.min.js'

const mm = require('@magenta/music/es6/core');
const mm_rnn = require('@magenta/music/es6/music_rnn');

const soundfonts = {
  "Piano": "https://tonejs.github.io/audio/salamander/",
  "Acoustic Guitar": "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_guitar_steel-mp3/",
  "Church Organ": "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/church_organ-mp3/",
  "Honky Tonk Piano": "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/honkytonk_piano-mp3/",
  "Harpsichord": "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/harpsichord-mp3/",
  "Ocarina": "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/ocarina-mp3/"
}

class Player extends Component {
  constructor(props){
    super(props)

    
    this.state = {
      selectedInstrument: supportedInstruments[0],
      selectedChords: ['C'],
      //Array of note sequences in the sequence
      noteSequences: [EMPTY, EMPTY, EMPTY, EMPTY],
      //The entire sessionSeq in noteSeq
      sessionSeq: mm.sequences.quantizeNoteSequence(EMPTY, STEPS_PER_QUARTER),
      //The players current playing notes. Resets every player turn
      curPlayerSeq: {notes:[]},
      activeNotes: [],
      curAISeq: null,
      curChord: null,
      inSession: false,
      isPlaying: false,//Playback of completed session
      isRecording: false,//Recording player input
      isInitialized: false,
      isStarted: false,
      currentNote: null,
      endingNote: null,
      temperature: 1.1,
      tempo: 95,
      barCount: 0
    }
    
    this.rnn = new mm_rnn.MusicRNN(
      'https://storage.googleapis.com/download.magenta.tensorflow.org/tfjs_checkpoints/music_rnn/chord_pitches_improv'
    );


    this.Tone = Tone;
    this.sampler = new this.Tone.Sampler({
      urls: {
        A0: "A0.mp3" , 
        A1: "A1.mp3" , 
        A2: "A2.mp3" , 
        A3: "A3.mp3" , 
        A4: "A4.mp3" , 
        A5: "A5.mp3" , 
      },
      release: 1,
      baseUrl: soundfonts["Piano"],
      onload: () => {console.log("Sampler Loaded")}
    }).toDestination();
    this.sampler.volume.value = 10;

    this.metronomePlayer = new this.Tone.Player(metronome_sound).toDestination();
    this.metronomePlayer.buffer.onload(() => {console.log("Metronome Loaded")});

    this.backingInstrument = new this.Tone.Sampler({
      urls: {
        A0: "A0.mp3" , 
        A1: "A1.mp3" , 
        A2: "A2.mp3" , 
        A3: "A3.mp3" , 
        A4: "A4.mp3" , 
        A5: "A5.mp3" , 
      },
      release: 1,
      baseUrl: soundfonts["Piano"],
      onload: () => {console.log("Sampler Loaded")}
    }).toDestination();
    this.backingInstrument.volume.value = -5;

    this.synth = new this.Tone.PolySynth(this.Tone.Synth).toDestination();
    this.synth.volume.value = -8;

    this.Tone.Transport.bpm.value = this.state.tempo;
    
    this.onSelectInstrument = this.onSelectInstrument.bind(this);
    this.onSetTempo = this.onSetTempo.bind(this);
    this.onSelectMidi = this.onSelectMidi.bind(this);
    this.onSelectChord = this.onSelectChord.bind(this);
    this.addChord = this.addChord.bind(this);
    this.removeChord = this.removeChord.bind(this);
    this.startSession = this.startSession.bind(this);
    this.stopSession = this.stopSession.bind(this);
    this.playRecording = this.playRecording.bind(this);
    this.findLastNote = this.findLastNote.bind(this);
    this.stepsToSeconds = this.stepsToSeconds.bind(this);
    this.playNotes = this.playNotes.bind(this);
    this.playChord = this.playChord.bind(this);
    this.scheduleChords = this.scheduleChords.bind(this);
    this.midiNoteOn = this.midiNoteOn.bind(this);
    this.midiNoteOff = this.midiNoteOff.bind(this);

    this.Tone.start();
    console.log('audio is ready');

    
  }
  
  async midiNoteOn(e) {
    //Play the note on the sampler
    //console.log(e);
    //TODO: Restrict this to not play on AI's turn
    this.sampler.triggerAttack([e.note.name + '' + e.note.octave], this.Tone.now(), e.velocity);
    if (this.state.isRecording && e.note.number < 84) {
      //Construct the note object
      let note = {
          pitch: e.note.number,
          startTime: this.Tone.Transport.seconds
      };
      //Push note onto curPlayerSeq stack
      let curPlayerSeq = this.state.curPlayerSeq;
      curPlayerSeq.notes.push(note);
      await this.setState({curPlayerSeq: curPlayerSeq, currentNote: note});
    }
    
  }
  
  async midiNoteOff(e) {
    //Stop playing the note on the sampler
    this.sampler.triggerRelease([e.note.name + '' + e.note.octave])
    //console.log("Received 'noteoff' message (" + e.note.name + e.note.octave + ').');
    this.setState({endingNote: e.note.number});
    
    if (this.state.isRecording && e.note.number < 84) {
      let curPlayerSeq = this.state.curPlayerSeq;
      //Find the last note in the sequence with the note that was released
      let i = this.findLastNote(curPlayerSeq.notes, e.note.number);
      //Set the end time of the note
      if (i !== -1)
        curPlayerSeq.notes[i].endTime = (this.Tone.Transport.seconds);
      else {
        curPlayerSeq.notes.unshift({
          pitch: e.note.number,
          startTime: 0,
          endTime: this.Tone.Transport.seconds
        })
        i = 0;
      }
      await this.setState({curPlayerSeq: curPlayerSeq, endingNote: 0});
    }
    
  }
  
  componentDidMount() {
    this.rnn.initialize().then(() => {
      this.setState({isInitialized: true});
    })
    //Enable WebMIDI
    WebMidi.enable((err) => {
      if (err) {
          console.log('WebMidi could not be enabled.', err);
      } else {
          //Detect first MIDI device connected. Will be default but selectable in the future
          this.inputDevice = WebMidi.inputs[0];
          if (this.inputDevice && !this.inputDevice.enabled) {
            //On note press
            this.inputDevice.addListener('noteon', "all", this.midiNoteOn)
            //On note release
            this.inputDevice.addListener('noteoff', "all", this.midiNoteOff)
            
            //So we don't re-add listeners if you select an already selected device
            this.inputDevice.enabled = true;
          } else {
            console.log('Midi Device could not be detected');
          }
      }
    });
  }
  
  onSelectInstrument(e) {
    this.setState({selectedInstrument: e.target.text})
    this.sampler.disconnect();
    this.sampler.dispose();
    this.sampler = new this.Tone.Sampler({
      urls: {
        A0: "A0.mp3" , 
        A1: "A1.mp3" , 
        A2: "A2.mp3" , 
        A3: "A3.mp3" , 
        A4: "A4.mp3" , 
        A5: "A5.mp3" , 
      },
      release: 1,
      baseUrl: soundfonts[e.target.text],
      onload: () => {console.log("Sampler Loaded")}
    }).toDestination();
    if (e.target.text === 'Piano') {
      this.sampler.volume.value = 10;
    } else {
      this.sampler.volume.value = 13;
    }
    console.log(this.sampler.volume.value)
  }

  onSetTempo(e) {
    this.setState({tempo: e.target.value})
    this.Tone.Transport.bpm.value = e.target.value;
  }
  
  onSelectMidi(device) {
    console.log(device);
    this.inputDevice = device;
    if (!this.inputDevice.enabled) {
      this.inputDevice.addListener('noteon', "all", this.midiNoteOn)
      this.inputDevice.addListener('noteoff', "all", this.midiNoteOff)
      this.inputDevice.enabled = true;
    }
  }
  
  onSelectChord(chord, index) {
    let select_chords = this.state.selectedChords;
    select_chords[index] = chord;
    this.setState({selectedChords: select_chords});
  }
  
  addChord() {
    this.setState({selectedChords: [...this.state.selectedChords, 'C']});
  }
  
  removeChord() {
    if (this.state.selectedChords.length > 1) {
      let arr = [...this.state.selectedChords]
      arr.splice(arr.length-1, 1);
      this.setState({selectedChords: arr});
    }
  }
  
  stopSession() {
    let notes = chordToNotes[this.state.curChord];
    if (this.state.isRecording) {
      this.Tone.Transport.pause();
    }
    this.setState({inSession: false, isRecording: false});
  }
  
  async startSession() {
    this.Tone.start()
    let sessionSeq;
    let noteSequences;
    //Init sessionSeq and noteSequences to be empty
    await this.setState({sessionSeq: mm.sequences.quantizeNoteSequence(EMPTY, STEPS_PER_QUARTER), noteSequences: [EMPTY, EMPTY, EMPTY, EMPTY], barCount: 0, isStarted: false, isPlaying:false, inSession: true});
    this.pianoRoll.clearRoll();
    this.Tone.Transport.stop();
    this.Tone.Transport.cancel(0);
    //Stop playing chord if it was playing before session started
    if (this.state.curChord) {
      let notes = chordToNotes[this.state.curChord];

    }

    const countOff = new Tone.Part(((time) => {
      this.metronomePlayer.start(time);
    }), [{time:0}, {time: {"2n":1}}, {time:{"2n":2}}, {time:{"2n":2, "4n":1}}, {time:{"2n":2, "4n":2}}])
    .start(0);

    this.Tone.Transport.scheduleOnce( async (time) => {
      this.Tone.Transport.stop();
      this.Tone.Transport.cancel(0);
      this.Tone.Transport.scheduleRepeat(time => {
        this.metronomePlayer.start(time);
      }, "4n");
      await this.setState({isStarted: true});
      //await this.scheduleChords();
      var chords = this.state.selectedChords;
      var chordCount = this.state.selectedChords.length;
      var bar_time = this.stepsToSeconds(BAR_LENGTH);
      await this.Tone.start();
      console.log('Beginning Session');

      while(this.state.inSession) {
        //PLAYER 
        let i = this.state.barCount % chordCount;
        this.playChord(chords[i], bar_time, this.Tone.Transport.seconds);
        var playerSeq = await(this.recordPlayer());
        playerSeq.tempos = [{qpm:this.state.tempo, time:0}];
        playerSeq = mm.sequences.quantizeNoteSequence(playerSeq, STEPS_PER_QUARTER);
        //add player seq to noteSequences
        noteSequences = this.state.noteSequences;
        noteSequences[this.state.barCount] = playerSeq;
        sessionSeq = this.addNoteSeqs(this.state.sessionSeq, playerSeq);
        //console.log(sessionSeq)
        //console.log(playerSeq);
        await this.setState({sessionSeq: sessionSeq, noteSequences: noteSequences, barCount: this.state.barCount+1});

        //AI
        var aiSeq = await this.generateNextSequence(this.state.sessionSeq, this.state.selectedChords[i]);
        //combine the note sequences
        sessionSeq = mm.sequences.concatenate([this.state.sessionSeq, aiSeq]);
        //Shift AI sequence so it in correct Transport position
        aiSeq = this.shiftSequence(this.state.sessionSeq, aiSeq)
        //add AI seq to noteSequences
        noteSequences[this.state.barCount] = aiSeq;
        await this.setState({sessionSeq: sessionSeq, noteSequences: noteSequences, curAISeq: aiSeq, barCount: this.state.barCount+1});
        //Play the AI seq
        i = (this.state.barCount-1)%chordCount;
        //console.log(this.state.barCount);
        //console.log(chords);
        this.playChord(chords[i], bar_time, this.Tone.Transport.seconds);
        await this.playNotes(aiSeq);

        this.Tone.Transport.pause();
        this.Tone.Transport.seconds = this.stepsToSeconds(BAR_LENGTH) * this.state.barCount;
      }
    }, {"2n": 3, "4n": 2});
    await this.Tone.Transport.start(); 
  }

  //return a new sequence of notes based off the previous notes and chord
  generateNextSequence(prevNotes, chord) {
    return new Promise(async (resolve, reject)=> {
      console.log((prevNotes))
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
        let startTime = this.Tone.Transport.seconds;
        //Schedule the stopping of the recording at recordTime
        this.Tone.Transport.scheduleOnce(async (time)=>{
            this.Tone.Transport.pause();

            //Operate on dummy var
            let curPlayerSeq = this.state.curPlayerSeq;
            curPlayerSeq.totalTime = startTime + recordTime;
            this.Tone.Transport.seconds = startTime + recordTime;
            await this.setState({isRecording: false, curPlayerSeq: curPlayerSeq});
            
            resolve(this.state.curPlayerSeq);
        }, startTime + recordTime);
        
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

  playNotes(notes) {
    return new Promise( (resolve, reject) => {
      notes = mm.sequences.unquantizeSequence(notes, this.state.tempo);
      //console.log(notes)
      notes.notes.forEach( (note) => {
        this.Tone.Transport.schedule((time)=> {
          let duration = note.endTime - note.startTime;
          let pitch = this.Tone.Midi(note.pitch).toNote();
          this.sampler.triggerAttackRelease(pitch, duration, time);
        }, note.startTime);
      });
      this.Tone.Transport.scheduleOnce((time) => {
        this.Tone.Transport.pause();
        //Set timeout so player has time to prepare playing
        setTimeout(()=> { resolve(); }, 500);
      }, notes.totalTime);
      this.Tone.Transport.start();
    }) 
  }

  //Chord received in string form
  //Ex: "Cm", "A"
  playChord(chord, duration, time) {
    this.setState({curChord: chord});
    let notes = chordToNotes[chord];
    let quarter = this.Tone.Time('4n').toSeconds();
    let timesPlayed = parseInt(duration / quarter);
    console.log("Notes: " + notes + "; Duration: " + duration + "; Time: " + time);
    if (notes){
      for (let i = 0; i < timesPlayed; i++) {
        this.Tone.Transport.schedule((time) => {
          this.backingInstrument.triggerAttack(notes[0], time, 0.7);
          this.backingInstrument.triggerAttack(notes[1], time, 0.7);
          this.backingInstrument.triggerAttack(notes[2], time, 0.7);
        }, time+(i*quarter))
        console.log(time+(i*quarter))
        this.Tone.Transport.schedule((time) => {
          this.backingInstrument.triggerRelease(notes[0],time);
          this.backingInstrument.triggerRelease(notes[1],time);
          this.backingInstrument.triggerRelease(notes[2],time);
        }, time+((i+1)*quarter));
      }
      
    } else {
      console.log("Chord not found");
    }
  }

  scheduleChords() {
    return new Promise( (resolve, reject) => {
      let chords = this.state.selectedChords;
      let bar_count = this.state.barCount;
      console.log(bar_count)
      let bar_time = this.stepsToSeconds(BAR_LENGTH);

      for (let j = 0; j < bar_count; j++) {
        console.log(j%bar_count)
        //this.Tone.Transport.schedule((time) => {
          this.playChord(chords[j%chords.length], bar_time, bar_time*j+0.1);
        //}, bar_time*j+0.1);
      }
      resolve();
    });
  }
  
  //Adds note_seq2 on top of note_seq1. This assumes that note_seq2's play times are already relative to note_seq1
  //Returns the compounded sequence
  addNoteSeqs(note_seq1, note_seq2) {
    for (var i = 0; i < note_seq2.notes.length; i++) {
      note_seq1.notes.push(note_seq2.notes[i]);
    }
    note_seq1.totalQuantizedSteps = note_seq2.totalQuantizedSteps;
    return note_seq1
  }

  //Shifts note_seq2 such that it will play relatively after note_seq1
  //Returns the shifted note_seq2
  shiftSequence(note_seq1, note_seq2) {
    let baseStep = note_seq1.totalQuantizedSteps;
    let totalSteps = note_seq1.totalQuantizedSteps + note_seq2.totalQuantizedSteps;
    for (var i = 0; i < note_seq2.notes.length; i++) {
      var note = note_seq2.notes[i];
      note.quantizedStartStep += baseStep;
      note.quantizedEndStep += baseStep;
    }
    note_seq2.totalQuantizedSteps = totalSteps;
    return note_seq2;
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
    this.setState({isPlaying: true}, async () => {
      this.Tone.Transport.cancel(0);
      await this.scheduleChords();
      this.playNotes(this.state.sessionSeq)
      .then(() => {
        this.setState({isPlaying: false});
        this.Tone.Transport.stop();
      });
    })
  }
  
  render() {
    return (
      <div>
        <div className='Value-selector'>
          <ValueSelector 
            selectedInstrument={this.state.selectedInstrument}
            onSelectInstrument={this.onSelectInstrument}
            availableMidi={WebMidi.inputs}
            selectedMidi={this.inputDevice}
            onSelectMidi={this.onSelectMidi}
            onSetTempo={this.onSetTempo}
            bpm={this.state.tempo}
            inSession={this.state.inSession}
            isPlaying={this.state.isPlaying}
          />
        </div>
        
        <div className='Record-generate'>
          <div style={{display: this.state.inSession ? "none" : "inline-block"}}>
            <Button onClick={this.startSession}>
              <i className="fas fa-record-vinyl" />Start Recording
            </Button>
          </div>
          
          <div style={{display: this.state.inSession ? "inline-block" : "none"}}>
            <Button onClick={this.stopSession}>
              <i className="fas fa-stop" />Stop Recording
              </Button>
          </div>
          
          <Settings 
            selectedChords={this.state.selectedChords}
            onSelectChord={this.onSelectChord}
            addChord={this.addChord}
            removeChord={this.removeChord}
          />
        </div>
        
        <div className="Visualizer">
          <PianoRoll onRef={ref => (this.pianoRoll = ref)}
            currentNote={this.state.currentNote} 
            barTime={this.stepsToSeconds(BAR_LENGTH)} 
            isRecording={this.state.isRecording} 
            isStarted={this.state.isStarted}
            barCount={this.state.barCount}
            aiSeq={this.state.curAISeq} 
            playNote={this.playNote}
            transport={this.Tone.Transport}
            stepsToSeconds={this.stepsToSeconds}
            selectedChords={this.state.selectedChords}
            endingNote={this.state.endingNote}
            />
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