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
    this.state = {}
  };
  
  render() {
    return (
      <div className='Selectors'>
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
            <Button>Placeholder</Button>
          </div>
        </div>
        
        <div className='Chord-selectors'>
          {['1', '2', '3', '4'].map((val, i) => (
              <div key={i}>
                <p className='Selector-text'>
                  Chord {val}:
                </p>
                <DropdownButton as={ButtonGroup} title={this.props.selectedChords[i]}>
                  {chords.map((chord, index) => 
                    <Dropdown.Item key={index} dataindex={i} onClick={(e) => this.props.onSelectChord(chord, i)}>{chord}</Dropdown.Item>
                  )}
                </DropdownButton>
              </div>
            )
          )}
        </div>
      </div>
    )
  }
}

export default ValueSelector