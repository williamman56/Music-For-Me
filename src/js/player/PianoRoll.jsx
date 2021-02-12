import React, {Component} from 'react'

import PianoBar from './PianoBar.jsx';

class PianoRoll extends Component {
  constructor(props){
    super(props)
    
    this.state = {
      bars: []
    }
    
    this.height = window.innerHeight * .4;
    this.width = window.innerWidth * .8;

    this.barModifier = 50//Controls length of bars on the piano roll
    
    this.svgRef = React.createRef();
    this.barRef = React.createRef();
  }

  componentDidMount() {
    console.log("BAR TIME:" + this.props.barTime);
  }

  componentDidUpdate(prevProps, prevState) {
    //console.log("BIG CAPS:" + this.width * this.props.elapsedTime / this.props.stepsToSeconds(this.props.barTime*4));
    //console.log("BIG CAPS:" + this.props.elapsedTime);
    if (this.props.currentNote !== prevProps.currentNote) {
      this.drawNote(this.props.currentNote)
    }
    if (this.props.aiSeq !== prevProps.aiSeq) {
      console.log("AI SEQ")
      console.log(this.props.aiSeq)
      this.drawNoteSequence(this.props.aiSeq)
    }
  }
  
  drawNote(note, aiNote=false) {
    console.log(note)
    let pitch = this.scalePitch(note.pitch), m = this.barModifier;
    let w = note.endTime*m - note.startTime*m;
    //RecordPlayer starts time from 0, so we need a multiplier
    //AI sequences keep track of their overall start time so we don't to modify them
    let multiplier = aiNote ? 0 : this.props.barCount*m*this.props.barTime;
    let x;
    if (aiNote) {
      x = this.width * (note.startTime / (this.props.barTime*4));
    } else {
      x = this.width * (this.props.transport.seconds / (this.props.barTime*4)) - w;
    }
    let bar = React.createElement('rect', {x:x, 
                                            y:pitch, 
                                            height:10, 
                                            width:w, 
                                            key:this.state.bars.length}, null)
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
    
    return (
      <div>
        <svg ref={this.svgRef} height={this.height} width={this.width} >
          <rect height={this.height} width={this.width} style={{fill:"#e9e8d5", strokeWidth:5, stroke:"black"}} />
          {this.state.bars.map(function(b,i){
            return b
          })}
          <PianoBar 
            height={this.height} 
            width={this.width} 
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