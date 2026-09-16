import hashlib
import hmac
import logging
import secrets
from datetime import timedelta

from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import EmailOTP, User

logger = logging.getLogger(__name__)

OTP_TTL = timedelta(minutes=10)
OTP_MAX_ATTEMPTS = 5


def _hash_code(code):
    return hashlib.sha256(code.encode()).hexdigest()


def _tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return {
        'user': {'id': user.id, 'email': user.email, 'username': user.username, 'role': user.role},
        'tokens': {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }
    }


class AuthService:
    @staticmethod
    def register(email, username, password):
        # Account starts inactive — it activates only after OTP verification.
        user = User.objects.create_user(
            email=email, username=username, password=password, is_active=False
        )
        logger.info('User registered (pending verification): %s', email)
        AuthService.issue_otp(user)
        return {
            'message': 'Account created. Please verify the 6-digit code sent to your email.',
            'email': user.email,
        }

    @staticmethod
    def issue_otp(user):
        """Create a fresh OTP (invalidating older unused ones) and email it. Returns the raw code."""
        from app.core.email import send_otp_email
        EmailOTP.objects.filter(user=user, used=False).update(used=True)
        code = ''.join(secrets.choice('0123456789') for _ in range(6))
        EmailOTP.objects.create(
            user=user,
            code_hash=_hash_code(code),
            expires_at=timezone.now() + OTP_TTL,
        )
        try:
            send_otp_email(user.email, code)
        except Exception:
            logger.exception('Failed to send OTP email to %s', user.email)
        return code

    @staticmethod
    def verify_otp(email, code):
        """Validate an OTP; on success activates the user and returns user + tokens."""
        user = User.objects.filter(email=email).first()
        if not user:
            raise ValueError('Invalid email or code.')
        if user.is_active:
            raise ValueError('Email is already verified. Please log in.')
        otp = user.email_otps.filter(used=False).order_by('-created_at').first()
        if not otp:
            raise ValueError('No verification code found. Please request a new one.')
        if timezone.now() > otp.expires_at:
            raise ValueError('Code expired. Please request a new one.')
        if otp.attempts >= OTP_MAX_ATTEMPTS:
            raise ValueError('Too many incorrect attempts. Please request a new code.')
        if not hmac.compare_digest(_hash_code(code), otp.code_hash):
            otp.attempts += 1
            otp.save(update_fields=['attempts'])
            raise ValueError('Incorrect code.')
        otp.used = True
        otp.save(update_fields=['used'])
        user.is_active = True
        user.save(update_fields=['is_active'])
        logger.info('Email verified: %s', email)
        return _tokens_for(user)

    @staticmethod
    def resend_otp(email):
        user = User.objects.filter(email=email).first()
        if not user:
            raise ValueError('No account found for this email.')
        if user.is_active:
            raise ValueError('Email is already verified. Please log in.')
        AuthService.issue_otp(user)
        # Include the email so the response envelope always carries a
        # non-null data payload (a message-only body renders as data: null).
        return {
            'message': 'A new verification code has been sent to your email.',
            'email': user.email,
        }

    @staticmethod
    def login(email, password):
        from django.contrib.auth import authenticate
        user = authenticate(email=email, password=password)
        if not user:
            # authenticate() also rejects inactive users — distinguish
            # "wrong credentials" from "correct password, email unverified".
            try:
                candidate = User.objects.get(email=email)
            except User.DoesNotExist:
                candidate = None
            if candidate is not None and not candidate.is_active and candidate.check_password(password):
                logger.warning('Login blocked (unverified email): %s', email)
                return {'unverified': True, 'email': candidate.email}
            logger.warning('Failed login attempt: %s', email)
            return None
        logger.info('User logged in: %s', email)
        return _tokens_for(user)

    @staticmethod
    def get_user_data(user):
        return {'id': user.id, 'email': user.email, 'username': user.username, 'role': user.role}
