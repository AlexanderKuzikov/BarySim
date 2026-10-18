import math, re
from bary import bary_offset, RSUN

def datestr(j):
    z = int(j + 0.5); f = j + 0.5 - z
    alpha = int((z - 1867216.25)/36524.25); A = z + 1 + alpha - alpha//4
    B = A + 1524; C = int((B - 122.1)/365.25); D = int(365.25*C); E = int((B - D)/30.6001)
    day = B - D - int(30.6001*E) + f
    month = E - 1 if E < 14 else E - 13
    year = C - 4716 if month > 2 else C - 4715
    return f"{year:04d}-{month:02d}-{int(day):02d}"

lines = open("horizons.txt").read().splitlines()
i0 = lines.index("$$SOE") + 1
i1 = lines.index("$$EOE")
recs = []
for ln in lines[i0:i1]:
    parts = [p.strip() for p in ln.split(",")]
    if len(parts) < 8: continue
    jd = float(parts[0])
    X, Y, Z = float(parts[2]), float(parts[3]), float(parts[4])
    recs.append((jd, X, Y, Z))
print("точек Horizons:", len(recs))

errs = []
mismatch = 0
for jd, X, Y, Z in recs:
    x, y, z, _ = bary_offset(jd)
    dx, dy, dz = x-X, y-Y, z-Z
    errs.append(math.sqrt(dx*dx+dy*dy+dz*dz))
    if math.hypot(X,Y,Z) < 1: pass

errs.sort()
n = len(errs)
print(f"ошибка модели |ΔR|, км: медиана {errs[n//2]:,.0f}, 95-й перцентиль {errs[int(n*0.95)]:,.0f}, макс {errs[-1]:,.0f}")
print(f"относительная: медиана {100*errs[n//2]/800000:.3f}%")

# сравнение статистик по одним и тем же датам
mx_h = max(recs, key=lambda r: math.hypot(r[1],r[2],r[3]))
mn_h = min(recs, key=lambda r: math.hypot(r[1],r[2],r[3]))
print()
print("HORIZONS (шаг 30 сут, 1800-2200):")
print(f"  макс |R| = {math.hypot(mx_h[1],mx_h[2],mx_h[3]):,.0f} км ({datestr(mx_h[0])}) = {math.hypot(mx_h[1],mx_h[2],mx_h[3])/RSUN:.3f} R☉")
print(f"  мин  |R| = {math.hypot(mn_h[1],mn_h[2],mn_h[3]):,.0f} км ({datestr(mn_h[0])}) = {math.hypot(mn_h[1],mn_h[2],mn_h[3])/RSUN:.3f} R☉")
mean = sum(math.hypot(r[1],r[2],r[3]) for r in recs)/n
outside = sum(1 for r in recs if math.hypot(r[1],r[2],r[3]) > RSUN)
print(f"  среднее  = {mean:,.0f} км = {mean/RSUN:.3f} R☉")
print(f"  вне фотосферы: {100*outside/n:.1f}%")

# модель на тех же датах
mm = [(math.hypot(*bary_offset(r[0])[:3]), r[0]) for r in recs]
mx_m = max(mm); mn_m = min(mm)
print()
print("МОДЕЛЬ (те же даты):")
print(f"  макс |R| = {mx_m[0]:,.0f} км ({datestr(mx_m[1])})")
print(f"  мин  |R| = {mn_m[0]:,.0f} км ({datestr(mn_m[1])})")
print(f"  среднее  = {sum(v for v,_ in mm)/n:,.0f} км")

# контрольная точка
for target in ["2026-10-18","1804-04-06","2130-03-06"]:
    for jd,X,Y,Z in recs:
        if datestr(jd) == target:
            x,y,z,_ = bary_offset(jd)
            print(f"\n{target}: Horizons ({X:,.0f}, {Y:,.0f}, {Z:,.0f}) |R|={math.hypot(X,Y,Z):,.0f}")
            print(f"{' '*len(target)}  модель   ({x:,.0f}, {y:,.0f}, {z:,.0f}) |R|={math.hypot(x,y,z):,.0f}")
