import math, json, datetime

AU = 149597870.7
RSUN = 695700.0

# Standish, "Keplerian Elements for Approximate Positions of the Major Planets"
# (JPL), valid 1800-2050 AD. a[AU], e, I, L, long.peri, long.node (deg) + rates/century
ELEM = {
 "Mercury": (0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593,
             0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081),
 "Venus":   (0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255,
             0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418),
 "Earth":   (1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0,
             0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0),
 "Mars":    (1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891,
             0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343),
 "Jupiter": (5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909,
             -0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106),
 "Saturn":  (9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448,
             -0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794),
 "Uranus":  (19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503,
             -0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589),
 "Neptune": (30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574,
             0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664),
}

# masses, kg
MASS = {
 "Mercury": 3.3011e23, "Venus": 4.8675e24, "Earth": 5.97237e24, "Mars": 6.4171e23,
 "Jupiter": 1.8982e27, "Saturn": 5.6834e26, "Uranus": 8.6810e25, "Neptune": 1.02413e26,
}
MSUN = 1.98892e30
MTOT = MSUN + sum(MASS.values())

def jd(y, m, d):
    if m <= 2:
        y -= 1; m += 12
    A = y // 100
    B = 2 - A + A // 4
    return math.floor(365.25*(y+4716)) + math.floor(30.6001*(m+1)) + d + B - 1524.5

def kepler_pos(name, T):
    a0,e0,I0,L0,p0,n0,da,de,dI,dL,dp,dn = ELEM[name]
    a = a0 + da*T; e = e0 + de*T; I = math.radians(I0 + dI*T)
    L = L0 + dL*T; p = p0 + dp*T; n = n0 + dn*T
    M = math.radians((L - p) % 360.0)
    E = M
    for _ in range(60):
        dE = (E - e*math.sin(E) - M) / (1 - e*math.cos(E))
        E -= dE
        if abs(dE) < 1e-13: break
    xo = a*(math.cos(E) - e)
    yo = a*math.sqrt(1-e*e)*math.sin(E)
    w = math.radians(p - n); O = math.radians(n)
    cw,sw = math.cos(w), math.sin(w); cO,sO = math.cos(O), math.sin(O)
    cI,sI = math.cos(I), math.sin(I)
    x = (cw*cO - sw*sO*cI)*xo + (-sw*cO - cw*sO*cI)*yo
    y = (cw*sO + sw*cO*cI)*xo + (-sw*sO + cw*cO*cI)*yo
    z = (sw*sI)*xo + (cw*sI)*yo
    return x*AU, y*AU, z*AU

def bary_offset(jdval):
    T = (jdval - 2451545.0)/36525.0
    sx=sy=sz=0.0
    parts = {}
    for p in ELEM:
        x,y,z = kepler_pos(p, T)
        w = MASS[p]/MTOT
        parts[p] = (x,y,z)
        sx += w*x; sy += w*y; sz += w*z
    return sx, sy, sz, parts

if __name__ == "__main__":
    print("M_total/M_sun =", MTOT/MSUN)
    print("J2000:", [round(v) for v in bary_offset(2451545.0)[:3]],
          "|R| =", round(math.dist((0,0,0), bary_offset(2451545.0)[:3])))
    d = jd(2026,10,18)
    v = bary_offset(d)[:3]
    print("2026-10-18 model:", [round(x) for x in v], "|R| =", round(math.dist((0,0,0), v)))
