import json

tpl = open("template_cinematic.html", encoding="utf-8", newline="\n").read()
hz = open("hz.json", encoding="utf-8", newline="\n").read()
out = tpl.replace("{{DATA}}", hz)
open("cinematic.html", "w", encoding="utf-8", newline="\n").write(out)
print("cinematic.html:", round(len(out.encode()) / 1e6, 2), "МБ")
