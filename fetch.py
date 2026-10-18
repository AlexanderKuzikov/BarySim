"""Скачать векторы барицентра Солнечной системы относительно центра Солнца.

Источник: JPL Horizons, эфемериды DE441. Цель — барицентр (0), центр — Солнце
(500@10). Результат: h1500.txt, шаг 10 суток, 1500-2500.
"""
import urllib.request

URL = ("https://ssd.jpl.nasa.gov/api/horizons.api?format=text"
       "&COMMAND='0'&CENTER='500@10'&EPHEM_TYPE=VECTORS"
       "&START_TIME='1500-01-01'&STOP_TIME='2500-01-01'&STEP_SIZE='10%20d'"
       "&VEC_TABLE=2&OUT_UNITS='KM-S'&REF_PLANE='ECLIPTIC'&CSV_FORMAT='YES'")

if __name__ == "__main__":
    with urllib.request.urlopen(URL, timeout=300) as r:
        data = r.read()
    open("h1500.txt", "wb").write(data)
    print("h1500.txt:", round(len(data) / 1e6, 2), "МБ")
