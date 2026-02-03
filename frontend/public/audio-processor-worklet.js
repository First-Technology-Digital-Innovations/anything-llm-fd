// Audio Processor Worklet for Voice Chat
// Handles microphone input processing on a separate thread for low-latency performance

class AudioProcessorWorklet extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.bufferSize = 4800; // 200ms at 24kHz sample rate
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    this.sampleRate = 24000;

    console.log(
      "[AudioProcessorWorklet] Initialized with buffer size:",
      this.bufferSize
    );
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    // Pass through audio for monitoring (optional)
    if (input.length > 0 && output.length > 0) {
      for (
        let channel = 0;
        channel < Math.min(input.length, output.length);
        channel++
      ) {
        output[channel].set(input[channel]);
      }
    }

    // Process input audio
    if (input.length > 0 && input[0]) {
      const inputChannel = input[0]; // First channel (mono)

      for (let i = 0; i < inputChannel.length; i++) {
        // Add sample to buffer
        this.buffer[this.bufferIndex] = inputChannel[i];
        this.bufferIndex++;

        // When buffer is full, send it to main thread
        if (this.bufferIndex >= this.bufferSize) {
          // Convert Float32 to Int16 PCM
          const pcm16 = new Int16Array(this.bufferSize);
          for (let j = 0; j < this.bufferSize; j++) {
            // Clamp to [-1, 1] range and convert to 16-bit
            const clamped = Math.max(-1, Math.min(1, this.buffer[j]));
            pcm16[j] = Math.round(clamped * 32767);
          }

          // Send PCM data to main thread
          this.port.postMessage({
            type: "audiodata",
            data: pcm16.buffer,
            sampleRate: this.sampleRate,
            length: this.bufferSize,
          });

          // Reset buffer
          this.bufferIndex = 0;
        }
      }
    }

    return true; // Keep the worklet alive
  }
}

registerProcessor("audio-processor-worklet", AudioProcessorWorklet);
