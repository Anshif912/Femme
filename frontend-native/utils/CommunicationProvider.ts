import { Linking, Platform } from 'react-native';
import * as SMS from 'expo-sms';
import * as Notifications from 'expo-notifications';

// Helper to log to both React Native console and Android Logcat
export const logNative = (tag: string, message: string, data?: any) => {
  const formatted = `[FEMME_NATIVE] [${tag}] ${message} ${data ? JSON.stringify(data) : ''}`;
  console.log(formatted);
};

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

// 1. NativeSmsProvider Implementation with strict logs and direct URL launch fallbacks
export class NativeSmsProvider implements ISmsProvider {
  async sendSms(phones: string[], message: string): Promise<{ success: boolean; method: 'direct' | 'composer' | 'failed' }> {
    logNative('SMS_PROVIDER_STARTED', 'Initiating native SMS dispatch', { phones, messageLength: message.length });
    try {
      // 1. Check permissions / availability via Expo SMS manager
      const isAvailable = await SMS.isAvailableAsync();
      logNative('SMS_PROVIDER_INFO', 'Expo SMS availability check result', { isAvailable });

      if (isAvailable && phones.length > 0) {
        logNative('SMS_PROVIDER_INFO', 'Launching Expo SMS Composer activity UI', { phones });
        
        // This opens the Android native SMS composer prefilled
        const { result } = await SMS.sendSMSAsync(phones, message);
        logNative('SMS_PROVIDER_SUCCESS', 'Expo SMS Composer completed execution', { result });
        return { success: true, method: 'composer' };
      } else {
        // Fallback to direct URI deep linking if SMS API is not loaded
        logNative('SMS_PROVIDER_INFO', 'Expo SMS not available. Attempting direct deep-link fallback.');
        const phoneString = phones.join(Platform.OS === 'ios' ? ',' : ';');
        const url = `sms:${phoneString}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(message)}`;
        logNative('SMS_PROVIDER_INFO', 'Creating sms intent link', { url });
        
        // Direct launch bypasses package visibility queries block on Android 11+
        await Linking.openURL(url);
        logNative('SMS_PROVIDER_SUCCESS', 'Direct SMS deep link intent launched successfully');
        return { success: true, method: 'composer' };
      }
    } catch (err: any) {
      logNative('SMS_PROVIDER_FAILED', 'Failed to execute SMS dispatch', { error: err.message || err });
    }
    return { success: false, method: 'failed' };
  }
}

// 2. NativeCallProvider Implementation with strict logs and direct dialer intent
export class NativeCallProvider implements ICallProvider {
  async makeCall(phone: string): Promise<boolean> {
    logNative('CALL_PROVIDER_STARTED', 'Initiating native call dialer launcher', { phone });
    try {
      const cleanPhone = phone.replace(/\s+/g, '');
      const url = `tel:${cleanPhone}`;
      logNative('CALL_PROVIDER_INFO', 'Created calling intent URL', { url });
      
      // Direct launch bypasses package visibility queries block on Android 11+
      await Linking.openURL(url);
      logNative('CALL_PROVIDER_SUCCESS', 'Dialer intent launched successfully');
      return true;
    } catch (err: any) {
      logNative('CALL_PROVIDER_FAILED', 'Failed to launch call dialer', { error: err.message || err });
    }
    return false;
  }
}

// 3. WhatsAppProvider Implementation with strict logs and web deep link fallbacks
export class WhatsAppProvider implements IWhatsAppProvider {
  async sendWhatsApp(phone: string, message: string): Promise<boolean> {
    logNative('WHATSAPP_PROVIDER_STARTED', 'Initiating WhatsApp chat launch', { phone, messageLength: message.length });
    try {
      const cleanPhone = phone.replace(/\s+/g, '').replace('+', '');
      // Deep link to specific contact or general share sheet
      const url = cleanPhone 
        ? `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
        : `whatsapp://send?text=${encodeURIComponent(message)}`;
      logNative('WHATSAPP_PROVIDER_INFO', 'Created WhatsApp deep link intent URL', { url });
      
      try {
        await Linking.openURL(url);
        logNative('WHATSAPP_PROVIDER_SUCCESS', 'WhatsApp native client launched successfully');
        return true;
      } catch (e: any) {
        logNative('WHATSAPP_PROVIDER_INFO', 'WhatsApp native client app launch failed, trying web URL fallback', { error: e.message });
        const webUrl = cleanPhone
          ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
          : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        logNative('WHATSAPP_PROVIDER_INFO', 'Created WhatsApp web fallback link', { webUrl });
        await Linking.openURL(webUrl);
        logNative('WHATSAPP_PROVIDER_SUCCESS', 'WhatsApp web redirect launched successfully');
        return true;
      }
    } catch (err: any) {
      logNative('WHATSAPP_PROVIDER_FAILED', 'Failed to trigger WhatsApp integration', { error: err.message || err });
    }
    return false;
  }
}

// 4. PushNotificationProvider Implementation
export class PushNotificationProvider implements IPushNotificationProvider {
  async sendPush(title: string, body: string): Promise<boolean> {
    logNative('PUSH_PROVIDER_STARTED', 'Triggering local push notification', { title, body });
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
      logNative('PUSH_PROVIDER_SUCCESS', 'Local system alert pushed successfully');
      return true;
    } catch (err: any) {
      logNative('PUSH_PROVIDER_FAILED', 'Local notification failed', { error: err.message || err });
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
      logNative('COMMUNICATION_ORCHESTRATOR', 'SMS Dispatch skipped: No contacts provided.');
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
