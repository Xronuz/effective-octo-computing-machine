"""
Uychi tumani hokimligi "2026 й кўчалар" ro'yxatini (.xlsx, kirill) o'qish.

Fayl tuzilishi (ustunlar): № | Маҳалла номи | Кўча номи | Аҳоли сони | Хонадонлар сони
- Har MFY bloki birinchi qatorida № va Маҳалла номи to'ldirilgan, keyingi
  qatorlarda faqat Кўча номи.
- Blok "Маҳалла жами" qatori bilan yakunlanadi (jami sonlar, kocha yo'q).
- Birinchi qator "Туман жами" — tuman bo'yicha jami, o'tkazib yuboriladi.

Manbadagi № ustuni ba'zan xato/nomos ketgan (masalan oxirgi blokda qayta 1
dan boshlangan) — shuning uchun raqami blok tartibi bo'yicha qayta
hisoblanadi (1, 2, 3, ...), manbadagi xom qiymatga tayanilmaydi.
"""

import re

import openpyxl


def _tozala(matn: str) -> str:
    """Bo'sh joy va \\xa0/\\n larni bitta probelga siqib, chetlarini kesish."""
    return re.sub(r"\s+", " ", matn.replace("\xa0", " ")).strip()


def mfy_royxatini_oqish(fayl_yoli: str) -> list[dict]:
    """Har bir MFY uchun {raqami, nomi, kochalar: [...]} ro'yxatini qaytaradi."""
    wb = openpyxl.load_workbook(fayl_yoli, data_only=True)
    ws = wb.active

    royxat: list[dict] = []
    joriy: dict | None = None

    for row in ws.iter_rows(min_row=4, values_only=True):
        no, mahalla, kocha = row[0], row[1], row[2]

        if isinstance(no, str):
            # "Туман жами" — tuman bo'yicha jami qator
            continue
        if mahalla == "Маҳалла жами":
            # MFY jami qatori — blok yakuni
            continue

        if no is not None:
            if joriy:
                royxat.append(joriy)
            joriy = {"raqami": len(royxat) + 1, "nomi": _tozala(mahalla), "kochalar": []}

        if kocha is not None and joriy is not None:
            joriy["kochalar"].append(_tozala(kocha))

    if joriy:
        royxat.append(joriy)

    return royxat
