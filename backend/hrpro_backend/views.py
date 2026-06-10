from pathlib import Path
from django.conf import settings
from django.http import FileResponse, Http404


def frontend_spa(request):
    """Serve the React SPA index.html for client-side routing."""
    frontend_dirs = getattr(settings, "STATICFILES_DIRS", [])
    for d in frontend_dirs:
        index = Path(d) / "index.html"
        if index.exists():
            return FileResponse(open(index, "rb"))
    raise Http404("Frontend build not found. Run `npm run build` in frontend/ first.")
