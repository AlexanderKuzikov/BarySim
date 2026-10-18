"""Скачать векторы барицентра Солнечной системы относительно центра Солнца.

Источник: JPL Horizons, эфемериды DE441. Цель — барицентр (0), центр — Солнце
(500@10). Даты заданы в юлианских днях: 1721423.5 = 1 января 1 года,
3182395.5 = 1 января 4001 года. Шаг 40 суток, около 36 500 точек.
"""
import urllib.request

URL = ("https://ssd.jpl.nasa.gov/api/horizons.api?format=text"
       "&COMMAND='0'&CENTER='500@10'&EPHEM_TYPE=VECTORS"
       "&START_TIME='JD1721423.5'&STOP_TIME='JD3182395.5'&STEP_SIZE='40%20d'"
       "&VEC_TABLE=2&OUT_UNITS='KM-S'&REF_PLANE='ECLIPTIC'&CSV_FORMAT='YES'")

if __name__ == "__main__":
    with urllib.request.urlopen(URL, timeout=300) as r:
        data = r.read()
    open("horizons_bary.txt", "wb").write(data)
    print("horizons_bary.txt:", round(len(data) / 1e6, 2), "МБ")
