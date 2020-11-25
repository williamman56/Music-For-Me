import React from 'react';
//import logo from './logo.svg';
//import Waveform from './js/visualize/waveform.js'
//import AudioInput from './js/liveInput/audioInput.js'
//import Visualizer from './js/visualize/visualizer.js'
import PageHeader from './js/UI/pageHeader.jsx'
import Player from './js/player/Player.jsx'

import './css/App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <PageHeader />
        { /*<Waveform />
        <AudioInput /> 
        <Visualizer />*/}
      </header>
      <div className='Body'>
        <Player />
      </div>
    </div>
  );
}

export default App;
