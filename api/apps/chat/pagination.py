from rest_framework.pagination import CursorPagination


class MessageCursorPagination(CursorPagination):
    page_size = 30
    ordering = "-timestamp"
    page_size_query_param = "limit"
    max_page_size = 100
