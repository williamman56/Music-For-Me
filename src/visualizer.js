import React, {Component} from 'react'
import AudioInput from './audioInput'

var fft = require('fft-js').fft;
var fftUtil = require('fft-js').util;

const Pitchfinder = require("pitchfinder");
const detectPitch = Pitchfinder.AMDF();

class Visualizer extends Component {
  constructor(props){
    super(props)
    this.state = {
      soundIndex: 0,
      maxSounds: 0
    }
    
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContext();
    this.fileInput = React.createRef();
    this.canvasRef = React.createRef();
    
    this.capturedAudio = []
    
    this.onDataGenerated = this.onDataGenerated.bind(this);
    this.playSound = this.playSound.bind(this);
  };
  
  playSound() {
    console.log(this.capturedAudio)
    var sound = this.audioContext.createBufferSource();
    sound.buffer = this.capturedAudio[this.state.soundIndex]
    sound.connect(this.audioContext.destination)
    sound.start()
    this.setState({soundIndex: (this.state.soundIndex+1)%this.state.maxSounds})
  }
  
  average(array) {
    return array.reduce((a, b) => a + b) / array.length;
  }
  
  fourier(data) {
    let phasors = fft(data)
    var frequencies = fftUtil.fftFreq(phasors, this.audioContext.sampleRate);
    var magnitudes = fftUtil.fftMag(phasors); 
    var both = frequencies.map(function (f, ix) {
      return {frequency: f, magnitude: magnitudes[ix]};
    });
    let most = both.sort(function (a, b) {
      if (a["magnitude"] > b["magnitude"]){
        return 1;
      }
      if (a["magnitude"] < b["magnitude"]) {
        return -1;
      }
      return 0;
    }).slice(-10);
    console.log(most)
  }
  
  onDataGenerated(data) {
    //console.log(data)
    data.arrayBuffer()
      .then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        this.capturedAudio.push(audioBuffer)
        let test = audioBuffer.getChannelData(0)
        console.log(test.length)
        if (test.length > 8192) {
          let power = test.slice(0, 8192)
          this.fourier(power)
        }

        //console.log(this.audioContext.sampleRate)
        let filtered = this.filterData(audioBuffer)
        let normalized = this.normalizeData(filtered)
        const pitch = detectPitch(test); 
        const pitch2 = detectPitch(filtered)
        const pitch3 = detectPitch(normalized)
        //console.log(test)
        console.log("Raw: " + pitch)
        console.log("Filtered: " + pitch2)
        console.log("Normalized: " + pitch3)
        
        
        this.setState({maxSounds: this.state.maxSounds+1})
      })
      .catch(e => console.log("Not enough audio data: " + e))
      //.then(audioBuffer => console.log(audioBuffer.numberOfChannels))
      /*.then(audioBuffer => {
        console.log(this.filterData(audioBuffer))
        console.log(this.normalizeData(this.filterData(audioBuffer)))
      });*/
      //.then(audioBuffer => this.draw(this.normalizeData(this.filterData(audioBuffer))));
  }
  
  filterData (audioBuffer) {
    const rawData = audioBuffer.getChannelData(0); // We only need to work with one channel of data
    const samples = 70; // Number of samples we want to have in our final data set
    const blockSize = Math.floor(rawData.length / samples); // the number of samples in each subdivision
    const filteredData = [];
    for (let i = 0; i < samples; i++) {
      let blockStart = blockSize * i; // the location of the first sample in the block
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum = sum + Math.abs(rawData[blockStart + j]) // find the sum of all the samples in the block
      }
      filteredData.push(sum / blockSize); // divide the sum by the block size to get the average
    }
    return filteredData;
  }
  
  normalizeData (filteredData){
    const multiplier = Math.pow(Math.max(...filteredData), -1);
    return filteredData.map(n => n * multiplier);
  }
  
  drawLineSegment (ctx, x, y, width, isEven){
    ctx.lineWidth = 1; // how thick the line is
    ctx.strokeStyle = "#fff"; // what color our line is
    ctx.beginPath();
    y = isEven ? y : -y;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, y);
    ctx.arc(x + width / 2, y, width / 2, Math.PI, 0, isEven);
    ctx.lineTo(x + width, 0);
    ctx.stroke();
  };
  
  draw (normalizedData) {
    // Set up the canvas
    const canvas = this.canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const padding = 20;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = (canvas.offsetHeight + padding * 2) * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.translate(0, canvas.offsetHeight / 2 + padding); // Set Y = 0 to be in the middle of the canvas

    // draw the line segments
    const width = canvas.offsetWidth / normalizedData.length;
    for (let i = 0; i < normalizedData.length; i++) {
      const x = width * i;
      let height = normalizedData[i] * canvas.offsetHeight - padding;
      if (height < 0) {
          height = 0;
      } else if (height > canvas.offsetHeight / 2) {
          height = height > canvas.offsetHeight / 2;
      }
      this.drawLineSegment(ctx, x, height, width, (i + 1) % 2);
    }
  };
  
  render() {
    return (
      <div>
        <canvas ref={this.canvasRef} />
        <AudioInput onData={this.onDataGenerated} />
        <button onClick={this.playSound}>Play</button>
      </div>
    )
  }
}

export default Visualizer