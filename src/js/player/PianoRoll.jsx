import React, {Component} from 'react'

import PianoBar from './PianoBar.jsx';
import {BAR_LENGTH} from '../../variables/values.js';

class PianoRoll extends Component {
  constructor(props){
    super(props)
    
    this.state = {
      bars: [],
      viewWidth: window.innerWidth * .8//Total width including hidden parts (will expand as notes are added)
    }
    
    this.height = window.innerHeight * .4;
    //TODO: Update widht&height when user resizes window
    this.width = window.innerWidth * .8;//Width for what is visible (only based on window size)
    this.barWidth = window.innerWidth * .2;

    this.barModifier = 50//Controls length of bars on the piano roll
    
    this.divRef = React.createRef();
    this.svgRef = React.createRef();
  }

  componentDidMount() {
    this.props.onRef(this)
  }
  
  componentWillUnmount() {
    this.props.onRef(undefined)
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.currentNote !== prevProps.currentNote) {
      this.drawNote(this.props.currentNote)
    }
    if (this.props.aiSeq !== prevProps.aiSeq) {
      this.drawNoteSequence(this.props.aiSeq)
    }
  }
  
  drawNote(note, aiNote=false) {
    let pitch = this.scalePitch(note.pitch), m = this.barModifier;
    let w = (note.endTime - note.startTime)*m;
    //RecordPlayer starts time from 0, so we need a multiplier
    //AI sequences keep track of their overall start time so we don't to modify them
    let multiplier = aiNote ? 0 : this.props.barCount*m*this.props.barTime;
    let x;
    let color;
    if (aiNote) {
      x = this.width * (note.startTime / (this.props.barTime*4));
      color = '#D352A0';
    } else {
      x = this.width * (this.props.transport.seconds / (this.props.barTime*4)) - w;
      color = '#072940';
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
      separationBars.push(<rect height={this.height} width="3" x={i*this.barWidth} key={i} />);
      /*separationBars.push(<rect 
                            height={this.height} 
                            width="3" 
                            x={this.width * (this.props.stepsToSeconds(BAR_LENGTH) * i / (this.props.barTime*4))} 
                            key={i} 
                          />);*/
      chordText.push(
      (<text x={i*this.barWidth+10} y="22" style={{fill: (i%2)===0 ? "#072940" : "#D352A0"}} key={i}>
        {this.props.selectedChords[i%this.props.selectedChords.length] + ": " + (((i%2)===0 ? "Player" : "AI"))}
      </text>));
    }
    
    return (
      <div ref={this.divRef} style={{width: this.width, display: "inline-block", overflowX:this.state.viewWidth > this.width ? "scroll" : "hidden"}}>
        <svg ref={this.svgRef} height={this.height} width={this.state.viewWidth} >
          <rect height={this.height} width={this.state.viewWidth} style={{fill:"#e9e8d5", strokeWidth:5, stroke:"black"}} />
          
          {separationBars}
          {chordText}
          
          {this.state.bars.map(function(b,i){
            return b
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