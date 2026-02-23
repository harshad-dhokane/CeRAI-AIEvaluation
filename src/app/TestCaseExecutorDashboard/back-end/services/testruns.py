import os
import sys
resolved_path = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "..","..")
)

print("📍 __file__ =", __file__)
print("📍 resolved_path =", resolved_path)
print("📍 BEFORE sys.path[0] =", sys.path[0])

sys.path.insert(0, resolved_path)

print("📍 AFTER sys.path[0] =", sys.path[0])