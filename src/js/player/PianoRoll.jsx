import React, {Component} from 'react'

class PianoRoll extends Component {
  constructor(props){
    super(props)
    
    this.state = {}
    
    this.canvasRef = React.createRef();
  }
  
  componentDidMount() {
    let canvas = this.canvasRef.current
    this.ctx = canvas.getContext("2d")
    
    this.ctx.fillStyle = "#e9e8d5";
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.ctx.lineWidth = 10
    //ctx.beginPath();
    //ctx.arc(95, 50, 40, 0, 2 * Math.PI);
    //ctx.stroke();
  }
  
  componentDidUpdate(prevProps, prevState) {
    if (this.props.currentNote != prevProps.currentNote) {
      console.log(this.props.currentNote)
      this.drawNote(this.props.currentNote)
    }
  }
  
  drawNote(note) {
    console.log('draw')
    //this.ctx.fillStyle = "#5b6770";
    //this.ctx.fillRect(0, 0, this.canvasRef.current.width, this.canvasRef.current.height);
    let pitch = this.scalePitch(note.pitch)
    this.ctx.moveTo(note.startTime*20, pitch)
    this.ctx.lineTo(note.endTime*20, pitch)
    //this.ctx.moveTo(0, 0);
    //this.ctx.lineTo(200, 100);
    this.ctx.stroke()
  }
  
  scalePitch(pitch) {
    //Scale from 53 to 83 (based off lowest & highest notes on my midi keyboard)
    const height = this.canvasRef.current.height
    
    //This will need to become dynamic in the future
    const low = 53
    const high = 83
    if (pitch < low) pitch = low
    if (pitch > high) pitch = high
    
    let scaled = (pitch - low) / (high - low) * (height - 10) + 5
    
    return height - scaled
  }
  
  render() {
    return (
      <div>
        <canvas ref={this.canvasRef} height={window.innerHeight * .25} width={window.innerWidth * .8} />
      </div>
    )
  }
}  

export default PianoRoll