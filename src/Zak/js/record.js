const sampler = new Tone.Sampler({
	urls: {
		"C4": "C4.mp3",
		"D#4": "Ds4.mp3",
		"F#4": "Fs4.mp3",
		"A4": "A4.mp3",
	},
	release: 1,
	baseUrl: "https://tonejs.github.io/audio/salamander/",
}).toDestination();

let player = new mm.SoundFontPlayer('https://storage.googleapis.com/magentadata/js/soundfonts/salamander');


var recording = false;
var notes = [];
var noteSeq = {};
var startTime = 0;
var endTime = 0;
var recordTime = 10;

function findLastNote(notes, pitch) {
    for (var i = notes.length-1; i >= 0; i--) {
        if (notes[i].pitch === pitch) {
            return i;
        }
    }
    return -1;
}

window.onload = function(){
    document.getElementById('allow-audio').addEventListener('click', async () => {
        await Tone.start();
        console.log('audio is ready');
    });

    document.getElementById('record-button').addEventListener('click', async () => {
        if(!recording) {
            notes = [];

            Tone.Transport.schedule(function(time){
                Tone.Transport.stop();
                recording = false;
                endTime = time;
                noteSeq.notes = notes;
                noteSeq.totalTime = endTime - startTime;
                console.log('recording stopped');
                console.log(endTime-startTime);
            }, recordTime);
            
            Tone.Transport.scheduleRepeat(function(time){
                //use the time argument to schedule a callback with Tone.Draw
                Tone.Draw.schedule(function(){
                    document.getElementById('timer').textContent = (recordTime - Tone.Transport.seconds).toFixed(2);
                }, time)
            }, 0.1, startTime=0, duration=recordTime);
            startTime = Tone.now();
            recording = true;
            Tone.Transport.start();
        }
    });

    document.getElementById('play-button').addEventListener('click', async () => {
        if (noteSeq && !recording) {
            await player.start(noteSeq);
        }
    });

    WebMidi.enable(function (err) {
        if (err) {
            console.log('WebMidi could not be enabled.', err);
        } else {
            var input = WebMidi.inputs[0];
            input.addListener('noteon', "all", function(e){
                console.log("Received 'noteon' message (" + e.note.name + e.note.octave + ")." +Tone.now());
                if (recording) {
                    let note = {
                        pitch: e.note.number,
                        startTime: (Tone.now()-startTime)
                    };
                    notes.push(note);
                }

                sampler.triggerAttack([e.note.name + '' + e.note.octave])

            })

            input.addListener('noteoff', "all", function(e){
                console.log("Received 'noteoff' message (" + e.note.name + e.note.octave + ').');
                if (recording) {
                    let i = findLastNote(notes, e.note.number);
                    notes[i].endTime = (Tone.now()-startTime);
                }

                sampler.triggerRelease([e.note.name + '' + e.note.octave])
            })
        }
    });
}