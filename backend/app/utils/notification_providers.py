import os
import requests
import json
from typing import Optional
from app.config import settings

def log_provider_status(provider_name: str, event_type: str, message: str, data: Optional[dict] = None):
    """
    Detailed logs for application console and Android Logcat / server prints.
    """
    formatted_data = f" | Data: {json.dumps(data)}" if data else ""
    print(event_type)  # Exact log requirement
    print(f"[PROVIDER_LOG] [{provider_name}] [{event_type}] {message}{formatted_data}")

class BaseNotificationProvider:
    def send_sms(self, phone: str, message: str) -> bool:
        raise NotImplementedError()
        
    def make_voice_call(self, phone: str, speech_text: str) -> bool:
        raise NotImplementedError()

# 1. Twilio Implementation
class TwilioProvider(BaseNotificationProvider):
    def __init__(self, account_sid: str, auth_token: str, from_number: str):
        self.account_sid = account_sid
        self.auth_token = auth_token
        self.from_number = from_number
        
    def send_sms(self, phone: str, message: str) -> bool:
        log_provider_status("TWILIO", "SMS_PROVIDER_STARTED", f"Sending SMS to {phone}")
        try:
            from twilio.rest import Client
            client = Client(self.account_sid, self.auth_token)
            msg = client.messages.create(
                body=message,
                from_=self.from_number,
                to=phone
            )
            log_provider_status("TWILIO", "SMS_PROVIDER_SUCCESS", f"SMS delivered successfully to {phone}", {"sid": msg.sid})
            return True
        except Exception as e:
            log_provider_status("TWILIO", "SMS_PROVIDER_FAILURE", f"SMS failed to deliver to {phone}", {"error": str(e)})
            return False

    def make_voice_call(self, phone: str, speech_text: str) -> bool:
        log_provider_status("TWILIO", "CALL_PROVIDER_STARTED", f"Placing voice call to {phone}")
        try:
            from twilio.rest import Client
            client = Client(self.account_sid, self.auth_token)
            twiml_content = f"<Response><Say voice='alice'>{speech_text}</Say></Response>"
            call = client.calls.create(
                to=phone,
                from_=self.from_number,
                twiml=twiml_content
            )
            log_provider_status("TWILIO", "CALL_PROVIDER_SUCCESS", f"Voice call placed successfully to {phone}", {"sid": call.sid})
            return True
        except Exception as e:
            log_provider_status("TWILIO", "CALL_PROVIDER_FAILURE", f"Voice call failed for {phone}", {"error": str(e)})
            return False

# 2. Exotel Implementation
class ExotelProvider(BaseNotificationProvider):
    def __init__(self, api_key: str, api_token: str, exotel_sid: str, caller_id: str):
        self.api_key = api_key
        self.api_token = api_token
        self.exotel_sid = exotel_sid
        self.caller_id = caller_id
        
    def send_sms(self, phone: str, message: str) -> bool:
        log_provider_status("EXOTEL", "SMS_PROVIDER_STARTED", f"Sending SMS to {phone}")
        url = f"https://api.exotel.com/v1/Accounts/{self.exotel_sid}/Sms/send.json"
        payload = {
            "From": self.caller_id,
            "To": phone,
            "Body": message
        }
        try:
            response = requests.post(url, auth=(self.api_key, self.api_token), data=payload, timeout=8)
            if response.status_code in [200, 201]:
                res_data = response.json()
                log_provider_status("EXOTEL", "SMS_PROVIDER_SUCCESS", f"SMS delivered successfully to {phone}", res_data)
                return True
            else:
                log_provider_status("EXOTEL", "SMS_PROVIDER_FAILURE", f"SMS failed with status {response.status_code}", {"response": response.text})
        except Exception as e:
            log_provider_status("EXOTEL", "SMS_PROVIDER_FAILURE", f"SMS request failed for {phone}", {"error": str(e)})
        return False

    def make_voice_call(self, phone: str, speech_text: str) -> bool:
        log_provider_status("EXOTEL", "CALL_PROVIDER_STARTED", f"Placing voice call to {phone}")
        url = f"https://api.exotel.com/v1/Accounts/{self.exotel_sid}/Calls/connect.json"
        
        # Exotel connects caller_id to phone, and plays audio from target Url
        # Standard Exotel TTS uses a simple response payload or a flow url
        twiml_xml = f"<Response><Say voice='alice'>{speech_text}</Say></Response>"
        payload = {
            "From": self.caller_id,
            "To": phone,
            "CallerId": self.caller_id,
            "Url": f"http://twimlets.com/echo?Twiml={requests.utils.quote(twiml_xml)}"
        }
        try:
            response = requests.post(url, auth=(self.api_key, self.api_token), data=payload, timeout=8)
            if response.status_code in [200, 201]:
                res_data = response.json()
                log_provider_status("EXOTEL", "CALL_PROVIDER_SUCCESS", f"Voice call connected successfully to {phone}", res_data)
                return True
            else:
                log_provider_status("EXOTEL", "CALL_PROVIDER_FAILURE", f"Call failed with status {response.status_code}", {"response": response.text})
        except Exception as e:
            log_provider_status("EXOTEL", "CALL_PROVIDER_FAILURE", f"Call request failed for {phone}", {"error": str(e)})
        return False

# 3. MSG91 Implementation
class MSG91Provider(BaseNotificationProvider):
    def __init__(self, auth_key: str, sender_id: str, sms_template_id: Optional[str] = None):
        self.auth_key = auth_key
        self.sender_id = sender_id
        self.sms_template_id = sms_template_id or "default_sos_flow"
        
    def send_sms(self, phone: str, message: str) -> bool:
        log_provider_status("MSG91", "SMS_PROVIDER_STARTED", f"Sending SMS to {phone}")
        url = "https://control.msg91.com/api/v5/flow/"
        headers = {
            "authkey": self.auth_key,
            "content-type": "application/json"
        }
        # Prefilled flows/templates
        payload = {
            "template_id": self.sms_template_id,
            "short_url": "1", # Auto shorten URL
            "recipients": [
                {
                    "mobiles": phone,
                    "message": message
                }
            ]
        }
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=8)
            if response.status_code == 200:
                res_data = response.json()
                log_provider_status("MSG91", "SMS_PROVIDER_SUCCESS", f"SMS delivered successfully to {phone}", res_data)
                return True
            else:
                log_provider_status("MSG91", "SMS_PROVIDER_FAILURE", f"SMS failed with status {response.status_code}", {"response": response.text})
        except Exception as e:
            log_provider_status("MSG91", "SMS_PROVIDER_FAILURE", f"SMS request failed for {phone}", {"error": str(e)})
        return False

    def make_voice_call(self, phone: str, speech_text: str) -> bool:
        log_provider_status("MSG91", "CALL_PROVIDER_STARTED", f"Placing voice call to {phone}")
        url = "https://api.msg91.com/api/v5/voice/send"
        headers = {
            "authkey": self.auth_key,
            "content-type": "application/json"
        }
        payload = {
            "to": phone,
            "sender": self.sender_id,
            "type": "tts",
            "content": speech_text
        }
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=8)
            if response.status_code == 200:
                res_data = response.json()
                log_provider_status("MSG91", "CALL_PROVIDER_SUCCESS", f"Voice call connected successfully to {phone}", res_data)
                return True
            else:
                log_provider_status("MSG91", "CALL_PROVIDER_FAILURE", f"Call failed with status {response.status_code}", {"response": response.text})
        except Exception as e:
            log_provider_status("MSG91", "CALL_PROVIDER_FAILURE", f"Call request failed for {phone}", {"error": str(e)})
        return False

# Factory to get configured provider based on environment variables
def get_configured_provider() -> Optional[BaseNotificationProvider]:
    # 1. Twilio check
    twilio_sid = os.getenv("TWILIO_ACCOUNT_SID") or settings.TWILIO_ACCOUNT_SID
    twilio_token = os.getenv("TWILIO_AUTH_TOKEN") or settings.TWILIO_AUTH_TOKEN
    twilio_phone = os.getenv("TWILIO_PHONE_NUMBER") or settings.TWILIO_PHONE_NUMBER or settings.TWILIO_FROM_NUMBER
    
    if twilio_sid and twilio_token and twilio_phone:
        return TwilioProvider(twilio_sid, twilio_token, twilio_phone)
        
    # 2. Exotel check
    exotel_key = os.getenv("EXOTEL_API_KEY")
    exotel_token = os.getenv("EXOTEL_API_TOKEN")
    exotel_sid = os.getenv("EXOTEL_SID")
    exotel_caller_id = os.getenv("EXOTEL_CALLER_ID")
    
    if exotel_key and exotel_token and exotel_sid and exotel_caller_id:
        return ExotelProvider(exotel_key, exotel_token, exotel_sid, exotel_caller_id)
        
    # 3. MSG91 check
    msg91_key = os.getenv("MSG91_AUTH_KEY")
    msg91_sender = os.getenv("MSG91_SENDER_ID", "FEMMEG")
    msg91_template = os.getenv("MSG91_TEMPLATE_ID")
    
    if msg91_key:
        return MSG91Provider(msg91_key, msg91_sender, msg91_template)
        
    return None
