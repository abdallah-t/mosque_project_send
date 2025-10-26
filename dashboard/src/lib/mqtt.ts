import mqtt, { MqttClient } from 'mqtt';

export interface MqttConfig {
  brokerUrl: string;
  options?: mqtt.IClientOptions;
}

export class MqttService {
  private client: MqttClient | null = null;
  private messageHandlers: Map<string, (message: string, topic: string) => void> = new Map();
  // Queue publishes that occur before the client is connected
  private pendingPublishes: Array<{ topic: string; message: string }> = [];

  connect(config: MqttConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.client = mqtt.connect(config.brokerUrl, {
          ...config.options,
          reconnectPeriod: 5000,
          connectTimeout: 30000,
        });

        this.client.on('connect', () => {
          console.log('MQTT Connected to broker:', config.brokerUrl);
          // Flush any pending publishes that were queued while disconnected
          if (this.pendingPublishes.length > 0) {
            console.log(`MQTT: Flushing ${this.pendingPublishes.length} pending publish(es)`);
            this.pendingPublishes.forEach(p => {
              this.client?.publish(p.topic, p.message, (err) => {
                if (err) console.error('Publish error (queued):', err);
                else console.log('Published (queued) to', p.topic, ':', p.message);
              });
            });
            this.pendingPublishes = [];
          }
          resolve();
        });

        this.client.on('error', (error) => {
          console.error('MQTT Error:', error);
          reject(error);
        });

        this.client.on('message', (topic, message) => {
          // Check all subscribed patterns to find matching handlers
          this.messageHandlers.forEach((handler, pattern) => {
            if (this.topicMatches(pattern, topic)) {
              handler(message.toString(), topic);
            }
          });
        });

        this.client.on('offline', () => {
          console.log('MQTT Client offline');
        });

        this.client.on('reconnect', () => {
          console.log('MQTT Reconnecting...');
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Helper function to match MQTT topic patterns with wildcards
  private topicMatches(pattern: string, topic: string): boolean {
    // Convert MQTT wildcards to regex
    // + matches single level
    // # matches multiple levels
    const regexPattern = pattern
      .replace(/\+/g, '[^/]+')
      .replace(/#/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(topic);
  }

  subscribe(topic: string, handler: (message: string, topic: string) => void): void {
    if (!this.client) {
      console.error('MQTT client not connected');
      return;
    }

    this.client.subscribe(topic, (err) => {
      if (err) {
        console.error('Subscribe error:', err);
      } else {
        console.log('Subscribed to:', topic);
        this.messageHandlers.set(topic, handler);
      }
    });
  }

  publish(topic: string, message: string): void {
    if (!this.client || !this.client.connected) {
      // Queue the publish to be sent once connected
      console.warn('MQTT client not connected, queuing publish for', topic);
      this.pendingPublishes.push({ topic, message });
      return;
    }

    this.client.publish(topic, message, (err) => {
      if (err) {
        console.error('Publish error:', err);
      } else {
        console.log('Published to', topic, ':', message);
      }
    });
  }

  unsubscribe(topic: string): void {
    if (!this.client) return;
    
    this.client.unsubscribe(topic);
    this.messageHandlers.delete(topic);
  }

  disconnect(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.messageHandlers.clear();
    }
  }

  isConnected(): boolean {
    return this.client?.connected || false;
  }
}

export const mqttService = new MqttService();
