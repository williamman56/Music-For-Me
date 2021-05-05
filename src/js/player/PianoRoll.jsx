import React, {Component} from 'react'

import PianoBar from './PianoBar.jsx';
import {BAR_LENGTH} from '../../variables/values.js';

class PianoRoll extends Component {
  constructor(props){
    super(props)
    
    this.state = {
      bars: [],
      activeNotes: [],
      viewWidth: window.innerWidth//Total width including hidden parts (will expand as notes are added)
    }
    
    this.height = window.innerHeight * .55;
    //TODO: Update widht&height when user resizes window
    this.width = window.innerWidth;//Width for what is visible (only based on window size)
    this.barWidth = window.innerWidth * .25;

    this.barModifier = (window.innerWidth * .25)/this.props.barTime;//Controls length of bars on the piano roll
    
    this.updateActiveNotes = this.updateActiveNotes.bind(this);
    
    this.divRef = React.createRef();
    this.svgRef = React.createRef();
  }

  componentDidMount() {
    this.props.onRef(this)
    let that = this
    this.props.transport.on("start", function(){ 
      if (that.props.isStarted) {
        that.growth = setInterval(function() {
          that.updateActiveNotes();
        }, 50)
      }
    })
    
    this.props.transport.on("stop", function(){ clearInterval(that.growth) })
    this.props.transport.on("pause", function(){ clearInterval(that.growth) })
  }
  
  componentWillUnmount() {
    this.props.onRef(undefined)
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.currentNote !== prevProps.currentNote) {
      this.startNote(this.props.currentNote);
      //this.drawNote(this.props.currentNote)
    }
    if (this.props.aiSeq !== prevProps.aiSeq) {
      this.drawNoteSequence(this.props.aiSeq)
    }
    if (this.props.endingNote && this.props.endingNote !== prevProps.endingNote) {
      this.endNote(this.props.endingNote);
    }
  }
  
  startNote(note) {//Only used for human notes
    let pitch = this.scalePitch(note.pitch), m = this.barModifier;
    let w = (this.props.transport.seconds - note.startTime)*m;
    let multiplier = this.props.barCount*m*this.props.barTime;
    let x = this.width * (note.startTime / (this.props.barTime*4));
    let bar = {startTime: note.startTime,
                x:x,
                y:pitch,
                height:10,
                width:w,
                pitch:note.pitch,
                num:this.state.bars.length+this.state.activeNotes.length,
                style:{fill:'#03DAC5'}}
    this.setState({activeNotes: [...this.state.activeNotes, bar]})
  }
  
  updateActiveNotes() {
    //console.log(this.state.activeNotes);
    this.setState({activeNotes: this.state.activeNotes.map((note)=>{
      note.width = (this.props.transport.seconds - note.startTime)*this.barModifier;
      return note;
    })});
  }
  
  endNote(pitch) {
    for (let note of this.state.activeNotes) {
      if (note.pitch === pitch) {
        let bar = React.createElement('rect', {
                                        x:note.x, 
                                        y:note.y, 
                                        height:note.height, 
                                        width:note.width, 
                                        key:note.num,
                                        style:note.style
                                      }, null)
        this.setState({bars:[...this.state.bars, bar], activeNotes: this.state.activeNotes.filter((note)=>{return note.pitch !== pitch})});
      }
    }
  }
  
  drawNote(note, aiNote=false) {//Currently only used by AI notes, could use a touch up cause it's still coded to handle human input
    this.updateActiveNotes();
    let pitch = this.scalePitch(note.pitch), m = this.barModifier;
    let w = (note.endTime - note.startTime)*m;
    //RecordPlayer starts time from 0, so we need a multiplier
    //AI sequences keep track of their overall start time so we don't to modify them
    let multiplier = aiNote ? 0 : this.props.barCount*m*this.props.barTime;
    let x;
    let color;
    if (aiNote) {
      x = this.width * (note.startTime / (this.props.barTime*4));
      color = '#BB86FC';
    } else {
      x = this.width * (this.props.transport.seconds / (this.props.barTime*4)) - w;
      color = '#03DAC5';
    }
    
    if (x+50 > this.state.viewWidth) {
      this.setState({viewWidth: this.state.viewWidth + this.width/2}, () => {
        this.divRef.current.scrollLeft += this.width;
      });      
    }
    
    let bar = React.createElement('rect', {
                                            x:x, 
                                            y:pitch, 
                                            height:10, 
                                            width:w, 
                                            key:this.state.bars.length,
                                            style:{fill:color}
                                          }, null)
    this.setState({bars: [...this.state.bars, bar]})
  }
  
  drawNoteSequence(noteSequence) {
    let counter = 0, that = this
    //We need an interval because the svg can only draw so fast (tho 250 is way more than enough time)
    let drawer = setInterval(function() {
      let note = noteSequence.notes[counter]
      let n = {pitch: note.pitch, 
         startTime: that.props.stepsToSeconds(note.quantizedStartStep),
         endTime: that.props.stepsToSeconds(note.quantizedEndStep)
        }
      that.drawNote(n, true)
      
      counter++;
      if (counter >= noteSequence.notes.length) {
        clearInterval(drawer)
      }
    }, 5)
  }

  clearRoll() {
    this.setState({bars: []});
  }
  
  scalePitch(pitch) {
    //Scale from 53 to 83 (based off lowest & highest notes on my midi keyboard)
    const height = this.svgRef.current.getAttribute('height')
    
    //This will need to become dynamic in the future
    const low = 53
    const high = 83
    if (pitch < low) pitch = low
    if (pitch > high) pitch = high
    
    let scaled = (pitch - low) / (high - low) * (height - 10) + 10
    
    return height - scaled
  }
  
  render() {
    const separationBars = [], chordText = []
    for (let i = 0; i < this.state.viewWidth/this.barWidth; ++i) {
      separationBars.push(<rect height={this.height} width="3" x={i*this.barWidth} key={i*3} style={{fill:'white', zIndex: 999}}/>);
      /*separationBars.push(<rect 
                            height={this.height} 
                            width="3" 
                            x={this.width * (this.props.stepsToSeconds(BAR_LENGTH) * i / (this.props.barTime*4))} 
                            key={i} 
                          />);*/
      chordText.push(
      (<text x={i*this.barWidth+10} y="22" className="chord-text" style={{fill: (i%2)===0 ? "#03DAC5" : "#BB86FC"}} key={i*3+1}>
        {this.props.selectedChords[i%this.props.selectedChords.length]}
      </text>));
      chordText.push(
      (<text x={(i+1)*this.barWidth-((i%2)===0 ? 55: 21)} y="22" className="chord-text" style={{fill: (i%2)===0 ? "#03DAC5" : "#BB86FC"}} key={i*3+2 }>
        {(((i%2)===0 ? "Player" : "AI"))}
      </text>));
    }
    
    return (
      <div ref={this.divRef} style={{width: this.width, display: "inline-block", overflowX:this.state.viewWidth > this.width ? "scroll" : "hidden"}}>
        <svg ref={this.svgRef} height={this.height} width={this.state.viewWidth} >
          <rect height={this.height} width={this.state.viewWidth} style={{fill:"#1E1E1E", strokeWidth:5, stroke:"#151515"}} />
          
          {separationBars}
          {chordText}
          
          {this.state.bars.map(function(b,i){
            return b
          })}
          {this.state.activeNotes.map(function(note,i){
            return (<rect 
                      x={note.x}
                      y={note.y}
                      height={note.height}
                      width={note.width}
                      key={note.num}
                      style={note.style}
            />)
          })}
          
          
          <PianoBar 
            height={this.height} 
            width={this.width} 
            isStarted={this.props.isStarted}
            transport={this.props.transport} 
            stepsToSeconds={this.props.stepsToSeconds}
            barTime={this.props.barTime} 
            barModifier={this.barModifier} />
        </svg>
      </div>
    )
  }
}  

export default PianoRoll