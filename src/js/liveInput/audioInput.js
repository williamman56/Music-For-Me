import React, {Component} from 'react';

class AudioInput extends Component {
  constructor(props) {
    super(props);
    this.state = {}
    
    this.recorder = null;
    this.dataInterval = null;
    
    this.recorderDataAvailable = this.recorderDataAvailable.bind(this)
  }
  
  componentDidMount() {
    this.getUserMedia({audio:true});
  }
  
  getUserMedia(dictionary) {
    navigator.mediaDevices.getUserMedia(dictionary)
      .then(stream => this.gotStream(stream))
      .catch(e => {
        console.log("Failed to get user media: " + e)
      })
  }
  
  gotStream(stream) {
    let settings = stream.getTracks()[0].getSettings()
    //let bitrate = settings.sampleRate * settings.sampleSize
    //console.log(settings.sampleRate)
    let bitrate = 88200
    let options = {audioBitsPerSecond: bitrate}
    this.recorder = new MediaRecorder(stream, options);
    this.recorder.ondataavailable = this.recorderDataAvailable;
    this.recorder.start();
    //console.log(this.recorder)
    this.dataInterval = setInterval( () => {
      this.recorder.stop();
      this.recorder.start();
    }, 2000)
    setTimeout(() => clearInterval(this.dataInterval), 8000)
    //setTimeout(() => this.recorder.stop(), 8000)
  }
  
  recorderDataAvailable(e) {
    this.props.onData(e.data);
  }
  
  render(){
    return (
      <div>
      
      </div>
    );
  }
}

export default AudioInput