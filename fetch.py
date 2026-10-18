"""Скачать векторы барицентра Солнечной системы относительно центра Солнца.

Источник: JPL Horizons, эфемериды DE441. Цель — барицентр (0), центр — Солнце
(500@10). Даты заданы в юлианских днях: -1930632.5 = 21 марта 9999 г. до н. э.
(раньше барицентр в DE441 не определён), 5373444.5 = конец 9999 г. н. э.
Шаг 120 суток, около 60 900 точек.
"""
import urllib.request

URL = ("https://ssd.jpl.nasa.gov/api/horizons.api?format=text"
       "&COMMAND='0'&CENTER='500@10'&EPHEM_TYPE=VECTORS"
       "&START_TIME='JD-1930632.5'&STOP_TIME='JD5373444.5'&STEP_SIZE='120%20d'"
       "&VEC_TABLE=2&OUT_UNITS='KM-S'&REF_PLANE='ECLIPTIC'&CSV_FORMAT='YES'")

if __name__ == "__main__":
    with urllib.request.urlopen(URL, timeout=300) as r:
        data = r.read()
    open("horizons_bary.txt", "wb").write(data)
    print("horizons_bary.txt:", round(len(data) / 1e6, 2), "МБ")
