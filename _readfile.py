import sys

filepath = r"d:\DevCenter\abuilds\EduGen\old_system\schoolpilot3\src\components\ui\PageHeaderWithTabs.tsx"
lines = open(filepath, "r", encoding="utf-8").readlines()
print(f"Total lines: {len(lines)}")
for i in range(123, len(lines)):
    sys.stdout.write(f"{i+1}: {lines[i]}")
