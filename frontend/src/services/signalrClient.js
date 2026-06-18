import * as signalR from '@microsoft/signalr';

class SignalRClient {
  constructor() {
    this.connection = null;
    this.sessionId = null;
  }

  async connect(sessionId) {
    if (this.connection) {
      await this.disconnect();
    }

    this.sessionId = sessionId;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${baseUrl}/hubs/analysis`)
      .withAutomaticReconnect()
      .build();

    try {
      await this.connection.start();
      console.log('SignalR Connected.');
      
      // Join the session group to receive targeted telemetry
      await this.connection.invoke('JoinSessionGroup', this.sessionId);
    } catch (err) {
      console.error('SignalR Connection Error: ', err);
    }
  }

  onTelemetryReceived(callback) {
    if (!this.connection) return;
    // The backend broadcasts to "ReceiveTelemetry"
    this.connection.on('ReceiveTelemetry', (message) => {
      callback(message);
    });
  }
  
  onSystemMessage(callback) {
    if (!this.connection) return;
    this.connection.on('ReceiveSystemMessage', (message) => {
      callback(message);
    });
  }

  async disconnect() {
    if (this.connection) {
      try {
        if (this.sessionId) {
          await this.connection.invoke('LeaveSessionGroup', this.sessionId);
        }
        await this.connection.stop();
        this.connection = null;
      } catch (err) {
        console.error('Error disconnecting SignalR: ', err);
      }
    }
  }
}

const signalrClient = new SignalRClient();
export default signalrClient;
