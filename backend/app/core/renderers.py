from rest_framework.renderers import JSONRenderer


class ApiResponseRenderer(JSONRenderer):
    """
    Custom renderer that wraps all API responses in a standard envelope:
    {
        "success": true/false,
        "data": <payload>,
        "message": "<optional message>"
    }
    """

    def render(self, accepted_media_type=None, renderer_context=None):
        response = renderer_context.get('response', None)
        if response is None:
            return super().render(accepted_media_type, renderer_context)

        data = response.data

        # Determine success based on status code
        success = 200 <= response.status_code < 400

        # Extract message from data if present, otherwise use status text
        message = None
        payload = data

        if isinstance(data, dict):
            if 'detail' in data:
                message = str(data.pop('detail'))
                payload = data if data else None
            elif 'non_field_errors' in data:
                message = str(data.pop('non_field_errors'))
                payload = data if data else None
            elif 'message' in data:
                message = data.pop('message')
                payload = data if data else None

        envelope = {
            'success': success,
            'data': payload,
            'message': message,
        }

        renderer_context['response'].data = envelope
        return super().render(accepted_media_type, renderer_context)
