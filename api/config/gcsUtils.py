from storages.backends.gcloud import GoogleCloudStorage

Media = lambda: GoogleCloudStorage(location="media")
Static = lambda: GoogleCloudStorage(location="static")
