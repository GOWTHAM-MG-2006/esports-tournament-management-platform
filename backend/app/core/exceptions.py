from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """
    Custom exception handler that wraps DRF error responses in the standard
    envelope format: {"success": false, "data": null, "message": "..."}
    """
    response = exception_handler(exc, context)

    if response is not None:
        data = response.data
        message = None

        if isinstance(data, dict):
            if 'detail' in data:
                message = str(data['detail'])
            elif 'non_field_errors' in data:
                message = str(data['non_field_errors'])
            else:
                # For field errors, join them into a message
                messages = []
                for field, errors in data.items():
                    if isinstance(errors, list):
                        messages.append(f"{field}: {', '.join(str(e) for e in errors)}")
                    else:
                        messages.append(f"{field}: {str(errors)}")
                message = '; '.join(messages) if messages else str(data)
        elif isinstance(data, list):
            message = '; '.join(str(item) for item in data)
        else:
            message = str(data)

        response.data = {
            'success': False,
            'data': None,
            'message': message,
        }

    return response
