import math, json

SRC = "horizons_bary.txt"

lines = open(SRC, encoding="utf-8").read().splitlines()
i0 = lines.index("$$SOE") + 1
i1 = lines.index("$$EOE")
jd, xs, ys, zs = [], [], [], []
for ln in lines[i0:i1]:
    p = [s.strip() for s in ln.split(",")]
    if len(p) < 8:
        continue
    jd.append(float(p[0])); xs.append(round(float(p[2]))); ys.append(round(float(p[3]))); zs.append(round(float(p[4])))

n = len(jd)
t0 = jd[0]; step = jd[1] - jd[0]
print("точек:", n, "t0 JD:", t0, "шаг:", step)

flat = []
for i in range(n):
    flat += [xs[i], ys[i], zs[i]]

R = [math.sqrt(xs[i]**2 + ys[i]**2 + zs[i]**2) for i in range(n)]
imax = max(range(n), key=lambda i: R[i])
imin = min(range(n), key=lambda i: R[i])


def datestr(j):
    """Юлианский календарь до 1582-10-15, григорианский после — как в Horizons."""
    z = int(j + 0.5)
    A = z
    if z >= 2299161:
        alpha = int((z - 1867216.25) / 36524.25)
        A = z + 1 + alpha - alpha // 4
    B = A + 1524
    C = int((B - 122.1) / 365.25)
    D = int(365.25 * C)
    E = int((B - D) / 30.6001)
    day = B - D - int(30.6001 * E)
    month = E - 1 if E < 14 else E - 13
    year = C - 4716 if month > 2 else C - 4715
    return f"{year:04d}-{month:02d}-{day:02d}"


RS = 695700.0
y0 = int(datestr(jd[0])[:4]); y1 = int(datestr(jd[-1])[:4])
print(f"диапазон: {datestr(jd[0])} — {datestr(jd[-1])}")
print(f"макс |R| = {R[imax]:,.0f} км  {datestr(jd[imax])}  = {R[imax]/RS:.3f} R☉")
print(f"мин  |R| = {R[imin]:,.0f} км  {datestr(jd[imin])}  = {R[imin]/RS:.3f} R☉")
print(f"среднее = {sum(R)/n:,.0f} км, вне фотосферы {100*sum(1 for v in R if v > RS)/n:.1f}%")

for a in range(y0, y1 + 1, 500):
    b = a + 500
    seg = [R[i] for i in range(n) if a <= int(datestr(jd[i])[:4]) < b]
    if seg:
        print(f"  {a}–{b}: макс {max(seg)/1000:7.0f} тыс. км, мин {min(seg)/1000:6.0f} тыс. км, "
              f"среднее {sum(seg)/len(seg)/1000:6.0f} тыс. км")

json.dump({"t0": t0, "step": step, "n": n, "d": flat}, open("hz.json", "w"), separators=(",", ":"))
print("hz.json:", round(len(json.dumps({'d': flat}, separators=(',', ':'))) / 1e6, 2), "МБ")
