# Real-Time Multilingual Subtitle Generator

A powerful desktop application that provides real-time multilingual subtitles for any audio source on your computer - from video calls to movies, meetings, and system audio.

## ✨ Features

- **🌍 Multilingual Support**: Automatic language detection and transcription in 100+ languages
- **🎯 Real-time Processing**: Live transcription with minimal latency using Deepgram's Nova-3 model
- **💻 System Audio Capture**: Captures audio from any application (videos, calls, music) using BlackHole
- **🪟 Overlay UI**: Translucent subtitle bar that appears at the bottom of your screen
- **⌨️ Global Hotkey**: Toggle transcription with `Cmd+Shift+S` from anywhere
- **🎨 Beautiful Interface**: Glassmorphism design with smooth animations
- **🔧 Cross-platform**: Built with Electron for macOS, Windows, and Linux

## 🛠️ Requirements

### Software Dependencies
- **Node.js** (v16 or higher)
- **Electron** (included in dependencies)
- **BlackHole** (macOS virtual audio driver)
- **Deepgram API Key** (for transcription service)

### macOS Audio Setup
This project requires BlackHole for system audio capture:
1. **BlackHole 2ch** - Virtual audio driver for routing system audio
2. **Multi-Output Device** - Combines speakers + BlackHole for audio output
3. **Aggregate Device** - Combines microphone + BlackHole for audio input

## 📦 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd real-time-subtitles
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Install BlackHole (macOS)
```bash
# Using Homebrew
brew install blackhole-2ch

# Or download from: https://github.com/ExistentialAudio/BlackHole
```

### 4. Configure Audio Devices (macOS)

#### Create Multi-Output Device:
1. Open **Audio MIDI Setup** (Applications > Utilities)
2. Click **+** → **Create Multi-Output Device**
3. Check both:
   - Your speakers/headphones
   - BlackHole 2ch
4. Name it "Multi-Output Device"

#### Create Aggregate Device:
1. In Audio MIDI Setup, click **+** → **Create Aggregate Device**
2. Check both:
   - Your microphone
   - BlackHole 2ch
3. Name it "Aggregate Device"

#### Set System Audio:
1. Go to **System Settings** → **Sound**
2. **Output**: Select "Multi-Output Device"
3. **Input**: Select "Aggregate Device"

### 5. Get Deepgram API Key
1. Sign up at [Deepgram](https://deepgram.com)
2. Get your API key from the dashboard
3. Create a `.env` file in the `real-time-subtitles` directory:
```bash
DEEPGRAM_API_KEY=your_api_key_here
```

## 🚀 Usage

### Start the Application
```bash
npm start
```

### Using the App
1. **Launch**: Run `npm start`
2. **Activate**: Press `Cmd+Shift+S` to toggle transcription
3. **View**: Subtitles appear in a translucent bar at the bottom of your screen
4. **Stop**: Press `Cmd+Shift+S` again to stop transcription

### Audio Sources
The app can capture audio from:
- 🎬 Video players (YouTube, Netflix, etc.)
- 📞 Video calls (Zoom, Teams, etc.)
- 🎵 Music applications
- 🎮 Games
- 📱 Any system audio

## 🏗️ Technical Architecture

### Core Components
- **Electron Main Process**: Window management, global hotkeys, Deepgram integration
- **Renderer Process**: Web Audio API, UI rendering, audio capture
- **Audio Handler**: Web Audio API implementation with device detection and resampling
- **Deepgram Client**: Real-time transcription using Nova-3 model

### Audio Pipeline
```
System Audio → BlackHole → Aggregate Device → Web Audio API → Resampling (48kHz→16kHz) → Deepgram Nova-3 → Subtitles
```

### Key Technologies
- **Electron**: Cross-platform desktop app framework
- **Web Audio API**: Browser-based audio processing
- **BlackHole**: Virtual audio driver for macOS
- **Deepgram Nova-3**: State-of-the-art speech recognition model
- **WebSockets**: Real-time communication with Deepgram

## 🎛️ Configuration

### Audio Settings
The app automatically detects and configures:
- Sample rate conversion (48kHz system → 16kHz Deepgram)
- Device selection (prioritizes Aggregate Device)
- Audio level monitoring and threshold detection

### Deepgram Settings
Default transcription parameters:
- **Model**: Nova-3 (latest generation)
- **Language**: Multi-language auto-detection
- **Sample Rate**: 16kHz
- **Encoding**: Linear16
- **Channels**: 1 (mono)
- **Interim Results**: Enabled for real-time updates

## 🔧 Troubleshooting

### Common Issues

**"No audio detected"**
- Verify BlackHole is installed and running
- Check that Aggregate Device is selected as system input
- Ensure Multi-Output Device is selected as system output
- Try speaking louder or playing audio

**"Deepgram connection failed"**
- Verify your API key in `.env` file
- Check internet connection
- Ensure Deepgram API key has sufficient credits

**"Permission denied for microphone"**
- Grant microphone permissions to the app
- Check macOS Privacy & Security settings

**"Subtitles not appearing"**
- Try toggling with `Cmd+Shift+S`
- Check that the subtitle window isn't hidden
- Restart the application

### Debug Mode
To enable detailed logging:
1. Uncomment the DevTools line in `src/main.js`
2. Open Developer Tools to see detailed audio analysis
3. Check console for device detection and audio levels

## 🛣️ Development

### Project Structure
```
real-time-subtitles/
├── src/
│   ├── main.js          # Electron main process
│   ├── renderer.js      # Renderer process logic
│   ├── audio-handler.js # Web Audio API implementation
│   ├── deepgram-client.js # Deepgram integration
│   ├── index.html       # UI layout
│   └── styles.css       # UI styling
├── package.json
├── .env                 # API keys (not in repo)
└── README.md
```

### Development Commands
```bash
# Start development server
npm start

# Install new dependencies
npm install <package-name>

# Debug audio issues
# (uncomment DevTools line in main.js)
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Deepgram](https://deepgram.com) for the excellent speech recognition API
- [BlackHole](https://github.com/ExistentialAudio/BlackHole) for the virtual audio driver
- [Electron](https://electronjs.org) for the cross-platform framework

## 📞 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the project's issue tracker
3. Ensure all setup steps are completed correctly

---

**Note**: This project requires macOS for BlackHole audio routing. Windows and Linux versions would need alternative audio routing solutions. 