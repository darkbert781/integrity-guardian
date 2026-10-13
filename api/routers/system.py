from fastapi import APIRouter
import os
import platform

router = APIRouter(prefix="/system", tags=["system"])

@router.get("/drives")
def get_drives():
    drives = []
    if platform.system() == "Windows":
        import string
        from ctypes import windll
        bitmask = windll.kernel32.GetLogicalDrives()
        for letter in string.ascii_uppercase:
            if bitmask & 1:
                drives.append(f"{letter}:\\")
            bitmask >>= 1
    else:
        drives.append("/")
    return {"drives": drives}

@router.get("/browse")
def browse_directory(path: str):
    if not os.path.exists(path):
        return {"error": "Path does not exist"}
    if not os.path.isdir(path):
        return {"error": "Path is not a directory"}
    
    entries = []
    try:
        for entry in os.scandir(path):
            entries.append({
                "name": entry.name,
                "is_dir": entry.is_dir(),
                "path": entry.path
            })
    except PermissionError:
        return {"error": "Permission denied"}
    except Exception as e:
        return {"error": str(e)}
        
    # Sort: directories first, then alphabetically
    entries.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))
    return {"path": path, "entries": entries}
