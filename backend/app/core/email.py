"""Email notification helpers (Phase 1 stub, Day 17 wiring).

Dev uses the console backend (see settings EMAIL_BACKEND); prod switches to
SMTP via env vars. Callers: tournament registration + match result flows.
"""
from django.conf import settings
from django.core.mail import send_mail


def notify_match_scheduled(to_email, match_label):
    if not to_email:
        return
    send_mail(
        subject=f'Match scheduled: {match_label}',
        message=f'Your match ({match_label}) has been scheduled. Good luck!',
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[to_email],
        fail_silently=True,
    )


def notify_result_posted(to_email, match_label, winner_name):
    if not to_email:
        return
    send_mail(
        subject=f'Result posted: {match_label}',
        message=f'Result for {match_label} is in. Winner: {winner_name}.',
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[to_email],
        fail_silently=True,
    )
