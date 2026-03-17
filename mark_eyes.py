import cv2
import json
import os

scale = 0.25  # display scale, between 0 and 1


ASSET_TYPES = {
    "eyes": {
        "points": ["leftEye", "rightEye"]
    },
    "mouth": {
        "points": ["leftMouth", "rightMouth"]
    },
    "hat": {
        "points": ["hatLeft", "hatRight", "hatCenter"]
    }
}


def ask_inputs():
    image_path = input("Image file (e.g. glasses.png): ").strip()
    asset_type = input("Asset type (eyes / mouth / hat): ").strip().lower()

    if not os.path.isfile(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")

    if asset_type not in ASSET_TYPES:
        raise ValueError(f"Invalid asset type: {asset_type}")

    return image_path, asset_type


image_path, asset_type = ask_inputs()
point_names = ASSET_TYPES[asset_type]["points"]

points = []
img_original = None
img_display = None


def save_json():
    h, w = img_original.shape[:2]

    anchors = {}
    for name, (px, py) in zip(point_names, points):
        anchors[name] = [px / w, py / h]

    data = {
        "type": asset_type,
        "image": os.path.basename(image_path),
        "anchors": anchors
    }

    json_path = os.path.splitext(image_path)[0] + ".json"

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)

    print(f"\nSaved to {json_path}")
    print(json.dumps(data, indent=4))


def click_event(event, x, y, flags, param):
    global points, img_display

    if event != cv2.EVENT_LBUTTONDOWN:
        return

    if len(points) >= len(point_names):
        return

    orig_x = int(x / scale)
    orig_y = int(y / scale)

    points.append((orig_x, orig_y))

    label = point_names[len(points) - 1]
    print(f"{label}: ({orig_x}, {orig_y})")

    cv2.circle(img_display, (x, y), 5, (0, 0, 255), -1)
    cv2.putText(
        img_display,
        label,
        (x + 8, y - 8),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.5,
        (0, 255, 0),
        1,
        cv2.LINE_AA
    )
    cv2.imshow("asset marker", img_display)

    if len(points) == len(point_names):
        save_json()
        print("\nDone. Press any key to close.")


img_original = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
if img_original is None:
    raise ValueError(f"Could not read image: {image_path}")

img_display = cv2.resize(
    img_original,
    None,
    fx=scale,
    fy=scale,
    interpolation=cv2.INTER_AREA
)

print(f"\nAsset type: {asset_type}")
print("Click these points in order:")
for i, name in enumerate(point_names, start=1):
    print(f"  {i}. {name}")

cv2.imshow("asset marker", img_display)
cv2.setMouseCallback("asset marker", click_event)
cv2.waitKey(0)
cv2.destroyAllWindows()