import json

tpl = open("template.html", encoding="utf-8", newline="\n").read()
hz = open("hz.json", encoding="utf-8", newline="\n").read()
out = tpl.replace("{{DATA}}", hz)
open("barycenter.html", "w", encoding="utf-8", newline="\n").write(out)
print("barycenter.html:", round(len(out.encode())/1e6, 2), "МБ")
