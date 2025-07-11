const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const dotenv = require("dotenv");
dotenv.config();

class DeepgramClient {
  constructor() {
    this.client = createClient(process.env.DEEPGRAM_API_KEY);
    this.connection = null;
    this.keepAlive = null;
  }

  connect(onTranscript, onError) {
    const connectionParams = {
      smart_format: true,
      model: "nova-3", 
      language: "multi",
      interim_results: true,
      endpointing: 300,
      utterance_end_ms: 1000,
      channels: 1,
      sample_rate: 16000,
      encoding: "linear16"
    };
    
    console.log("deepgram: connecting with params:", connectionParams);
    this.connection = this.client.listen.live(connectionParams);

    // Setup keepalive (from starter)
    if (this.keepAlive) clearInterval(this.keepAlive);
    this.keepAlive = setInterval(() => {
      console.log("deepgram: keepalive");
      this.connection.keepAlive();
    }, 10 * 1000);

    // Event listeners from starter
    this.connection.addListener(LiveTranscriptionEvents.Open, async () => {
      console.log("deepgram: connected successfully");
      console.log("deepgram: connection state:", this.connection.getReadyState());
    });

    this.connection.addListener(LiveTranscriptionEvents.Transcript, (data) => {
      console.log("deepgram: transcript received:", data.channel?.alternatives?.[0]?.transcript || 'no transcript');
      onTranscript(data);
    });

    this.connection.addListener(LiveTranscriptionEvents.Close, async (event) => {
      console.log("deepgram: disconnected");
      console.log("deepgram: close event details:", event);
      console.log("deepgram: connection state:", this.connection?.getReadyState());
      clearInterval(this.keepAlive);
      if (this.connection) {
        this.connection.finish();
      }
    });

    this.connection.addListener(LiveTranscriptionEvents.Error, async (error) => {
      console.log("deepgram: error received:", error);
      console.log("deepgram: error type:", typeof error);
      onError(error);
    });

    this.connection.addListener(LiveTranscriptionEvents.Warning, async (warning) => {
      console.log("deepgram: warning received:", warning);
    });

    this.connection.addListener(LiveTranscriptionEvents.Metadata, (metadata) => {
      console.log("deepgram: metadata received:", metadata);
    });

    return this.connection;
  }

  sendAudio(audioData) {
    if (this.connection && this.connection.getReadyState() === 1) {
      console.log('DeepgramClient: Sending audio data, size:', audioData.byteLength || audioData.length);
      this.connection.send(audioData);
    } else {
      console.log('DeepgramClient: Cannot send audio, connection state:', this.connection?.getReadyState());
    }
  }

  disconnect() {
    if (this.connection) {
      this.connection.finish();
      this.connection.removeAllListeners();
      this.connection = null;
    }
    if (this.keepAlive) {
      clearInterval(this.keepAlive);
      this.keepAlive = null;
    }
  }
}

module.exports = DeepgramClient;
