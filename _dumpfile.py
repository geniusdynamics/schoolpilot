import sys

filepath = r"d:\DevCenter\abuilds\EduGen\old_system\schoolpilot3\src\components\ui\PageHeaderWithTabs.tsx"
lines = open(filepath, "r", encoding="utf-8").readlines()
outpath = r"d:\DevCenter\abuilds\EduGen\old_system\schoolpilot3\_fileoutput.txt"
with open(outpath, "w", encoding="utf-8") as f:
    for i, line in enumerate(lines):
        f.write(f"{i+1}: {line}")
print(f"Written {len(lines)} lines to {outpath}")
