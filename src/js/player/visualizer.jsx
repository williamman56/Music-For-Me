import React, {Component} from 'react'

import {config} from '../../variables/values.js';

const mm = require('@magenta/music/es6/core');

class Visualizer extends Component {
  constructor(props){
    super(props)
    this.state = {
      noteSequence: props.noteSequence,
    }
    
    this.svgRef = React.createRef();
    
  }
  
  componentDidMount() {
    this.viz = new mm.PianoRollSVGVisualizer(this.props.noteSequence, this.svgRef.current, config);
  }
  
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (this.props.noteSequence !== prevProps.noteSequence) {
      this.viz = new mm.PianoRollSVGVisualizer(this.props.noteSequence, this.svgRef.current, config);
      this.properlyPosition();
    }
  }
  
  properlyPosition() {
    //For some reason replacing the SVG causes all the notes to be off the canvas, so this puts them back in place
    let offset = this.svgRef.current.children[0].getAttribute('x');
    for (let child of this.svgRef.current.children) {
      child.setAttribute('x', child.getAttribute('x') - offset);
    }
  }
  
  render() {
    return (
      <div>
        <div className='Visualizer-info'>
          <h6>{this.props.player}: {this.props.chord}</h6>
        </div>
        <svg ref={this.svgRef} />
      </div>
    )
  }
}

export default Visualizer