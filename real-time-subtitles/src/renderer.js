const { ipcRenderer } = require('electron');
const AudioHandler = require('./audio-handler');

// DOM elements
const transcriptElement = document.getElementById('transcript');
const languageElement = document.getElementById('language');

// State management
let currentTranscript = '';
let fadeTimeout = null;
let audioHandler = null;
let isCapturing = false;

// UI state management
function updateLanguageIndicator(text, state = 'ready') {
  languageElement.textContent = text;
  languageElement.className = 'language-indicator';
  
  switch (state) {
    case 'listening':
      languageElement.classList.add('listening');
      break;
    case 'error':
      languageElement.classList.add('error');
      break;
    case 'processing':
      languageElement.classList.add('processing');
      break;
    default:
      // ready state - no additional classes
      break;
  }
}

function updateTranscript(text, isInterim = false) {
  transcriptElement.textContent = text;
  
  // Add animation class
  transcriptElement.classList.remove('fade-in', 'fade-out');
  transcriptElement.classList.add('fade-in');
  
  // Remove animation class after animation completes
  setTimeout(() => {
    transcriptElement.classList.remove('fade-in');
  }, 300);
}

function clearTranscript() {
  clearTimeout(fadeTimeout);
  
  transcriptElement.classList.add('fade-out');
  setTimeout(() => {
    transcriptElement.textContent = '';
    transcriptElement.classList.remove('fade-out');
  }, 300);
}

// Audio capture handling
ipcRenderer.on('start-audio-capture', async () => {
  console.log('Renderer: Received start-audio-capture');
  
  try {
    if (!audioHandler) {
      audioHandler = new AudioHandler();
    }
    
    updateLanguageIndicator('Starting...', 'processing');
    console.log('Renderer: Starting audio capture...');
    
    await audioHandler.startCapture(
      (audioData) => {
        // Send audio data to main process for Deepgram
        ipcRenderer.send('audio-data', audioData);
      },
      (error) => {
        console.error('Renderer: Audio capture error:', error);
        updateLanguageIndicator('Audio Error', 'error');
        ipcRenderer.send('renderer-error', { 
          type: 'audio-capture', 
          message: error.message 
        });
      }
    );
    
    isCapturing = true;
    updateLanguageIndicator('Listening...', 'listening');
    updateTranscript('Listening for audio...');
    
    console.log('Renderer: Audio capture started successfully');
    ipcRenderer.send('renderer-status', 'audio-capture-started');
    
  } catch (error) {
    console.error('Renderer: Failed to start audio capture:', error);
    updateLanguageIndicator('Error', 'error');
    updateTranscript('Failed to start audio capture. Check microphone permissions.');
    
    ipcRenderer.send('renderer-error', { 
      type: 'audio-capture-init', 
      message: error.message 
    });
  }
});

ipcRenderer.on('stop-audio-capture', () => {
  console.log('Renderer: Received stop-audio-capture');
  
  if (audioHandler && isCapturing) {
    audioHandler.stopCapture();
    console.log('Renderer: Audio capture stopped');
  }
  
  isCapturing = false;
  updateLanguageIndicator('Ready', 'ready');
  updateTranscript('Press Cmd+Shift+S to start transcription');
  clearTimeout(fadeTimeout);
  
  ipcRenderer.send('renderer-status', 'audio-capture-stopped');
});

// Transcript display handling
ipcRenderer.on('transcript', (event, data) => {
  console.log('Renderer: Received transcript data:', data);
  
  try {
    if (data.channel && data.channel.alternatives && data.channel.alternatives.length > 0) {
      const result = data.channel.alternatives[0];
      const transcript = result.transcript;
      
      if (transcript && transcript.trim()) {
        // Update transcript text
        if (data.is_final) {
          console.log('Renderer: Final transcript:', transcript);
          currentTranscript = transcript;
          updateTranscript(currentTranscript);
          
          // Update language indicator if language is detected
          if (result.language) {
            updateLanguageIndicator(result.language.toUpperCase(), 'processing');
          }
          
          // Show confidence if available
          if (result.confidence) {
            console.log('Renderer: Confidence:', (result.confidence * 100).toFixed(1) + '%');
          }
          
          // Auto-fade after 5 seconds
          clearTimeout(fadeTimeout);
          fadeTimeout = setTimeout(() => {
            clearTranscript();
          }, 5000);
          
        } else {
          // Show interim results (partial transcription)
          console.log('Renderer: Interim transcript:', transcript);
          updateTranscript(transcript, true);
          updateLanguageIndicator('Processing...', 'processing');
        }
      }
    }
  } catch (error) {
    console.error('Renderer: Error processing transcript:', error);
    ipcRenderer.send('renderer-error', { 
      type: 'transcript-processing', 
      message: error.message 
    });
  }
});

// Error handling from main process
ipcRenderer.on('error', (event, error) => {
  console.error('Renderer: Received error from main:', error);
  updateLanguageIndicator('Error', 'error');
  updateTranscript('Connection error. Check your internet and API key.');
});

// Clear transcript when window loses focus
window.addEventListener('blur', () => {
  console.log('Renderer: Window lost focus');
  // Don't clear transcript on blur - user might want to see it
  // clearTranscript();
});

// Handle window focus
window.addEventListener('focus', () => {
  console.log('Renderer: Window gained focus');
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  console.log('Renderer: Page unloading, cleaning up...');
  
  if (audioHandler && isCapturing) {
    audioHandler.stopCapture();
  }
  
  clearTimeout(fadeTimeout);
});

// Handle keyboard shortcuts within the renderer
document.addEventListener('keydown', (event) => {
  // Emergency stop with Escape key
  if (event.key === 'Escape' && isCapturing) {
    console.log('Renderer: Emergency stop via Escape key');
    ipcRenderer.send('renderer-status', 'emergency-stop');
  }
});

// Initialize renderer
console.log('Renderer: Initializing...');
updateLanguageIndicator('Ready', 'ready');
console.log('Renderer: Ready');
