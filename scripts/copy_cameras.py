import os
import shutil
import glob

brain = r"C:\Users\hp\.gemini\antigravity\brain\20354b30-d18b-42fb-a92c-544cf89129f8"
base_dest = r"c:\Projects\AI_CC\apps\frontend\public\cameras"

os.makedirs(os.path.join(base_dest, "store1"), exist_ok=True)
os.makedirs(os.path.join(base_dest, "store2"), exist_ok=True)
os.makedirs(os.path.join(base_dest, "store3"), exist_ok=True)

def find_file(pattern):
    matches = glob.glob(os.path.join(brain, pattern))
    if not matches:
        raise FileNotFoundError(f"No match for {pattern}")
    return matches[0]

# Clean versions
clean_cereal = find_file("store1_cam1_clean_*.jpg")
clean_dairy = find_file("store1_cam2_clean_*.jpg")
cam3 = find_file("cam3_beverage_snacks_*.jpg")
cam4 = find_file("cam4_cosmetics_lockup_*.jpg")
cam5 = find_file("cam5_checkout_register_*.jpg")
cam6 = find_file("cam6_main_entrance_*.jpg")

grab_go = find_file("store2_cam1_grab_go_*.jpg")
coffee = find_file("store2_cam2_coffee_*.jpg")
selfcheckout = find_file("store2_cam5_selfcheckout_*.jpg")
urban_entrance = find_file("store2_cam6_urban_entrance_*.jpg")

apparel = find_file("store3_cam1_apparel_*.jpg")

# Store 1 (Downtown Flagship - Supermarket)
shutil.copy(clean_cereal, os.path.join(base_dest, "store1", "cam1.jpg"))
shutil.copy(clean_dairy, os.path.join(base_dest, "store1", "cam2.jpg"))
shutil.copy(cam3, os.path.join(base_dest, "store1", "cam3.jpg"))
shutil.copy(cam4, os.path.join(base_dest, "store1", "cam4.jpg"))
shutil.copy(cam5, os.path.join(base_dest, "store1", "cam5.jpg"))
shutil.copy(cam6, os.path.join(base_dest, "store1", "cam6.jpg"))

# Fallbacks at root
shutil.copy(clean_cereal, os.path.join(base_dest, "cam1.jpg"))
shutil.copy(clean_dairy, os.path.join(base_dest, "cam2.jpg"))

# Store 2 (Metro Center - Urban Convenience Express)
shutil.copy(grab_go, os.path.join(base_dest, "store2", "cam1.jpg"))
shutil.copy(coffee, os.path.join(base_dest, "store2", "cam2.jpg"))
shutil.copy(cam3, os.path.join(base_dest, "store2", "cam3.jpg"))
shutil.copy(clean_dairy, os.path.join(base_dest, "store2", "cam4.jpg"))
shutil.copy(selfcheckout, os.path.join(base_dest, "store2", "cam5.jpg"))
shutil.copy(urban_entrance, os.path.join(base_dest, "store2", "cam6.jpg"))

# Store 3 (Westside Mall - Retail Department Store)
shutil.copy(apparel, os.path.join(base_dest, "store3", "cam1.jpg"))
shutil.copy(cam4, os.path.join(base_dest, "store3", "cam2.jpg"))
shutil.copy(clean_cereal, os.path.join(base_dest, "store3", "cam3.jpg"))
shutil.copy(grab_go, os.path.join(base_dest, "store3", "cam4.jpg"))
shutil.copy(selfcheckout, os.path.join(base_dest, "store3", "cam5.jpg"))
shutil.copy(cam6, os.path.join(base_dest, "store3", "cam6.jpg"))

print("SUCCESS: All multi-store camera photos copied successfully!")
for root, dirs, files in os.walk(base_dest):
    for f in files:
        rel = os.path.relpath(os.path.join(root, f), base_dest)
        sz = os.path.getsize(os.path.join(root, f))
        print(f"  {rel}: {sz} bytes")
