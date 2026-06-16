import re
from typing import Optional

def format_to_e164(phone: str) -> Optional[str]:
    """
    Cleans and converts a phone number string to E.164 format.
    E.g. 9876543210 -> +919876543210
    """
    if not phone:
        return None
        
    # Remove non-digits except leading '+'
    cleaned = re.sub(r'(?<!^)\+|[^\d+]', '', phone.strip())
    
    if not cleaned:
        return None
        
    if cleaned.startswith('+'):
        # E.164 format is + followed by 10 to 15 digits
        if 10 <= len(cleaned) <= 16:
            return cleaned
        return None
        
    # Strip leading zeros
    cleaned_digits = cleaned.lstrip('0')
    
    if len(cleaned_digits) == 10:
        # Indian mobile fallback
        return f"+91{cleaned_digits}"
    elif len(cleaned_digits) == 12 and cleaned_digits.startswith('91'):
        # E.g. 919876543210 -> +919876543210
        return f"+{cleaned_digits}"
    elif 10 <= len(cleaned_digits) <= 15:
        # Generic country code without +
        return f"+{cleaned_digits}"
        
    return None
