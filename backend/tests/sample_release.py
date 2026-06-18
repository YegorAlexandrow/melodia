"""Урезанный, но представительный ответ Discogs /releases/{id} для тестов
маппинга (по мотивам «По волне моей памяти», Давид Тухманов, 1976)."""

SAMPLE_RELEASE = {
    "id": 1234567,
    "title": "По Волне Моей Памяти",
    "master_id": 98765,
    "year": 1976,
    "released": "1976",
    "country": "USSR",
    "uri": "https://www.discogs.com/release/1234567",
    "notes": "Апрелевский завод.",
    "artists": [{"name": "Давид Тухманов", "id": 111, "join": "", "anv": "", "role": ""}],
    "labels": [{"name": "Мелодия", "catno": "С60—07271-2", "id": 1}],
    "formats": [{"name": "Vinyl", "qty": "1", "descriptions": ["LP", "Album", "Stereo"]}],
    "genres": ["Rock", "Pop"],
    "styles": ["Prog Rock"],
    "tracklist": [
        {"position": "A1", "type_": "track", "title": "Я Мысленно Вхожу В Ваш Кабинет", "duration": "3:58"},
        {"position": "A2", "type_": "track", "title": "Из Вагантов", "duration": "4:42"},
        {"position": "B1", "type_": "track", "title": "Сердце, Моё Сердце", "duration": "3:30"},
    ],
    "identifiers": [
        {"type": "Matrix / Runout", "value": "С60 07271 А-2 / 4-1-2", "description": "Side A"},
        {"type": "Rights Society", "value": "ГОСТ 5289-73"},
    ],
    "images": [
        {"type": "primary", "uri": "https://img.discogs.com/cover.jpg", "width": 600, "height": 600},
    ],
    "videos": [{"uri": "https://youtu.be/abc", "title": "full album", "duration": 2400}],
}
