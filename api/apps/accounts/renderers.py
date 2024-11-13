from rest_framework import renderers
import json


class UserRenderer(renderers.JSONRenderer):
    charset = "utf-8"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        # Check if the response is an error
        if "ErrorDetail" in str(data):
            # Wrap the error response under the 'errors' key
            response = json.dumps({"errors": data})
        else:
            # For successful responses, serialize the data as is
            response = json.dumps(data)
        return response
