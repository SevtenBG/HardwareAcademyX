import json
import os
import tempfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

PROJECT_ROOT = Path(__file__).resolve().parent.parent
OTHER_DIRECTORY = Path(__file__).resolve().parent
DATABASE_PATH = OTHER_DIRECTORY / "TutorialDataBase.json"
TYPE_LIST_PATH = OTHER_DIRECTORY / "TypeList.json"
CATEGORIES_LIST_PATH = OTHER_DIRECTORY / "CategoriesList.json"
DEVICE_LIST_PATH = OTHER_DIRECTORY / "DeviceList.json"
MAX_REQUEST_SIZE = 1_048_576


class WebsiteRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PROJECT_ROOT), **kwargs)

    def do_POST(self):
        if urlsplit(self.path).path != "/api/tutorials":
            self._send_json(404, {"error": "Not found."})
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._send_json(400, {"error": "Invalid content length."})
            return

        if content_length <= 0 or content_length > MAX_REQUEST_SIZE:
            self._send_json(413, {"error": "Request body is empty or too large."})
            return

        try:
            payload = json.loads(self.rfile.read(content_length).decode("utf-8"))
            tutorials = self._validate_database(payload)
        except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as error:
            self._send_json(400, {"error": str(error)})
            return

        database = {"tutorials": tutorials}
        temporary_path = None
        try:
            with tempfile.NamedTemporaryFile(
                "w", encoding="utf-8", dir=OTHER_DIRECTORY, prefix=".tutorial-database-", suffix=".tmp", delete=False
            ) as temporary_file:
                temporary_path = Path(temporary_file.name)
                json.dump(database, temporary_file, indent=2, ensure_ascii=False)
                temporary_file.write("\n")
            os.replace(temporary_path, DATABASE_PATH)
        except OSError as error:
            self._send_json(500, {"error": f"Could not write the tutorial database: {error}"})
            return
        finally:
            if temporary_path and temporary_path.exists():
                temporary_path.unlink()

        self._send_json(200, {"saved": len(tutorials)})

    @staticmethod
    def _validate_database(payload):
        if not isinstance(payload, dict) or not isinstance(payload.get("tutorials"), list):
            raise ValueError("Database must contain a tutorials array.")

        try:
            tutorial_types = json.loads(TYPE_LIST_PATH.read_text(encoding="utf-8"))
            categories_by_type = json.loads(CATEGORIES_LIST_PATH.read_text(encoding="utf-8"))
            devices = json.loads(DEVICE_LIST_PATH.read_text(encoding="utf-8"))
            saved_database = json.loads(DATABASE_PATH.read_text(encoding="utf-8")) if DATABASE_PATH.exists() else {"tutorials": []}
        except (OSError, json.JSONDecodeError) as error:
            raise ValueError(f"Could not load tutorial configuration or database: {error}") from error

        if not isinstance(tutorial_types, list) or not tutorial_types or any(not isinstance(item, str) or not item.strip() for item in tutorial_types):
            raise ValueError("TypeList.json must contain a non-empty array of type names.")
        if not isinstance(categories_by_type, dict) or any(
            tutorial_type not in categories_by_type for tutorial_type in tutorial_types
        ):
            raise ValueError("CategoriesList.json must provide a category array for each type.")
        if any(
            not isinstance(categories_by_type[tutorial_type], list)
            or any(not isinstance(category, str) or not category.strip() for category in categories_by_type[tutorial_type])
            for tutorial_type in tutorial_types
        ):
            raise ValueError("CategoriesList.json must contain arrays of category names.")
        if not isinstance(devices, list) or not devices or any(not isinstance(device, str) or not device.strip() for device in devices):
            raise ValueError("DeviceList.json must contain a non-empty array of device names.")
        if not isinstance(saved_database, dict) or not isinstance(saved_database.get("tutorials"), list):
            raise ValueError("The saved database must contain a tutorials array.")

        saved_tutorials = {
            item.get("tutorialId"): item
            for item in saved_database["tutorials"]
            if isinstance(item, dict) and isinstance(item.get("tutorialId"), str)
        }

        tutorials = []
        identifiers = set()
        for tutorial in payload["tutorials"]:
            if not isinstance(tutorial, dict):
                raise ValueError("Each tutorial must be an object.")

            tutorial_id = tutorial.get("tutorialId")
            video_url = tutorial.get("videoUrl")
            name = tutorial.get("name")
            description = tutorial.get("description")
            steps = tutorial.get("stepsGuide")
            tutorial_type = tutorial.get("type", tutorial_types[0])
            if not all(isinstance(value, str) and value.strip() for value in (tutorial_id, video_url, name, description)):
                raise ValueError("Tutorial ID, video URL, name, and description are required.")
            if tutorial_type not in tutorial_types:
                raise ValueError(f"Tutorial type must be one of: {', '.join(tutorial_types)}.")
            saved_tutorial = saved_tutorials.get(tutorial_id)
            allowed_categories = categories_by_type[tutorial_type]
            category = tutorial.get("category")
            if category is None:
                category = saved_tutorial.get("category", allowed_categories[0] if allowed_categories else None) if saved_tutorial else (allowed_categories[0] if allowed_categories else None)
            is_legacy_hardware_general = (
                tutorial_type == "Hardware"
                and category == "General"
                and saved_tutorial is not None
                and saved_tutorial.get("type", "Hardware") == "Hardware"
                and saved_tutorial.get("category", "General") == "General"
            )
            if category not in allowed_categories and not is_legacy_hardware_general:
                raise ValueError(f"{category} is not a valid category for {tutorial_type} tutorials.")
            device = tutorial.get("device")
            if tutorial_type == "Hardware":
                if device is None and saved_tutorial:
                    device = saved_tutorial.get("device")
                device = device or devices[0]
                if device not in devices:
                    raise ValueError(f"{device} is not a valid Hardware device.")
            else:
                if device not in (None, ""):
                    raise ValueError("Software tutorials cannot have a Hardware device.")
                device = None
            if tutorial_id in identifiers:
                raise ValueError(f"Duplicate tutorial ID: {tutorial_id}")
            parsed_url = urlsplit(video_url)
            if parsed_url.scheme not in ("http", "https") or not parsed_url.netloc:
                raise ValueError(f"Tutorial {tutorial_id} has an invalid video URL.")
            if not isinstance(steps, list) or not steps or any(not isinstance(step, str) or not step.strip() for step in steps):
                raise ValueError(f"Tutorial {tutorial_id} must contain at least one non-empty step.")

            identifiers.add(tutorial_id)
            tutorials.append({
                "tutorialId": tutorial_id.strip(),
                "videoUrl": video_url.strip(),
                "name": name.strip(),
                "description": description.strip(),
                "stepsGuide": [step.strip() for step in steps],
                "type": tutorial_type,
                "category": category,
                "device": device,
            })

        return tutorials

    def _send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 4500), WebsiteRequestHandler)
    print("Website server running at http://127.0.0.1:4500")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
