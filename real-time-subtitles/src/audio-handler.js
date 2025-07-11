class AudioHandler {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    this.processor = null;
    this.isRecording = false;
    this.onDataCallback = null;
  }

  async startCapture(onData, onError) {
    try {
      console.log('AudioHandler: Starting Web Audio capture...');
      
      // Enumerate audio devices first
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      console.log('AudioHandler: Available audio input devices:');
      audioInputs.forEach((device, index) => {
        console.log(`  ${index}: ${device.label || 'Unknown Device'} (${device.deviceId})`);
      });
      
      // Also send to main process for terminal logging
      if (typeof require !== 'undefined') {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('renderer-status', `Found ${audioInputs.length} audio input devices`);
        audioInputs.forEach((device, index) => {
          ipcRenderer.send('renderer-status', `Device ${index}: ${device.label || 'Unknown Device'}`);
        });
      }
      
      // Find the Aggregate Device specifically
      let aggregateDevice = audioInputs.find(device => 
        device.label && device.label.toLowerCase().includes('aggregate')
      );
      
      if (!aggregateDevice) {
        console.log('AudioHandler: No Aggregate Device found, using default');
        aggregateDevice = null;
      } else {
        console.log('AudioHandler: Found Aggregate Device:', aggregateDevice.label);
      }
      
      // Get user media - try to use Aggregate Device specifically
      const constraints = {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          // Don't force sample rate - let system decide
          channelCount: 1
        }
      };
      
      // If we found aggregate device, specify it
      if (aggregateDevice && aggregateDevice.deviceId) {
        constraints.audio.deviceId = { exact: aggregateDevice.deviceId };
        console.log('AudioHandler: Requesting specific device:', aggregateDevice.deviceId);
      }
      
      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      console.log('AudioHandler: Got media stream');
      
      // Get the actual sample rate from the media stream
      const track = this.mediaStream.getAudioTracks()[0];
      const settings = track.getSettings();
      console.log('AudioHandler: Media stream settings:', settings);

      // Create audio context with system sample rate
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      console.log('AudioHandler: Created audio context');
      console.log('AudioHandler: Audio context sample rate:', this.audioContext.sampleRate);
      
      // Send key info to main process
      if (typeof require !== 'undefined') {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('renderer-status', `Audio stream: ${settings.sampleRate}Hz, Device: ${settings.deviceId || 'unknown'}`);
        ipcRenderer.send('renderer-status', `Audio context: ${this.audioContext.sampleRate}Hz`);
      }

      // Create media stream source
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create script processor for audio data
      const bufferSize = 4096;
      this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
      let audioChunkCount = 0;
      
      // Calculate resampling ratio (system rate -> 16kHz for Deepgram)
      const resampleRatio = this.audioContext.sampleRate / 16000;
      console.log('AudioHandler: Resample ratio:', resampleRatio);
      
      this.processor.onaudioprocess = (event) => {
        if (this.isRecording && onData) {
          const audioData = event.inputBuffer.getChannelData(0);
          
          // Check if we're getting actual audio (not just silence)
          const hasAudio = audioData.some(sample => Math.abs(sample) > 0.01);
          audioChunkCount++;
          
          if (audioChunkCount % 50 === 0) { // Log every 50 chunks
            console.log(`AudioHandler: Chunk ${audioChunkCount}, hasAudio: ${hasAudio}, sampleCount: ${audioData.length}, originalRate: ${this.audioContext.sampleRate}`);
            
            // Send audio detection status to main process
            if (typeof require !== 'undefined') {
              const { ipcRenderer } = require('electron');
              ipcRenderer.send('renderer-status', `Audio chunk ${audioChunkCount}: hasAudio=${hasAudio}, samples=${audioData.length}`);
            }
          }
          
          // Resample to 16kHz for Deepgram if needed
          let resampledData;
          if (Math.abs(resampleRatio - 1.0) < 0.01) {
            // No resampling needed
            resampledData = audioData;
          } else {
            // Simple downsampling by taking every Nth sample
            const outputLength = Math.floor(audioData.length / resampleRatio);
            resampledData = new Float32Array(outputLength);
            for (let i = 0; i < outputLength; i++) {
              const sourceIndex = Math.floor(i * resampleRatio);
              resampledData[i] = audioData[sourceIndex];
            }
          }
          
          // Convert Float32Array to Int16Array for Deepgram
          const int16Data = new Int16Array(resampledData.length);
          for (let i = 0; i < resampledData.length; i++) {
            int16Data[i] = Math.max(-32768, Math.min(32767, resampledData[i] * 32768));
          }
          
          // Send the ArrayBuffer to the callback
          onData(int16Data.buffer);
        }
      };

      // Connect audio nodes
      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.isRecording = true;
      this.onDataCallback = onData;
      console.log('AudioHandler: Started Web Audio capture successfully');
      
    } catch (error) {
      console.error('AudioHandler: Failed to start capture:', error);
      if (onError) {
        onError(error);
      }
    }
  }

  stopCapture() {
    console.log('AudioHandler: Stopping Web Audio capture...');
    
    this.isRecording = false;
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
      console.log('AudioHandler: Disconnected processor');
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        track.stop();
        console.log('AudioHandler: Stopped track:', track.kind);
      });
      this.mediaStream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      console.log('AudioHandler: Closed audio context');
    }
    
    this.onDataCallback = null;
    console.log('AudioHandler: Stopped Web Audio capture');
  }

  isActive() {
    return this.isRecording;
  }

  getSettings() {
    return {
      inputSampleRate: this.audioContext?.sampleRate || 'unknown',
      outputSampleRate: 16000,
      channels: 1,
      encoding: 'linear16',
      bufferSize: 4096,
      resampleRatio: this.audioContext ? (this.audioContext.sampleRate / 16000) : 'unknown'
    };
  }
}

module.exports = AudioHandler; 