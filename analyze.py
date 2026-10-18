import math, json, datetime
from bary import (ELEM, MASS, MSUN, MTOT, AU, RSUN, jd, bary_offset, kepler_pos)

def datestr(j):
    # j is JD; convert to calendar (proleptic Gregorian)
    z = int(j + 0.5); f = j + 0.5 - z
    if z < 2299161: A = z
    else:
        alpha = int((z - 1867216.25)/36524.25); A = z + 1 + alpha - alpha//4
    B = A + 1524; C = int((B - 122.1)/365.25); D = int(365.25*C); E = int((B - D)/30.6001)
    day = B - D - int(30.6001*E) + f
    month = E - 1 if E < 14 else E - 13
    year = C - 4716 if month > 2 else C - 4715
    return f"{year:04d}-{month:02d}-{int(day):02d}"

# ---- 1. per-planet contribution at mean distance ----
print("="*78)
print("ВКЛАД ПЛАНЕТ В СМЕЩЕНИЕ БАРИЦЕНТРА ОТ ЦЕНТРА СОЛНЦА (по средней дистанции)")
print("="*78)
rows=[]
for p in ELEM:
    a = ELEM[p][0]; e = ELEM[p][1]
    m = MASS[p]
    c = m/MTOT * a * AU
    cmax = m/MTOT * a*(1+e) * AU
    cmin = m/MTOT * a*(1-e) * AU
    rows.append((p, a, m, m/MSUN, c, cmin, cmax))
rows.sort(key=lambda r: -r[4])
jup = rows[0][4]
print(f"{'планета':10s} {'a, а.е.':>8s} {'m, кг':>11s} {'m/M☉':>10s} {'вклад, км':>11s} {'доля от Юпитера':>16s} {'доля суммы':>11s}")
tot = sum(r[4] for r in rows)
for r in rows:
    print(f"{r[0]:10s} {r[1]:8.3f} {r[2]:11.3e} {r[3]:10.3e} {r[4]:11.1f} {100*r[4]/jup:15.3f}% {100*r[4]/tot:10.2f}%")
print(f"{'СУММА':10s} {'':8s} {'':11s} {'':10s} {tot:11.0f}")
print()

# ---- 2. statistics 1800-2200 ----
print("="*78)
print("СТАТИСТИКА 1800-2200 (шаг 1 сутки)")
print("="*78)
start = jd(1800,1,1); stop = jd(2200,1,1)
series=[]; d=start
mx=(-1,None); mn=(1e12,None); s=0.0; s2=0.0; n=0; outside=0
while d < stop:
    x,y,z,_ = bary_offset(d)
    R = math.sqrt(x*x+y*y+z*z)
    series.append((d,R))
    if R>mx[0]: mx=(R,d)
    if R<mn[0]: mn=(R,d)
    s+=R; s2+=R*R; n+=1
    if R>RSUN: outside+=1
    d+=1
mean=s/n; rms=math.sqrt(s2/n)
print(f"точек: {n}")
print(f"макс |R| = {mx[0]:,.0f} км  ({datestr(mx[1])})  = {mx[0]/RSUN:.3f} R☉")
print(f"мин  |R| = {mn[0]:,.0f} км  ({datestr(mn[1])})  = {mn[0]/RSUN:.3f} R☉")
print(f"среднее  = {mean:,.0f} км   = {mean/RSUN:.3f} R☉")
print(f"RMS      = {rms:,.0f} км   = {rms/RSUN:.3f} R☉")
print(f"доля времени вне фотосферы (R > 695 700 км): {100*outside/n:.1f}%")

# theoretical max if all aligned
th = sum(MASS[p]/MTOT*ELEM[p][0]*(1+ELEM[p][1])*AU for p in ELEM)
print(f"теоретический максимум при полном выстраивании: {th:,.0f} км = {th/RSUN:.2f} R☉")

# ---- 3. extremes per planet instantaneous ----
print()
print("="*78)
print("МГНОВЕННЫЙ ВКЛАД (с учётом текущего углового положения), 2026-10-18")
print("="*78)
d0 = jd(2026,10,18)
x,y,z,parts = bary_offset(d0)
print(f"{'планета':10s} {'|r|, млн км':>12s} {'вклад, км':>11s} {'доля от Юпитера':>16s}")
contrib=[]
for p,(px,py,pz) in parts.items():
    c = MASS[p]/MTOT*math.sqrt(px*px+py*py+pz*pz)
    contrib.append((p, math.sqrt(px*px+py*py+pz*pz)/1e6, c))
contrib.sort(key=lambda r:-r[2])
j0=contrib[0][2]
for p,r,c in contrib:
    print(f"{p:10s} {r:12.2f} {c:11.1f} {100*c/j0:15.3f}%")
print(f"векторная сумма: ({x:,.0f}, {y:,.0f}, {z:,.0f}) км, |R| = {math.sqrt(x*x+y*y+z*z):,.0f} км")

# ---- 4. speed of Sun around barycenter ----
print()
print("="*78)
print("СКОРОСТЬ СОЛНЦА ВОКРУГ БАРИЦЕНТРА")
print("="*78)
h=0.5
a1=bary_offset(d0-h)[:3]; a2=bary_offset(d0+h)[:3]
v=[(a2[i]-a1[i])/(2*h*86400) for i in range(3)]
print(f"|v| = {math.sqrt(sum(t*t for t in v))*1000:.2f} м/с  (модель)")
print(f"компоненты: {[round(t*1000,2) for t in v]} м/с")

# ---- 5. export series for chart ----
step = 10
out=[]
d=start
while d<stop:
    x,y,z,_=bary_offset(d)
    out.append([datestr(d), round(math.sqrt(x*x+y*y+z*z)/1000,1)])
    d+=step
json.dump(out, open("series.json","w"))
print("series.json:", len(out), "точек")
