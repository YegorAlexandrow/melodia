from app.services.catalog_number import catalog_prefix, normalize_catalog_number


def test_normalize_unifies_separators():
    # разные тире/пробелы дают один ключ
    assert normalize_catalog_number("С60—07271-2") == normalize_catalog_number("С60 07271 2")
    assert normalize_catalog_number("С60—07271-2") == "С60072712"


def test_normalize_latin_lookalike_to_cyrillic():
    # латинская C приводится к кириллической С
    assert normalize_catalog_number("C60 07271 2") == normalize_catalog_number("С60—07271-2")


def test_normalize_empty():
    assert normalize_catalog_number(None) == ""
    assert normalize_catalog_number("") == ""


def test_prefix():
    assert catalog_prefix("С60—07271-2") == "С60"
    assert catalog_prefix("Д—025417-8") == "Д"
    assert catalog_prefix("СМ—02845-6") == "СМ"
    assert catalog_prefix("12345") is None
