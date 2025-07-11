const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const DeepgramClient = require('./deepgram-client');

let subtitleWindow = null;
let deepgramClient = null;
let isTranscribing = false;

function createSubtitleWindow() {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  console.log('Creating subtitle window...');
  
  subtitleWindow = new BrowserWindow({
    width: width,
    height: 80,
    x: 0,
    y: height - 80,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,  // Allow Web Audio API access
      allowRunningInsecureContent: true  // For audio capture
    }
  });

  subtitleWindow.loadFile('src/index.html');
  
  // Open DevTools for debugging (remove this later)
  // subtitleWindow.webContents.openDevTools();
  
  // Hide window when it loses focus (optional)
  subtitleWindow.on('blur', () => {
    // Uncomment if you want the window to hide when it loses focus
    // subtitleWindow.hide();
  });

  console.log('Subtitle window created');
}

function toggleTranscription() {
  console.log('Toggling transcription. Current state:', isTranscribing);
  
  if (isTranscribing) {
    stopTranscription();
  } else {
    startTranscription();
  }
}

function startTranscription() {
  console.log('Starting transcription...');
  
  if (!deepgramClient) {
    deepgramClient = new DeepgramClient();
  }

  // Connect to Deepgram
  deepgramClient.connect(
    (transcript) => {
      console.log('Main: Received transcript, sending to renderer');
      // Send transcript to renderer
      if (subtitleWindow) {
        subtitleWindow.webContents.send('transcript', transcript);
      }
    },
    (error) => {
      console.error('Main: Deepgram error:', error);
      if (subtitleWindow) {
        subtitleWindow.webContents.send('error', error);
      }
    }
  );

  // Show subtitle window and start audio capture in renderer
  subtitleWindow.show();
  subtitleWindow.webContents.send('start-audio-capture');
  isTranscribing = true;
  
  console.log('Transcription started');
}

function stopTranscription() {
  console.log('Stopping transcription...');
  
  if (subtitleWindow) {
    subtitleWindow.webContents.send('stop-audio-capture');
    subtitleWindow.hide();
  }
  
  if (deepgramClient) {
    deepgramClient.disconnect();
  }
  
  isTranscribing = false;
  console.log('Transcription stopped');
}

app.whenReady().then(() => {
  console.log('Electron app ready');
  
  createSubtitleWindow();
  
  // Register global hotkey
  const hotkeyRegistered = globalShortcut.register('CommandOrControl+Shift+S', toggleTranscription);
  
  if (hotkeyRegistered) {
    console.log('✅ Hotkey registered: Cmd+Shift+S');
  } else {
    console.log('❌ Failed to register hotkey');
  }
  
  // Handle audio data from renderer process
  let audioDataCount = 0;
  ipcMain.on('audio-data', (event, audioData) => {
    audioDataCount++;
    
    if (audioDataCount % 50 === 0) { // Log every 50 chunks
      console.log(`Main: Received audio data chunk ${audioDataCount}, size: ${audioData.byteLength || audioData.length}`);
    }
    
    if (deepgramClient && isTranscribing) {
      deepgramClient.sendAudio(audioData);
    } else {
      if (audioDataCount === 1) {
        console.log('Main: Not sending audio - deepgramClient:', !!deepgramClient, 'isTranscribing:', isTranscribing);
      }
    }
  });
  
  // Handle error reporting from renderer
  ipcMain.on('renderer-error', (event, error) => {
    console.error('Renderer error:', error);
  });
  
  // Handle status updates from renderer
  ipcMain.on('renderer-status', (event, status) => {
    console.log('Renderer status:', status);
  });
  
  console.log('Main process setup complete');
});

app.on('window-all-closed', () => {
  // On macOS, keep app running even when windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createSubtitleWindow();
  }
});

app.on('will-quit', () => {
  console.log('App will quit, cleaning up...');
  
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
  
  // Stop transcription
  stopTranscription();
  
  console.log('Cleanup complete');
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});

console.log('Main process loaded');
