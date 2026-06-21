import os
import time

test_file = "TEST_INTEGRITY.txt"

print("1. Creating file...")
with open(test_file, "w") as f:
    f.write("Initial content\n")
time.sleep(2) # Wait for watchdog

print("2. Modifying file...")
with open(test_file, "a") as f:
    f.write("Appended content\n")
time.sleep(2) # Wait for watchdog

print("3. Deleting file...")
os.remove(test_file)
time.sleep(2) # Wait for watchdog

print("Done. Check logs/DB for events.")
