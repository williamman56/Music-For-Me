import React, {Component} from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';

import {supportedInstruments} from '../../variables/values.js';
import {chords} from '../../variables/values.js';

class ValueSelector extends Component {
  constructor(props){
    super(props)
    this.state = {
      devices: props.availableMidi
    }
    
    this.checkDevices = this.checkDevices.bind(this);
  };
  
  checkDevices() {
    this.setState({devices: this.props.availableMidi});
    //All I want to do is trigger a component update
    //Because availableMidi updating doesn't trigger an update
  }
  
  render() {
    return (
      <div className='Tool-selectors'>
        <div className='Instrument-selector'>
          <p className='Selector-text'>
            Instrument:
          </p>
          <DropdownButton title={this.props.selectedInstrument}>
            {supportedInstruments.map((inst, index) => 
              <Dropdown.Item key={index} onClick={this.props.onSelectInstrument}>{inst}</Dropdown.Item>
            )}
          </DropdownButton>
        </div>
        
        <div className='Midi-selector'>
          <p className='Selector-text'>
            Midi Controller:
          </p>
          <DropdownButton title={this.props.selectedMidi ? this.props.selectedMidi.name : "None"} onClick={this.checkDevices}>
            {this.props.availableMidi.map((inst, index) => 
              <Dropdown.Item key={index} onClick={()=>this.props.onSelectMidi(inst)}>
                {inst.name}
              </Dropdown.Item>
            )}
          </DropdownButton>
        </div>
      </div>
    )
  }
}

export default ValueSelector