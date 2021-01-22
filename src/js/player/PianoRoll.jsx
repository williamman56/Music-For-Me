import React, {Component} from 'react'

class PianoRoll extends Component {
  constructor(props){
    super(props)
    
    this.state = {
      bars: []
    }
    
    this.barModifier = 50//Controls length of bars on the piano roll
    
    this.svgRef = React.createRef();
    this.barRef = React.createRef();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.currentNote !== prevProps.currentNote) {
      this.drawNote(this.props.currentNote)
    }
    if (this.props.aiSeq !== prevProps.aiSeq) {
      this.drawNoteSequence(this.props.aiSeq)
    }
    if (this.props.isRecording && !prevProps.isRecording) {
      this.startBar()
    }
  }
  
  startBar() {
    let that = this
    let totalTime = this.props.barTime*1000, iTime = 50, iNum = totalTime / iTime
    let moveLength = 1.0*this.props.barTime*this.barModifier/iNum
    let movement = setInterval(function(){
      that.barRef.current.setAttribute("x", parseFloat(that.barRef.current.getAttribute("x")) + moveLength)
    }, iTime)
    
    setTimeout(function(){
      //console.log("done")
      clearInterval(movement)
    }, totalTime)
  }
  
  drawNote(note, aiNote=false) {
    //console.log(note)
    let pitch = this.scalePitch(note.pitch), m = this.barModifier
    let w = note.endTime*m - note.startTime*m
    //RecordPlayer starts time from 0, so we need a multiplier
    //AI sequences keep track of their overall start time so we don't to modify them
    let multiplier = aiNote ? 0 : this.props.barCount*m*this.props.barTime
    let bar = React.createElement('rect', {x:note.startTime*m+multiplier, 
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
      
      counter++
      if (counter >= noteSequence.notes.length) {
        clearInterval(drawer)
      }
    }, 250)
    /*for (const note of noteSequence.notes) {
      //console.log(note)
      let n = {pitch: note.pitch, 
               startTime: this.props.stepsToSeconds(note.quantizedStartStep),
               endTime: this.props.stepsToSeconds(note.quantizedEndStep)
              }
      //console.log(n)
      this.drawNote(n, true)
    }*/
    this.barRef.current.setAttribute("x", parseFloat(this.barRef.current.getAttribute("x")) + this.props.barTime*this.barModifier)
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
    let h = window.innerHeight * .25
    let w = window.innerWidth * .8
    return (
      <div>
        <svg ref={this.svgRef} height={h} width={w} >
          <rect height={h} width={w} style={{fill:"#e9e8d5", strokeWidth:5, stroke:"black"}} />
          {this.state.bars.map(function(b,i){
            return b
          })}
          <rect height={h} width="3" ref={this.barRef} x="0" />
        </svg>
      </div>
    )
  }
}  

export default PianoRoll