# Hardware Academy X

## Start the website and database server

The server requires Python 3 and uses only Python's standard library. From the project root, open a terminal and run:

```powershell
py Other/server.py
```

If the `py` command is unavailable, use:

```powershell
python Other/server.py
```

When the terminal prints `Website server running at http://127.0.0.1:4500`, open the pages at:

- Main page: http://127.0.0.1:4500/Pages/index.html
- Desktop tutorials: http://127.0.0.1:4500/Pages/desktop.html
- Laptop tutorials: http://127.0.0.1:4500/Pages/laptop.html
- Phone tutorials: http://127.0.0.1:4500/Pages/phone.html
- Software tutorials: http://127.0.0.1:4500/Pages/software.html
- Video Hub: http://127.0.0.1:4500/Admin/VideoHub.html

Keep the terminal running while using the website. In the Video Hub, use **Add Video** to add a tutorial. The server saves updates to `Other/TutorialDataBase.json`.

To stop the server, focus its terminal and press `Ctrl+C`.

## Configure tutorial types and categories

Edit `Other/TypeList.json` to add or remove tutorial types. Edit `Other/CategoriesList.json` to set the categories for each type. Edit `Other/DeviceList.json` to set the Hardware device destinations. Every type in `TypeList.json` needs a matching key with a category array in `CategoriesList.json`. The add-video form, filters, and server validation all use these files.