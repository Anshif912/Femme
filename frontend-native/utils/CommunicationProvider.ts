import { Linking, Platform } from 'react-native';
import * as SMS from 'expo-sms';
import * as Notifications from 'expo-notifications';

// Configured local notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Interfaces
export interface IEmergencyPayload {
  userName: string;
  latitude: number;
  longitude: number;
  cabNumber: string;
  provider: string;
  pickupAddress: string;
  destAddress: string;
  timestamp: string;
  status: string;
}

export interface ISmsProvider {
  sendSms(phones: string[], message: string): Promise<{ success: boolean; method: 'direct' | 'composer' | 'failed' }>;
}

export interface ICallProvider {
  makeCall(phone: string): Promise<boolean>;
}

export interface IWhatsAppProvider {
  sendWhatsApp(phone: string, message: string): Promise<boolean>;
}

export interface IPushNotificationProvider {
  sendPush(title: string, body: string): Promise<boolean>;
}

// 1. NativeSmsProvider Implementation
export class NativeSmsProvider implements ISmsProvider {
  async sendSms(phones: string[], message: string): Promise<{ success: boolean; method: 'direct' | 'composer' | 'failed' }> {
    try {
      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable && phones.length > 0) {
        // Expo SMS composer opens native SMS app with pre-filled content and recipients
        const { result } = await SMS.sendSMSAsync(phones, message);
        if (result === 'sent') {
          return { success: true, method: 'composer' };
        } else if (result === 'cancelled') {
          return { success: false, method: 'failed' };
        }
        return { success: true, method: 'composer' }; // Android doesn't always return 'sent' status depending on SMS client
      } else {
        // Fallback to direct URI deep linking if SMS API is not loaded
        const phoneString = phones.join(Platform.OS === 'ios' ? ',' : ';');
        const url = `sms:${phoneString}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(message)}`;
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
          return { success: true, method: 'composer' };
        }
      }
    } catch (err) {
      console.error('[NativeSmsProvider] Error sending SMS:', err);
    }
    return { success: false, method: 'failed' };
  }
}

// 2. NativeCallProvider Implementation
export class NativeCallProvider implements ICallProvider {
  async makeCall(phone: string): Promise<boolean> {
    try {
      const cleanPhone = phone.replace(/\s+/g, '');
      const url = `tel:${cleanPhone}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }
    } catch (err) {
      console.error('[NativeCallProvider] Error launching phone call:', err);
    }
    return false;
  }
}

// 3. WhatsAppProvider Implementation
export class WhatsAppProvider implements IWhatsAppProvider {
  async sendWhatsApp(phone: string, message: string): Promise<boolean> {
    try {
      const cleanPhone = phone.replace(/\s+/g, '').replace('+', '');
      // Deep link to specific contact or generic send sheet
      const url = cleanPhone 
        ? `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
        : `whatsapp://send?text=${encodeURIComponent(message)}`;
        
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      } else {
        // Fallback to web link if WhatsApp client app is missing
        const webUrl = cleanPhone
          ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
          : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        await Linking.openURL(webUrl);
        return true;
      }
    } catch (err) {
      console.error('[WhatsAppProvider] Error launching WhatsApp link:', err);
    }
    return false;
  }
}

// 4. PushNotificationProvider Implementation
export class PushNotificationProvider implements IPushNotificationProvider {
  async sendPush(title: string, body: string): Promise<boolean> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Send immediately
      });
      return true;
    } catch (err) {
      console.error('[PushNotificationProvider] Local notification failed:', err);
    }
    return false;
  }
}

// Main Communications Orchestrator
export class CommunicationProvider {
  private smsProvider: ISmsProvider;
  private callProvider: ICallProvider;
  private whatsappProvider: IWhatsAppProvider;
  private pushProvider: IPushNotificationProvider;

  constructor() {
    this.smsProvider = new NativeSmsProvider();
    this.callProvider = new NativeCallProvider();
    this.whatsappProvider = new WhatsAppProvider();
    this.pushProvider = new PushNotificationProvider();
  }

  // Format the emergency notification text
  formatEmergencyMessage(payload: IEmergencyPayload): string {
    const mapsLink = `https://maps.google.com/?q=${payload.latitude},${payload.longitude}`;
    return `🚨 FEMME EMERGENCY ALERT\n\nUser:\n${payload.userName}\n\nLocation:\n${mapsLink}\n\nCab:\n${payload.cabNumber || 'Unknown'}\n\nTime:\n${payload.timestamp}\n\nEmergency detected. Possible danger. Please check link and contact immediately.`;
  }

  // Send native SMS to all trusted contacts
  async dispatchSmsToGuardians(phones: string[], payload: IEmergencyPayload): Promise<{ success: boolean; method: string }> {
    if (phones.length === 0) {
      return { success: false, method: 'failed' };
    }
    const message = this.formatEmergencyMessage(payload);
    return this.smsProvider.sendSms(phones, message);
  }

  // Initiate call to target phone
  async initiateCall(phone: string): Promise<boolean> {
    return this.callProvider.makeCall(phone);
  }

  // Compose WhatsApp distress message to specific contact
  async dispatchWhatsApp(phone: string, payload: IEmergencyPayload): Promise<boolean> {
    const message = this.formatEmergencyMessage(payload);
    return this.whatsappProvider.sendWhatsApp(phone, message);
  }

  // Fire local push notification banner
  async triggerLocalAlert(userName: string): Promise<boolean> {
    return this.pushProvider.sendPush(
      "🚨 FEMME Emergency Safety Protocol Activated",
      `Distress mode triggered for ${userName}. Guardians are being contacted.`
    );
  }
}

export const commsProvider = new CommunicationProvider();
