import React, {Component} from 'react'

import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import ButtonGroup from 'react-bootstrap/ButtonGroup';

import {chords} from '../../variables/values.js';

class Settings extends Component {
  constructor(props){
    super(props)
    
    this.state = {
      show: false,
    }
  
    this.openSettings = this.openSettings.bind(this);
    this.closeSettings = this.closeSettings.bind(this);
  }
  
  openSettings() {
    this.setState({show: true});
  }
  closeSettings() {
    this.setState({show: false});
  }
  
  render() {
    const removeChordButton = (<Button onClick={this.props.removeChord}>-</Button>);
    const addChordButton = (<Button onClick={this.props.addChord}>+</Button>);
    const chordSelectors = [];
    for (let i = 0; i < this.props.selectedChords.length; ++i) {
      chordSelectors.push(
        (<div key={i}>
          <p className='Selector-text'>
            Chord {i+1}:
          </p>
          <DropdownButton as={ButtonGroup} title={this.props.selectedChords[i]}>
            {chords.map((chord, index) => 
              <Dropdown.Item key={index} dataindex={i} onClick={(e) => this.props.onSelectChord(chord, i)}>{chord}</Dropdown.Item>
            )}
          </DropdownButton>
        </div>)
      )
    }
    return (
      <div className="Settings-Button">
        <Button onClick={this.openSettings} >
          <i className="fas fa-cog" />
        </Button>
        <Modal show={this.state.show} onHide={this.closeSettings} centered>
          <Modal.Header>
            <Modal.Title>
              Settings
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className='Chord-selectors'>
              <h5>Background Chords:</h5>
              {chordSelectors}
              {removeChordButton}
              {addChordButton}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={this.closeSettings}>Close</Button>
          </Modal.Footer>
        </Modal>
      </div>
    )
  }
}

export default Settings