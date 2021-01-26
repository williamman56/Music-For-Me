import React, {Component} from 'react'

class PianoBar extends Component {
  constructor(props){
    super(props)
    console.log(props)
    this.state = {
      elapsedTime: props.transport.seconds
    }
    
  }
  
  componentDidMount() {
    let that = this
    this.props.transport.on("start", function(){ that.startBar() })
    this.props.transport.on("stop", function(){ clearInterval(that.movement) })
    this.props.transport.on("pause", function(){ clearInterval(that.movement) })
  }
  
  startBar(){
    let that = this;
    this.movement = setInterval(function() {
      console.log(that)
      that.setState({elapsedTime: that.props.transport.seconds})
    }, 50)
  }
  
  
  render() {
    console.log(this.props.width);
    console.log(this.state.elapsedTime)
    console.log(this.props.stepsToSeconds(this.props.barTime*4))
    return <rect 
              height={this.props.height} 
              width="3" 
              key="bar" 
              x={this.props.barModifier * this.props.width * this.state.elapsedTime / this.props.stepsToSeconds(this.props.barTime*4)} 
            />
  }
}

export default PianoBar