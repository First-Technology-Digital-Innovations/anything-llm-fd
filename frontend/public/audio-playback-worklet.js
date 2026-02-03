// Audio Playback Worklet for Voice Chat
// Handles audio playback on a separate thread for low-latency streaming

class AudioPlaybackWorklet extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.sampleRate = 24000;
    this.audioQueue = [];
    this.currentBuffer = null;
    this.currentIndex = 0;
    this.isPlaying = false;

    console.log(
      "[AudioPlaybackWorklet] Initialized with sample rate:",
      this.sampleRate
    );

    // Listen for audio data from main thread
    this.port.onmessage = (event) => {
      const { type, data } = event.data;

      if (type === "audiodata") {
        // Convert Int16Array back to Float32Array for playback
        const int16View = new Int16Array(data);
        const float32Buffer = new Float32Array(int16View.length);

        for (let i = 0; i < int16View.length; i++) {
          float32Buffer[i] = int16View[i] / 32767; // Convert back to [-1, 1] range
        }

        // Add to playback queue
        this.audioQueue.push(float32Buffer);
        this.isPlaying = true;
      } else if (type === "stop") {
        // Clear queue and stop playback
        this.audioQueue = [];
        this.currentBuffer = null;
        this.currentIndex = 0;
        this.isPlaying = false;
      } else if (type === "clear") {
        // Clear queue but allow current buffer to finish
        this.audioQueue = [];
      }
    };
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];

    if (!this.isPlaying || !output.length) {
      return true;
    }

    const outputChannel = output[0]; // First channel (mono)
    const outputLength = outputChannel.length;

    for (let i = 0; i < outputLength; i++) {
      let sample = 0;

      // If we don't have a current buffer, get one from the queue
      if (
        !this.currentBuffer ||
        this.currentIndex >= this.currentBuffer.length
      ) {
        if (this.audioQueue.length > 0) {
          this.currentBuffer = this.audioQueue.shift();
          this.currentIndex = 0;
        } else {
          // No more audio data, stop playing
          this.currentBuffer = null;
          this.isPlaying = false;
          break;
        }
      }

      // Get sample from current buffer
      if (this.currentBuffer && this.currentIndex < this.currentBuffer.length) {
        sample = this.currentBuffer[this.currentIndex];
        this.currentIndex++;
      }

      // Write to output
      outputChannel[i] = sample;

      // Copy to other channels if stereo
      for (let channel = 1; channel < output.length; channel++) {
        output[channel][i] = sample;
      }
    }

    return true; // Keep the worklet alive
  }
}

registerProcessor("audio-playback-worklet", AudioPlaybackWorklet);
