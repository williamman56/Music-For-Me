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

//const primerSeq = mm.sequences.quantizeNoteSequence(TWINKLE_TWINKLE, 1);

class Player extends Component {
  constructor(props){
    super(props)

    
    this.state = {
      selectedInstrument: supportedInstruments[0],
      selectedChords: ['C', 'Am', 'F', 'G'],
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
      isStarted: false,
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
      onload: () => {console.log("Sampler Loaded")}
    }).toDestination();
    this.metronomePlayer = new this.Tone.Player(metronome_sound).toDestination();
    this.metronomePlayer.buffer.onload(() => {console.log("Metronome Loaded")});
    this.synth = new this.Tone.PolySynth(this.Tone.Synth).toDestination();
    this.Tone.Transport.bpm.value = this.state.tempo;
    this.player.setTempo(this.state.tempo);
    
    this.onSelectInstrument = this.onSelectInstrument.bind(this);
    this.onSelectMidi = this.onSelectMidi.bind(this);
    this.onSelectChord = this.onSelectChord.bind(this);
    this.startSession = this.startSession.bind(this);
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

    //Enable WebMIDI
    WebMidi.enable((err) => {
      if (err) {
          console.log('WebMidi could not be enabled.', err);
      } else {
          //Detect first MIDI device connected. Will be default but selectable in the future
          this.inputDevice = WebMidi.inputs[0];
          if (this.inputDevice) {
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
  
  async midiNoteOn(e) {
    //Play the note on the sampler
    //TODO: Restrict this to not play on AI's turn
    this.sampler.triggerAttack([e.note.name + '' + e.note.octave]);
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
    
  }
  
  async midiNoteOff(e) {
    //Stop playing the note on the sampler
    this.sampler.triggerRelease([e.note.name + '' + e.note.octave])
    //console.log("Received 'noteoff' message (" + e.note.name + e.note.octave + ').');
    if (this.state.isRecording) {
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
      await this.setState({curPlayerSeq: curPlayerSeq, currentNote: curPlayerSeq.notes[i]});
    }
    
  }
  
  componentDidMount() {
    this.rnn.initialize().then(() => {
      this.setState({isInitialized: true});
    })
  }
  
  onSelectInstrument(e) {
    this.setState({selectedInstrument: e.target.text})
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
  
  async startSession() {
    this.Tone.start()
    let sessionSeq;
    let noteSequences;
    //Init sessionSeq and noteSequences to be empty
    await this.setState({sessionSeq: EMPTY, noteSequences: [EMPTY, EMPTY, EMPTY, EMPTY], barCount: 0});
    this.pianoRoll.clearRoll();
    this.Tone.Transport.stop();
    this.Tone.Transport.cancel(0);

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
      await this.scheduleChords();
      await this.Tone.start();
      console.log('Beginning Session');

      //BAR 1: PLAYER
      console.log('BAR 1');
      var playerSeq1 = await(this.recordPlayer());
      playerSeq1 = mm.sequences.quantizeNoteSequence(playerSeq1, STEPS_PER_QUARTER);
      console.log(playerSeq1);

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
      //console.log(aiSeq1);
      //Play the AI seq
      await this.playNotes(aiSeq1);
      

      //BAR 3: PLAYER
      console.log('BAR 3');
      var playerSeq2 = await(this.recordPlayer());
      playerSeq2.tempos = [{qpm:120, time:0}];
      playerSeq2 = mm.sequences.quantizeNoteSequence(playerSeq2, STEPS_PER_QUARTER);
      //OKAY some absolute witchcraft here but quantizeNoteSequence was computing the steps 2*BAR_LENGTH away from what they were supposed to be
      //This may make sense since 2*BARLENGTH has passed here but the seconds should be absolute
      for (var i = 0; i < playerSeq2.notes.length; i++) {
        playerSeq2.notes[i].quantizedStartStep -= (2*BAR_LENGTH);
        playerSeq2.notes[i].quantizedEndStep -= (2*BAR_LENGTH);
      }
      console.log(playerSeq2)
      noteSequences[2] = playerSeq2;
      sessionSeq = this.combineNoteSeqs(this.state.sessionSeq, playerSeq2);
      console.log(sessionSeq)
      await this.setState({sessionSeq: sessionSeq, noteSequences: noteSequences, barCount: this.state.barCount+1});

      //BAR 4: AI
      console.log('BAR 4');
      var aiSeq2 = await this.generateNextSequence(this.state.sessionSeq, this.state.selectedChords[3]);
      //Same issue here as above
      for (i = 0; i < aiSeq2.notes.length; i++) {
        aiSeq2.notes[i].quantizedStartStep -= (2*BAR_LENGTH);
        aiSeq2.notes[i].quantizedEndStep -= (2*BAR_LENGTH);
      }
      sessionSeq = this.combineNoteSeqs(this.state.sessionSeq, aiSeq2);
      noteSequences[3] = aiSeq2;
      await this.setState({sessionSeq: sessionSeq, noteSequences: noteSequences, curAISeq: aiSeq2, barCount: this.state.barCount+1});
      await this.playNotes(aiSeq2);
      console.log('DONE');
      this.Tone.Transport.pause()
    }, {"2n": 3, "4n": 2});
    await this.Tone.Transport.start(); 
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
        this.Tone.Transport.scheduleOnce(async (time)=>{
            this.Tone.Transport.pause();

            //Operate on dummy var
            let curPlayerSeq = this.state.curPlayerSeq;
            curPlayerSeq.totalTime = this.Tone.Transport.seconds;

            await this.setState({isRecording: false, curPlayerSeq: curPlayerSeq});
            
            console.log('Recording Stopped');
            //console.log(curPlayerSeq)
            //Return curPlayerSeq
            resolve(this.state.curPlayerSeq);
        }, this.Tone.Transport.seconds + recordTime);
        
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
      console.log(notes)
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
    let notes = chordToNotes[chord];
    if (notes){
      this.synth.triggerAttackRelease(notes[0], duration, time);
      this.synth.triggerAttackRelease(notes[1], duration, time);
      this.synth.triggerAttackRelease(notes[2], duration, time);
    } else {
      console.log("Chord not found");
    }
  }

  scheduleChords() {
    return new Promise( (resolve, reject) => {
      let chords = this.state.selectedChords;
      let bar_time = this.stepsToSeconds(BAR_LENGTH);      
      for (let i = 0; i < chords.length; ++i) {
        this.Tone.Transport.schedule((time) => {
          this.playChord(chords[i], bar_time, time);
        }, bar_time*i+0.1);
      }
      resolve();
    });
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
          />
        </div>
        
        <div className='Record-generate'>
          <Button onClick={this.startSession}>
            <i className="fas fa-record-vinyl" />Start Recording
          </Button>
          
          <Settings 
            selectedChords={this.state.selectedChords}
            onSelectChord={this.onSelectChord}
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
            stepsToSeconds={this.stepsToSeconds} />
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