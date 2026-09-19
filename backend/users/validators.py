import re

from django.core.exceptions import ValidationError


class StrongPasswordValidator:
    """Enforce a strong password during account creation.

    Rules (all required):
    - At least 8 characters (also covered by MinimumLengthValidator,
      repeated here so the message is explicit on this field)
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    """

    SPECIAL_CHARS = "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?`~"

    def validate(self, password, user=None):
        errors = []
        if len(password) < 8:
            errors.append("Password must be at least 8 characters long.")
        if not re.search(r"[A-Z]", password):
            errors.append("Password must contain at least one uppercase letter (A-Z).")
        if not re.search(r"[a-z]", password):
            errors.append("Password must contain at least one lowercase letter (a-z).")
        if not re.search(r"[0-9]", password):
            errors.append("Password must contain at least one digit (0-9).")
        if not any(c in self.SPECIAL_CHARS for c in password):
            errors.append(
                "Password must contain at least one special character "
                f"({self.SPECIAL_CHARS})."
            )
        if errors:
            raise ValidationError(errors)

    def get_help_text(self):
        return (
            "Your password must be at least 8 characters long and contain "
            "an uppercase letter, a lowercase letter, a digit, "
            "and a special character."
        )
