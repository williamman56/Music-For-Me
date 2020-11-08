import React from 'react';
//import logo from './logo.svg';
//import Waveform from './waveform.js'
//import AudioInput from './audioInput.js'
import Visualizer from './visualizer.js'
import './css/App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
      {/*<img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>*/}
        { /*<Waveform />
        <AudioInput /> */}
        <Visualizer />
      </header>
    </div>
  );
}

export default App;
